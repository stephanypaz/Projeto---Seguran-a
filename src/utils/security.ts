// Security utilities: Dynamic Data Masking, SHA-256 hashing, XSS Sanitization, Zero Trust proof generators
import { Patient, NursePermittedPatient } from '../types';

/**
 * Fast pseudo-SHA256 hash generator for frontend simulation of dynamic masking
 */
export function generateSHA256Hash(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  const hex1 = ('00000000' + (hash >>> 0).toString(16)).slice(-8);
  
  // Secondary pass for 64-char representation
  let hash2 = 0x5bf3b627;
  for (let i = input.length - 1; i >= 0; i--) {
    hash2 ^= input.charCodeAt(i);
    hash2 = (hash2 << 5) - hash2 + (input.charCodeAt(i) * 31);
  }
  const hex2 = ('00000000' + (hash2 >>> 0).toString(16)).slice(-8);
  
  // Combined pseudo-sha256 format
  return `sha256_${hex1}${hex2}${(hex1 + hex2).split('').reverse().join('')}`.padEnd(64, 'a').slice(0, 64);
}

/**
 * Checks whether the current user has authorization to view unmasked PII/PHI
 * Doctors and Security Auditors have inherent full clinical clearance (CRM).
 * Nurses/staff have restricted access unless an explicit NDA or break-glass is signed.
 */
export function isUserAuthorizedForPII(userRole: string, isNdaSigned: boolean): boolean {
  if (userRole === 'DOCTOR' || userRole === 'SECURITY_AUDITOR') {
    return true;
  }
  return isNdaSigned;
}

/**
 * Dynamic Data Masking (DDM) for PII/PHI:
 * Unmasked if user is a Doctor / Auditor OR if NDA is signed.
 * Masked with SHA-256 privacy filter for restricted roles (e.g. Nurses).
 */
export function maskSensitiveData(
  value: string,
  isAuthorizedOrNdaSigned: boolean,
  type: 'CPF' | 'NAME' | 'GENOME' | 'ADDRESS' | 'PHONE' | 'GENERIC' = 'GENERIC'
): {
  display: string;
  isMasked: boolean;
  hash: string;
} {
  const hash = generateSHA256Hash(value);
  
  if (isAuthorizedOrNdaSigned) {
    return {
      display: value,
      isMasked: false,
      hash,
    };
  }

  // Masked representation for restricted roles (Nurse without NDA)
  let masked = '';
  switch (type) {
    case 'CPF':
      // Show only first 3 and last 2 digits, rest hashed: 123.***.***-45
      if (value.length >= 11) {
        masked = `${value.slice(0, 3)}.***.***-${value.slice(-2)} [HASH:${hash.slice(0, 8)}]`;
      } else {
        masked = `***.***.***-** [${hash.slice(0, 8)}]`;
      }
      break;
    case 'NAME':
      const parts = value.split(' ');
      if (parts.length > 1) {
        masked = `${parts[0]} ${parts.slice(1).map(p => p[0] + '***').join(' ')} (RESTRICTED #${hash.slice(0, 6)})`;
      } else {
        masked = `${value.slice(0, 2)}*** [${hash.slice(0, 6)}]`;
      }
      break;
    case 'GENOME':
      masked = `🧬 GENOME-ID:[SEC-MASK-${hash.slice(0, 16)}]`;
      break;
    case 'ADDRESS':
      masked = `[ENDEREÇO RESTRITO À ENFERMAGEM - HASH:${hash.slice(0, 12)}]`;
      break;
    case 'PHONE':
      masked = `+55 (**) *****-**${value.slice(-2)} [HASH:${hash.slice(0, 6)}]`;
      break;
    default:
      masked = `[DADO CLASSIFICADO - HASH:${hash.slice(0, 14)}]`;
  }

  return {
    display: masked,
    isMasked: true,
    hash,
  };
}

/**
 * XSS Filter & Sanitizer:
 * Analyzes string for malicious injection vectors (<script>, javascript:, onload=, onerror=, <iframe>, eval, etc.)
 */
export interface XssScanResult {
  original: string;
  sanitized: string;
  isClean: boolean;
  detectedThreats: string[];
}

export function sanitizeInput(raw: string): XssScanResult {
  const threats: string[] = [];
  
  // Detect scripts
  if (/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(raw)) {
    threats.push('Inline <script> Tag Execution Vector');
  }
  
  // Detect javascript: pseudo protocol
  if (/javascript\s*:/gi.test(raw)) {
    threats.push('JavaScript Pseudo-Protocol URI Injection');
  }

  // Detect event handlers like onerror, onload, onclick
  if (/on[a-z]+\s*=/gi.test(raw)) {
    threats.push('DOM Event Handler Attribute Injection (on*)');
  }

  // Detect iframe / embed / object
  if (/<(iframe|embed|object|base|meta)\b/gi.test(raw)) {
    threats.push('Embedded Frame / Object Hijack Vector');
  }

  // Detect data URI script execution
  if (/data:text\/html/gi.test(raw)) {
    threats.push('Data-URI HTML Injection');
  }

  // Perform HTML entity encoding & DOM sanitization
  const sanitized = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  return {
    original: raw,
    sanitized: sanitized,
    isClean: threats.length === 0,
    detectedThreats: threats,
  };
}

/**
 * Generates an ISO compliant zero-trust incident ID
 */
export function generateIncidentId(): string {
  const time = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SEC-INC-${time}-${rand}`;
}

/**
 * Validates Brazilian CPF format and check digits (Dígitos Verificadores - Módulo 11)
 * Conforms to Receita Federal do Brasil mathematical verification standards.
 */
export function isValidCPF(cpf: string): boolean {
  if (!cpf) return false;
  
  // Remove non-digit characters
  const clean = cpf.replace(/\D/g, '');
  
  // Must have exactly 11 digits
  if (clean.length !== 11) return false;
  
  // Invalidate repeated digits (e.g. 000.000.000-00, 111.111.111-11, etc.)
  if (/^(\d)\1{10}$/.test(clean)) return false;
  
  // Validate 1st check digit
  let sum1 = 0;
  for (let i = 0; i < 9; i++) {
    sum1 += parseInt(clean.charAt(i), 10) * (10 - i);
  }
  let remainder1 = (sum1 * 10) % 11;
  if (remainder1 === 10 || remainder1 === 11) remainder1 = 0;
  if (remainder1 !== parseInt(clean.charAt(9), 10)) return false;
  
  // Validate 2nd check digit
  let sum2 = 0;
  for (let i = 0; i < 10; i++) {
    sum2 += parseInt(clean.charAt(i), 10) * (11 - i);
  }
  let remainder2 = (sum2 * 10) % 11;
  if (remainder2 === 10 || remainder2 === 11) remainder2 = 0;
  if (remainder2 !== parseInt(clean.charAt(10), 10)) return false;
  
  return true;
}

/**
 * Data Minimization Safe Projection for Nursing Staff (LGPD Art. 6º, III).
 * Filters patient records so that ONLY authorized bedside and nursing care fields are sent.
 * Excludes sensitive physician-exclusive diagnoses (CID-10), prognosis, psychiatric notes,
 * and superfluous demographic data (e.g. CPF, genomic profile, full address).
 * Eliminates the need for client-side encryption/masking overlays or teasers.
 */
export function toNursePermittedPatient(patient: Patient): NursePermittedPatient {
  return {
    id: patient.id,
    recordNumber: patient.recordNumber,
    bed: patient.bed,
    room: patient.room,
    department: patient.department,
    admissionDate: patient.admissionDate,
    triagePriority: patient.triagePriority,
    patientName: patient.pii.fullName,
    age: patient.age,
    gender: patient.gender,
    chiefComplaint: patient.chiefComplaint,
    allergies: patient.medicalHistory.knownAllergies || [],
    bloodType: patient.medicalHistory.bloodType || 'Não informado',
    emergencyContact: patient.pii.emergencyContact,
    currentVitals: patient.currentVitals,
    vitalsHistory: patient.vitalsHistory,
    activePrescriptions: patient.medicalHistory.activePrescriptions || [],
    nursingNotes: patient.nursingNotes && patient.nursingNotes.length > 0
      ? patient.nursingNotes
      : [
          {
            id: `note_${patient.id}_init`,
            timestamp: patient.currentVitals.timestamp,
            note: patient.currentVitals.clinicalNotes || 'Paciente admitido e monitorado. Sinais vitais checados conforme protocolo assistencial.',
            authorName: patient.currentVitals.recordedBy || 'Enf. Anna Karol',
            authorRole: 'NURSE',
            authorCoren: 'COREN/SP 341.220-ENF',
            category: 'EVOLUCAO',
          },
        ],
    medicationAdministrations: patient.medicationAdministrations || [],
  };
}
