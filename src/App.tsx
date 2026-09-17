/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { User, Patient, NdaState, SecurityState, AuditLogEntry, VitalsMeasurement } from './types';
import { MOCK_USERS } from '../data/mockUsers';
import { MOCK_PATIENTS } from '../data/mockPatients';
import { generateSHA256Hash, toNursePermittedPatient } from './utils/security';
import { Navbar } from './components/Navbar';
import { PatientList } from './components/PatientList';
import { PatientDetail } from './components/PatientDetail';
import { NursePortal } from './components/NursePortal';
import { LoginModal } from './components/LoginModal';
import { LoginScreen } from './components/LoginScreen';
import { NdaModal } from './components/NdaModal';
import { SecurityConsoleModal } from './components/SecurityConsoleModal';
import { PrivacyShieldOverlay } from './components/PrivacyShieldOverlay';
import { AntiScreenshotGuard } from './components/AntiScreenshotGuard';
import { LatencyLoader } from './components/LatencyLoader';
import { ErrorPage404, ErrorPage500 } from './components/ErrorPages';
import { AccessRestrictedModal } from './components/AccessRestrictedModal';
import { ShieldCheck, Stethoscope, HeartPulse, Lock, Info, Activity, Building2 } from 'lucide-react';

export default function App() {
  // Authentication Guard State (Requires login first before accessing records)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [showAccessRestrictedModal, setShowAccessRestrictedModal] = useState<boolean>(false);
  const [loginKey, setLoginKey] = useState<number>(0);

  // Current logged in user (defaults to Doctor to showcase full suite, can switch anytime)
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USERS[0]);
  const [patients, setPatients] = useState<Patient[]>(MOCK_PATIENTS);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // NDA (Termo de Confidencialidade) State for Dynamic Data Masking (DDM)
  const [ndaState, setNdaState] = useState<NdaState>({
    isSigned: false,
  });

  // Security & Sandbox State
  const [securityState, setSecurityState] = useState<SecurityState>({
    isShieldLocked: false,
    autoLockTimeSeconds: 300, // 5 minutes
    secondsUntilAutoLock: 300,
    zeroTrustSessionId: `ZTS-2026-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
    cspEnforced: true,
    xssFilterActive: true,
    sandboxIsolated: true,
    simulatedLatencyMs: 2200,
    isSimulatingLatency: false,
    latencyProgress: 0,
  });
  const [lockReason, setLockReason] = useState<'MINIMIZE_OR_TAB_SWITCH' | 'INACTIVITY' | 'MANUAL'>('MINIMIZE_OR_TAB_SWITCH');

  // Active view state (Normal App or Custom Zero-Leak Error Pages)
  const [activeView, setActiveView] = useState<'MAIN' | '404' | '500'>('MAIN');

  // Modals state
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isNdaModalOpen, setIsNdaModalOpen] = useState(false);
  const [isSecurityConsoleOpen, setIsSecurityConsoleOpen] = useState(false);

  // Append-only cryptographic Audit Trail
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([
    {
      id: 'log_init_01',
      timestamp: '2026-08-27 13:45:01',
      actor: 'Dr. Arthur Pendelton',
      actorRole: 'DOCTOR',
      action: 'AUTENTICACAO_FIDO2_SUCCESS',
      resource: 'Hospital Security Gateway',
      outcome: 'GRANTED',
      securityClassification: 'TLP:AMBER',
      ipAddress: '10.240.12.84 (VLAN Médica Isolada)',
      deviceFingerprint: 'FP_SEC_CORP_WORKSTATION_#4412',
      sha256Proof: 'sha256_e49b801a91cf280e227781b0a1928374',
    },
    {
      id: 'log_init_02',
      timestamp: '2026-08-27 13:45:10',
      actor: 'Dr. Arthur Pendelton',
      actorRole: 'DOCTOR',
      action: 'APLICACAO_POLITICA_CSP_XSS',
      resource: 'Browser DOM Context',
      outcome: 'GRANTED',
      securityClassification: 'RESTRICTED',
      ipAddress: '10.240.12.84',
      deviceFingerprint: 'FP_SEC_CORP_WORKSTATION_#4412',
      sha256Proof: 'sha256_8819fa00c12e55a8b7710928a3819b11',
    },
  ]);

  // Log an audit event
  const logAuditEvent = useCallback(
    (action: string, resource: string, outcome: 'GRANTED' | 'DENIED_RBAC' | 'BLOCKED_XSS' | 'MASKED_UNAUTHORIZED' | 'SECURITY_ALERT') => {
      const now = new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR');
      const sha256Proof = generateSHA256Hash(`${action}_${resource}_${currentUser.id}_${Date.now()}`);
      
      const newEntry: AuditLogEntry = {
        id: `log_${Date.now()}`,
        timestamp: now,
        actor: currentUser.name,
        actorRole: currentUser.role,
        action,
        resource,
        outcome,
        securityClassification: outcome === 'DENIED_RBAC' ? 'TLP:RED' : 'TLP:AMBER',
        ipAddress: '10.240.12.84 (Subnet Segura)',
        deviceFingerprint: 'FP_SEC_SESSION_' + currentUser.sessionToken.slice(0, 10),
        sha256Proof,
      };

      setAuditLogs((prev) => [newEntry, ...prev]);
    },
    [currentUser]
  );

  // Inactivity Timer for Privacy Shield Auto-Lock
  useEffect(() => {
    const handleActivity = () => {
      if (!securityState.isShieldLocked) {
        setSecurityState((prev) => ({ ...prev, secondsUntilAutoLock: prev.autoLockTimeSeconds }));
      }
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    const timer = setInterval(() => {
      setSecurityState((prev) => {
        if (prev.isShieldLocked) return prev;
        if (prev.secondsUntilAutoLock <= 1) {
          setLockReason('INACTIVITY');
          return {
            ...prev,
            secondsUntilAutoLock: 0,
            isShieldLocked: true,
          };
        }
        return {
          ...prev,
          secondsUntilAutoLock: prev.secondsUntilAutoLock - 1,
        };
      });
    }, 1000);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      clearInterval(timer);
    };
  }, [securityState.isShieldLocked, isAuthenticated]);

  // Lock screen immediately if user minimizes window, switches tab, or navigates away
  useEffect(() => {
    if (!isAuthenticated) return;

    const triggerLock = (detectionType: string) => {
      setLockReason('MINIMIZE_OR_TAB_SWITCH');
      setSecurityState((prev) => {
        if (prev.isShieldLocked) return prev;
        return { ...prev, isShieldLocked: true };
      });
      logAuditEvent(
        'BLOQUEIO_AUTOMATICO_MINIMIZACAO',
        `Tela de prontuários bloqueada: ${detectionType}. Liberação restrita por senha do operador.`,
        'SECURITY_ALERT'
      );
    };

    const handleVisibilityChange = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        triggerLock('Minimização de janela ou alternância de aba detectada (document.hidden)');
      }
    };

    const handleWindowBlur = () => {
      // Delay slightly to confirm that the entire window or tab actually lost focus (e.g. minimized or switched apps)
      setTimeout(() => {
        if (!document.hasFocus() || document.hidden || document.visibilityState === 'hidden') {
          triggerLock('Perda de foco / tela minimizada do navegador (window.blur)');
        }
      }, 150);
    };

    const handlePageHide = () => {
      triggerLock('Navegação externa ou aba fechada/ocultada (window.pagehide)');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [isAuthenticated, logAuditEvent]);

  // Complete authentication after the login credentials are validated.
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    logAuditEvent(
      'AUTENTICACAO_LOGIN_SUCCESS',
      `Operador ${user.name} autenticado com credenciais válidas`,
      'GRANTED'
    );
  };

  // Handle User Role Switch
  const handleSelectUser = (newUser: User) => {
    setIsLoginModalOpen(false);
    setSelectedPatientId(null);
    setCurrentUser(newUser);
    logAuditEvent(
      'SOLICITACAO_TROCA_OPERADOR',
      `Operador alterado para ${newUser.roleTitle} (${newUser.registrationNumber})`,
      'GRANTED'
    );
  };

  // Handle User Logout (Return to Login Screen)
  const handleLogout = () => {
    logAuditEvent('LOGOUT_TERMINAL', `Operador ${currentUser.name} desconectou-se do terminal`, 'GRANTED');
    setIsAuthenticated(false);
    setSelectedPatientId(null);
    setShowAccessRestrictedModal(false);
    setLoginKey((prev) => prev + 1);
  };

  // Handle NDA signature
  const handleSignNda = (newNda: NdaState) => {
    setNdaState(newNda);
    logAuditEvent('ASSINATURA_DIGITAL_NDA_DESMASCARAMENTO', `Termo assinado por ${currentUser.name}`, 'GRANTED');
  };

  // Handle Saving new vitals
  const handleSaveNewVitals = (patientId: string, newVitals: VitalsMeasurement) => {
    setPatients((prev) =>
      prev.map((pat) => {
        if (pat.id === patientId) {
          return {
            ...pat,
            currentVitals: newVitals,
            vitalsHistory: [newVitals, ...pat.vitalsHistory],
          };
        }
        return pat;
      })
    );
  };

  // Trigger simulated latency loading alert
  const triggerSimulatedLatency = () => {
    setSecurityState((prev) => ({ ...prev, isSimulatingLatency: true }));
  };

  // Data Minimization Safe Projection for Nurse Portal (Zero Leakage)
  // Guarantees only nursing-authorized fields are sent; excludes CID-10, psychiatric notes, and unnecessary PII.
  const nursePermittedPatients = React.useMemo(() => {
    return patients.map(toNursePermittedPatient);
  }, [patients]);

  const handleAddNursingNote = (
    patientId: string,
    note: string,
    category: 'EVOLUCAO' | 'CURATIVO' | 'INTERCORRENCIA' | 'MEDICACAO' | 'GERAL'
  ) => {
    const newNote = {
      id: `note_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      note,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      authorCoren: currentUser.registrationNumber,
      category,
    };

    setPatients((prev) =>
      prev.map((pat) => {
        if (pat.id === patientId) {
          return {
            ...pat,
            nursingNotes: [newNote, ...(pat.nursingNotes || [])],
          };
        }
        return pat;
      })
    );
  };

  const handleAdministerMedication = (
    patientId: string,
    prescriptionId: string,
    medicationName: string
  ) => {
    const newRecord = {
      id: `adm_${Date.now()}`,
      prescriptionId,
      medicationName,
      administeredAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      administeredBy: currentUser.name,
      administeredByCoren: currentUser.registrationNumber,
    };

    setPatients((prev) =>
      prev.map((pat) => {
        if (pat.id === patientId) {
          return {
            ...pat,
            medicationAdministrations: [newRecord, ...(pat.medicationAdministrations || [])],
          };
        }
        return pat;
      })
    );
  };

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  // If not authenticated, render LoginScreen.
  if (!isAuthenticated) {
    return (
      <AntiScreenshotGuard
        onLogSecurityIncident={(action, detail) =>
          logAuditEvent(action, detail, 'SECURITY_ALERT')
        }
      >
        <LoginScreen
          key={loginKey}
          onLoginSuccess={handleLoginSuccess}
          onLogAuditEvent={logAuditEvent}
        />
      </AntiScreenshotGuard>
    );
  }

  return (
    <AntiScreenshotGuard
      onLogSecurityIncident={(action, detail) =>
        logAuditEvent(action, detail, 'SECURITY_ALERT')
      }
    >
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans protect-clinical-data">
        {/* Top Clinical Navigation */}
        <Navbar
          currentUser={currentUser}
          ndaState={ndaState}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
          onLogout={handleLogout}
          onOpenNdaModal={() => setIsNdaModalOpen(true)}
        />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {activeView === '404' ? (
            <ErrorPage404 onReturnHome={() => setActiveView('MAIN')} />
          ) : activeView === '500' ? (
            <ErrorPage500 onReset={() => setActiveView('MAIN')} />
          ) : currentUser.role === 'NURSE' ? (
            <NursePortal
              patients={nursePermittedPatients}
              currentUser={currentUser}
              onSaveNewVitals={handleSaveNewVitals}
              onAddNursingNote={handleAddNursingNote}
              onAdministerMedication={handleAdministerMedication}
              onLogAuditEvent={logAuditEvent}
            />
          ) : selectedPatient ? (
            <PatientDetail
              patient={selectedPatient}
              currentUser={currentUser}
              ndaState={ndaState}
              onBack={() => setSelectedPatientId(null)}
              onOpenNdaModal={() => setIsNdaModalOpen(true)}
              onSaveNewVitals={handleSaveNewVitals}
              onLogAuditEvent={logAuditEvent}
            />
          ) : (
            <PatientList
              patients={patients}
              selectedPatientId={selectedPatientId}
              onSelectPatient={(id) => {
                setSelectedPatientId(id);
                logAuditEvent('ACESSO_PRONTUARIO', `Prontuário ID: ${id}`, 'GRANTED');
              }}
              currentUser={currentUser}
              ndaState={ndaState}
              onOpenNdaModal={() => setIsNdaModalOpen(true)}
            />
          )}
        </main>

        {/* Footer with Security & Clinical Standards */}
        <footer className="border-t border-slate-200 bg-white py-4 px-4 sm:px-6 text-xs text-slate-500 mt-auto">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sky-800 font-bold">HOSPITAL SANTA CLARA • CLASSIFIED HEALTHCARE</span>
              <span>•</span>
              <span>Conformidade ISO 27799 / LGPD Art. 11 / NIST SP 800-53 / Zero Trust</span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span className="text-rose-700 font-bold flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                Anti-Screenshot Ativo
              </span>
              <span>•</span>
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                CSP & XSS Shield
              </span>
            </div>
          </div>
        </footer>

        {/* Modals & Overlays */}
        {isLoginModalOpen && (
          <LoginModal
            currentUser={currentUser}
            onSelectUser={handleSelectUser}
            onClose={() => setIsLoginModalOpen(false)}
          />
        )}

        {isNdaModalOpen && (
          <NdaModal
            currentUser={currentUser}
            ndaState={ndaState}
            onSignNda={handleSignNda}
            onClose={() => setIsNdaModalOpen(false)}
          />
        )}

        {isSecurityConsoleOpen && (
          <SecurityConsoleModal
            currentUser={currentUser}
            auditLogs={auditLogs}
            onClose={() => setIsSecurityConsoleOpen(false)}
          />
        )}

        {/* Latency Loading Alert Simulator */}
        <LatencyLoader
          isLoading={securityState.isSimulatingLatency}
          durationMs={securityState.simulatedLatencyMs}
          onComplete={() => {
            setSecurityState((prev) => ({ ...prev, isSimulatingLatency: false }));
            logAuditEvent('VALIDACAO_LATENCIA_SANDBOX', 'Inspeção de Requisição Criptográfica Concluída', 'GRANTED');
          }}
        />

        {/* Privacy Shield (Bloqueio de Tela / Anti-Shoulder Surfing com Senha) */}
        {securityState.isShieldLocked && (
          <PrivacyShieldOverlay
            currentUser={currentUser}
            lockReason={lockReason}
            onUnlock={() => {
              setSecurityState((prev) => ({
                ...prev,
                isShieldLocked: false,
                secondsUntilAutoLock: prev.autoLockTimeSeconds,
              }));
              setLockReason('MANUAL');
              logAuditEvent(
                'DESBLOQUEIO_AUTORIZADO_SENHA',
                `Prontuários médicos liberados após autenticação com senha do operador ${currentUser.name} (${currentUser.registrationNumber})`,
                'GRANTED'
              );
            }}
            onLogout={handleLogout}
          />
        )}
      </div>
    </AntiScreenshotGuard>
  );
}
