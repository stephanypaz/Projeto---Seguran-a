export type UserRole = 'DOCTOR' | 'NURSE' | 'SECURITY_AUDITOR';

export type ClearanceLevel = 'LEVEL_4_FULL_CLINICAL' | 'LEVEL_2_VITALS_ONLY' | 'LEVEL_AUDIT_COMPLIANCE';

export interface User {
  id: string;
  name: string;
  codename: string;
  password?: string;
  cpf?: string;
  phone?: string;
  role: UserRole;
  roleTitle: string;
  registrationNumber: string; // CRM or COREN or CERT
  department: string;
  clearanceLevel: ClearanceLevel;
  avatarUrl?: string;
  sessionToken: string;
  loginTime: string;
}

export type TriagePriority = 'EMERGENCY' | 'VERY_URGENT' | 'URGENT' | 'STANDARD'; // Manchester System (Vermelho, Laranja, Amarelo, Verde)

export interface VitalsMeasurement {
  id: string;
  timestamp: string;
  heartRate: number; // bpm
  systolicBP: number; // mmHg
  diastolicBP: number; // mmHg
  spo2: number; // %
  temperature: number; // °C
  respiratoryRate: number; // rpm
  bloodGlucose: number; // mg/dL
  glasgowScale: number; // 3-15
  recordedBy: string;
  recordedByRole: UserRole;
  clinicalNotes?: string;
}

export interface LabResult {
  id: string;
  testName: string;
  value: string;
  referenceRange: string;
  status: 'NORMAL' | 'ELEVATED' | 'CRITICAL' | 'PENDING';
  date: string;
  laboratoryTech: string;
}

export interface Prescription {
  id: string;
  medication: string;
  dosage: string;
  route: string; // Oral, IV, IM, SC
  frequency: string;
  prescribedBy: string;
  prescribedDate: string;
  status: 'ACTIVE' | 'DISCONTINUED' | 'COMPLETED';
}

export interface ClinicalDiagnosis {
  primaryCID: string;
  cidDescription: string;
  secondaryCIDs?: string[];
  diagnosisSummary: string;
  treatmentPlan: string;
  prognosis: string;
  physicianNotes: string;
  admittingPhysician: string;
  lastUpdated: string;
  labResults: LabResult[];
}

export interface MedicalHistory {
  knownAllergies: string[];
  chronicConditions: string[];
  pastSurgeries: string[];
  familyHistory: string[];
  bloodType: string;
  organDonor: boolean;
  activePrescriptions: Prescription[];
  confidentialPsychNotes?: string;
}

export interface PatientPII {
  fullName: string;
  cpf: string;
  nationalHealthCard: string;
  birthDate: string;
  motherName: string;
  residentialAddress: string;
  emergencyContact: string;
  genomicProfileId: string;
}

export interface NursingCareNote {
  id: string;
  timestamp: string;
  note: string;
  authorName: string;
  authorRole: UserRole;
  authorCoren: string;
  category: 'EVOLUCAO' | 'CURATIVO' | 'INTERCORRENCIA' | 'MEDICACAO' | 'GERAL';
}

export interface MedicationAdministrationRecord {
  id: string;
  prescriptionId: string;
  medicationName: string;
  administeredAt: string;
  administeredBy: string;
  administeredByCoren: string;
  notes?: string;
}

export interface Patient {
  id: string;
  recordNumber: string; // e.g. HC-2026-9921
  bed: string;
  room: string;
  department: string;
  admissionDate: string;
  triagePriority: TriagePriority;
  chiefComplaint: string;
  gender: 'M' | 'F' | 'OTHER';
  age: number;
  pii: PatientPII;
  currentVitals: VitalsMeasurement;
  vitalsHistory: VitalsMeasurement[];
  clinicalDiagnosis: ClinicalDiagnosis;
  medicalHistory: MedicalHistory;
  nursingNotes?: NursingCareNote[];
  medicationAdministrations?: MedicationAdministrationRecord[];
}

/**
 * Data Minimization Safe View for Nurses (LGPD Art. 6º, III & NIST SP 800-53 RBAC).
 * Strictly contains ONLY clinical data permitted for nursing care.
 * Explicitly EXCLUDES:
 * - CID-10 diagnostic codes & descriptions
 * - Physician clinical prognosis & medical notes
 * - Confidential psychiatric evaluations
 * - Genomic profile IDs
 * - Patient CPF, mother name, and residential address
 * - Masked/encrypted placeholders (zero teasers)
 */
export interface NursePermittedPatient {
  id: string;
  recordNumber: string;
  bed: string;
  room: string;
  department: string;
  admissionDate: string;
  triagePriority: TriagePriority;
  patientName: string;
  age: number;
  gender: 'M' | 'F' | 'OTHER';
  chiefComplaint: string;
  allergies: string[];
  bloodType: string;
  emergencyContact: string;
  currentVitals: VitalsMeasurement;
  vitalsHistory: VitalsMeasurement[];
  activePrescriptions: Prescription[];
  nursingNotes: NursingCareNote[];
  medicationAdministrations: MedicationAdministrationRecord[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: UserRole;
  action: string;
  resource: string;
  patientId?: string;
  outcome: 'GRANTED' | 'DENIED_RBAC' | 'BLOCKED_XSS' | 'MASKED_UNAUTHORIZED' | 'SECURITY_ALERT';
  securityClassification: 'TLP:AMBER' | 'TLP:RED' | 'RESTRICTED';
  ipAddress: string;
  deviceFingerprint: string;
  sha256Proof: string;
}

export interface NdaState {
  isSigned: boolean;
  signedByName?: string;
  signedByRole?: UserRole;
  signedAt?: string;
  signatureDataUrl?: string;
  documentSha256?: string;
  certificateThumbprint?: string;
  organizationUnit?: string;
}

export interface AccessPhotoRecord {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  userRoleTitle: string;
  registrationNumber: string;
  photoDataUrl: string; // Base64 snapshot from notebook/tablet camera
  deviceType: 'Notebook' | 'Tablet' | 'Dispositivo Móvel' | 'Desktop';
  status: 'CAPTURED_SUCCESS' | 'PERMISSION_DENIED' | 'CAMERA_UNAVAILABLE';
  hashProof: string;
  ipAddress: string;
  userAgent: string;
  sharpnessScore?: number;
  faceDetected?: boolean;
  isSharp?: boolean;
  eyesVisible?: boolean;
  noseVisible?: boolean;
  mouthVisible?: boolean;
  isSpoofOrPresentation?: boolean;
  isHandOrObject?: boolean;
  livenessConfirmed?: boolean;
  biometricValidationMessage?: string;
}

export interface SecurityState {
  isShieldLocked: boolean;
  autoLockTimeSeconds: number;
  secondsUntilAutoLock: number;
  zeroTrustSessionId: string;
  cspEnforced: boolean;
  xssFilterActive: boolean;
  sandboxIsolated: boolean;
  simulatedLatencyMs: number;
  isSimulatingLatency: boolean;
  latencyProgress: number;
}
