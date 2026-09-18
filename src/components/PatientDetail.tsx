import React, { useState } from 'react';
import {
  ArrowLeft,
  Activity,
  Heart,
  Thermometer,
  Wind,
  Droplets,
  Plus,
  Shield,
  ShieldAlert,
  Lock,
  FileText,
  AlertTriangle,
  Stethoscope,
  Pill,
  ClipboardList,
  CheckCircle2,
  Calendar,
  UserCheck,
  Dna,
  History,
  Terminal,
  Bed,
  FileCheck2,
  Check,
  Phone,
  MapPin,
  User as UserIcon,
  Sparkles,
  Edit3,
  X
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Patient, User, NdaState, VitalsMeasurement, Prescription } from '../types';
import { maskSensitiveData, isUserAuthorizedForPII, sanitizeInput } from '../utils/security';
import { LiveEcgCanvas } from './LiveEcgCanvas';
import { RoleRestrictedNotice } from './RoleRestrictedNotice';
import { VitalsModal } from './VitalsModal';

interface PatientDetailProps {
  patient: Patient;
  currentUser: User;
  ndaState: NdaState;
  onBack: () => void;
  onOpenNdaModal: () => void;
  onSaveNewVitals: (patientId: string, vitals: VitalsMeasurement) => void;
  onLogAuditEvent: (action: string, resource: string, outcome: 'GRANTED' | 'DENIED_RBAC' | 'MASKED_UNAUTHORIZED') => void;
}

export const PatientDetail: React.FC<PatientDetailProps> = ({
  patient,
  currentUser,
  ndaState,
  onBack,
  onOpenNdaModal,
  onSaveNewVitals,
  onLogAuditEvent,
}) => {
  const [activeTab, setActiveTab] = useState<'VITALS' | 'DIAGNOSIS' | 'HISTORY' | 'AUDIT'>('VITALS');
  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [isDiagnosisModalOpen, setIsDiagnosisModalOpen] = useState(false);

  // New Prescription Form State (Doctor only)
  const [newMedication, setNewMedication] = useState('');
  const [newDosage, setNewDosage] = useState('');
  const [newRoute, setNewRoute] = useState('Oral');
  const [newFrequency, setNewFrequency] = useState('8 em 8 horas');
  const [bmiWeight, setBmiWeight] = useState('');
  const [bmiHeight, setBmiHeight] = useState('');
  const [bmiResult, setBmiResult] = useState<{ imc: number; classificacao: string } | null>(null);
  const [bmiError, setBmiError] = useState('');

  // Diagnosis note update state
  const [additionalNote, setAdditionalNote] = useState('');
  const [activePrescriptionsList, setActivePrescriptionsList] = useState<Prescription[]>(
    patient.medicalHistory.activePrescriptions
  );
  const [customPhysicianNotes, setCustomPhysicianNotes] = useState<string>(
    patient.clinicalDiagnosis.physicianNotes
  );

  const isDoctor = currentUser.role === 'DOCTOR' || currentUser.role === 'SECURITY_AUDITOR';
  const isNurse = currentUser.role === 'NURSE';
  const isAuthorized = isUserAuthorizedForPII(currentUser.role, ndaState.isSigned);

  // Dynamic Masking of sensitive fields (Doctors automatically have authorization, Nurses require NDA)
  const maskedName = maskSensitiveData(patient.pii.fullName, isAuthorized, 'NAME');
  const maskedCpf = maskSensitiveData(patient.pii.cpf, isAuthorized, 'CPF');
  const maskedAddress = maskSensitiveData(patient.pii.residentialAddress, isAuthorized, 'ADDRESS');
  const maskedPhone = maskSensitiveData(patient.pii.emergencyContact, isAuthorized, 'PHONE');
  const maskedMother = maskSensitiveData(patient.pii.motherName, isAuthorized, 'NAME');
  const maskedGenome = maskSensitiveData(patient.pii.genomicProfileId, isAuthorized, 'GENOME');

  const handleTabChange = (tab: 'VITALS' | 'DIAGNOSIS' | 'HISTORY' | 'AUDIT') => {
    setActiveTab(tab);
    if ((tab === 'DIAGNOSIS' || tab === 'HISTORY') && isNurse) {
      onLogAuditEvent(`TENTATIVA_ACESSO_${tab}`, `Prontuário ${patient.recordNumber}`, 'DENIED_RBAC');
    } else {
      onLogAuditEvent(`VISUALIZACAO_ABA_${tab}`, `Prontuário ${patient.recordNumber}`, 'GRANTED');
    }
  };

  const handleAddPrescription = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedication.trim() || !newDosage.trim()) return;

    const newRx: Prescription = {
      id: `rx_${Date.now()}`,
      medication: sanitizeInput(newMedication).sanitized,
      dosage: sanitizeInput(newDosage).sanitized,
      route: newRoute,
      frequency: sanitizeInput(newFrequency).sanitized,
      prescribedBy: `${currentUser.name} (${currentUser.registrationNumber})`,
      prescribedDate: new Date().toISOString().split('T')[0],
      status: 'ACTIVE',
    };

    setActivePrescriptionsList((prev) => [newRx, ...prev]);
    onLogAuditEvent('EMISSAO_PRESCRICAO_MEDICA', `Prescrição ${newRx.medication} - Prontuário ${patient.recordNumber}`, 'GRANTED');
    setIsPrescriptionModalOpen(false);
    setNewMedication('');
    setNewDosage('');
  };

  const handleSaveDiagnosisNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!additionalNote.trim()) return;

    const timestamp = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const formattedNote = `${customPhysicianNotes}\n[${timestamp} - ${currentUser.name}]: ${sanitizeInput(additionalNote).sanitized}`;
    setCustomPhysicianNotes(formattedNote);
    onLogAuditEvent('ATUALIZACAO_CONDUTA_MEDICA', `Evolução Clínica - Prontuário ${patient.recordNumber}`, 'GRANTED');
    setIsDiagnosisModalOpen(false);
    setAdditionalNote('');
  };

  const handleCalculateBmi = async (e: React.FormEvent) => {
    e.preventDefault();

    const peso = Number(bmiWeight);
    const altura = Number(bmiHeight);

    if (!peso || !altura || peso <= 0 || altura <= 0) {
      setBmiError('Informe peso e altura válidos.');
      setBmiResult(null);
      return;
    }

    try {
      const apiBaseUrl = import.meta.env.DEV ? 'http://localhost:3000' : '';
      const response = await fetch(`${apiBaseUrl}/api/medical/imc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ peso, altura }),
      });

      const rawText = await response.text();
      let payload: any = {};

      if (rawText) {
        try {
          payload = JSON.parse(rawText);
        } catch {
          payload = { message: 'Não foi possível calcular o IMC no momento.' };
        }
      }

      if (!response.ok) {
        throw new Error(payload?.message || 'Erro ao calcular IMC.');
      }

      if (!payload?.data?.imc && payload?.data?.imc !== 0) {
        throw new Error('Resposta do servidor inválida.');
      }

      if (!payload?.data?.classificacao) {
        throw new Error('Classificação do IMC não retornada.');
      }

      setBmiResult({
        imc: Number(payload.data.imc),
        classificacao: payload.data.classificacao,
      });
      setBmiError('');
    } catch (error) {
      setBmiError(error instanceof Error ? error.message : 'Erro ao calcular IMC.');
      setBmiResult(null);
    }
  };

  const chartData = patient.vitalsHistory.map((v) => ({
    time: v.timestamp,
    FC: v.heartRate,
    PAS: v.systolicBP,
    PAD: v.diastolicBP,
    SpO2: v.spo2,
    Temp: v.temperature,
  }));

  return (
    <div className="space-y-6">
      {/* Top Action & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-sky-600 transition shadow-xs"
        >
          <ArrowLeft size={16} />
          Voltar aos Prontuários & Leitos
        </button>

        <div className="flex items-center gap-2.5">
          {isDoctor ? (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 border border-sky-200 px-4 py-2 text-xs font-bold text-sky-800 shadow-xs">
              <Stethoscope size={14} className="text-sky-600" />
              <span>Autorização Médica Total (CRM Ativo)</span>
            </div>
          ) : !ndaState.isSigned ? (
            <button
              onClick={onOpenNdaModal}
              className="inline-flex items-center gap-1.5 rounded-full border border-sky-300 bg-sky-50 px-4 py-2 text-xs font-bold text-sky-700 hover:bg-sky-100 transition shadow-xs"
            >
              <Lock size={13} className="text-sky-600" />
              Desmascarar PII (Assinar NDA)
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-4 py-2 text-xs font-bold text-emerald-700 font-mono shadow-xs">
              <CheckCircle2 size={14} className="text-emerald-600" />
              NDA Assinado por {ndaState.signedByName}
            </div>
          )}

          <button
            onClick={() => setIsVitalsModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-sky-600 px-4 py-2 text-xs font-bold text-white hover:bg-sky-500 transition shadow-md shadow-sky-600/20 active:scale-95"
          >
            <Plus size={15} />
            Registrar Sinais Vitais
          </button>
        </div>
      </div>

      {/* Patient Header Card in Clean Hospital Light Style */}
      {isDoctor && (
        <div className="hospital-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              <Activity size={18} />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">Cálculo de IMC</h2>
              <p className="text-xs text-slate-500">O formulário envia apenas peso e altura. O servidor calcula o IMC final.</p>
            </div>
          </div>

          <form onSubmit={handleCalculateBmi} className="grid gap-4 md:grid-cols-[140px_140px_1fr] md:items-end">
            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-700">Peso (kg)</label>
              <input
                type="number"
                min="1"
                step="0.1"
                value={bmiWeight}
                onChange={(e) => setBmiWeight(e.target.value)}
                placeholder="70.5"
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm text-slate-900 focus:border-violet-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-700">Altura (cm)</label>
              <input
                type="number"
                min="1"
                step="0.1"
                value={bmiHeight}
                onChange={(e) => setBmiHeight(e.target.value)}
                placeholder="170"
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm text-slate-900 focus:border-violet-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="rounded-full bg-violet-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-violet-500 transition"
              >
                Calcular IMC
              </button>

              {bmiResult && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  Resultado: <strong>IMC {bmiResult.imc}</strong> • {bmiResult.classificacao}
                </div>
              )}
            </div>
          </form>

          {bmiResult ? (
            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <strong>IMC calculado com sucesso:</strong> {bmiResult.imc} — {bmiResult.classificacao}
            </div>
          ) : bmiError ? (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {bmiError}
            </div>
          ) : null}
        </div>
      )}

      <div className="hospital-card p-6 sm:p-7">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-xs font-bold text-sky-800 bg-sky-100 border border-sky-200 px-3 py-1 rounded-lg">
                PRONTUÁRIO: {patient.recordNumber}
              </span>
              <span className="flex items-center gap-1.5 rounded-lg bg-slate-100 border border-slate-200 px-3 py-1 font-mono text-xs text-slate-800 font-bold">
                <Bed size={14} className="text-sky-600" />
                {patient.bed} ({patient.room})
              </span>
              <span className="rounded-lg bg-slate-100 border border-slate-200 px-3 py-1 text-xs text-slate-700 font-bold">
                {patient.department}
              </span>
              {isDoctor && (
                <span className="rounded-lg bg-emerald-100 border border-emerald-200 px-2.5 py-1 text-xs text-emerald-800 font-mono font-bold flex items-center gap-1">
                  <Check size={13} className="text-emerald-600" />
                  CID-10: {patient.clinicalDiagnosis.primaryCID}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {maskedName.display}
              </h1>
              {isDoctor && (
                <span className="rounded-full bg-sky-100 text-sky-800 border border-sky-200 px-2.5 py-0.5 text-[11px] font-bold font-mono">
                  ACESSO TOTAL LIBERADO
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 font-medium">
              Idade: <strong className="text-slate-800">{patient.age} anos</strong> • Gênero: <strong className="text-slate-800">{patient.gender === 'M' ? 'Masculino' : 'Feminino'}</strong> • Data de Admissão: <span className="font-mono text-slate-700 font-semibold">{patient.admissionDate}</span>
            </p>
          </div>

          {/* Demographic & PII Details Box (Clear & Unmasked for Doctors, Protected for Nurses) */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs space-y-2 min-w-[320px] max-w-md w-full">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <span className="text-slate-500 font-sans font-bold flex items-center gap-1.5">
                <UserCheck size={14} className="text-sky-600" />
                Identificação PII / SUS:
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isAuthorized ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {isAuthorized ? 'DESMASCARADO' : 'MASCARADO (LGPD)'}
              </span>
            </div>

            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-500">CPF:</span>
              <span className="text-slate-900 font-bold">{maskedCpf.display}</span>
            </div>

            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-500">Cartão SUS:</span>
              <span className="text-slate-800 font-semibold">
                {isAuthorized ? patient.pii.nationalHealthCard : '*** **** **** ****'}
              </span>
            </div>

            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-500">Nome da Mãe:</span>
              <span className="text-slate-800 font-semibold">{maskedMother.display}</span>
            </div>

            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-500">Contato Emergência:</span>
              <span className="text-slate-800 font-medium">{maskedPhone.display}</span>
            </div>

            {isAuthorized && (
              <div className="pt-1.5 border-t border-slate-200/80">
                <div className="flex justify-between items-start gap-2">
                  <span className="text-slate-500 shrink-0">Endereço:</span>
                  <span className="text-slate-700 text-right text-[11px] leading-tight">{maskedAddress.display}</span>
                </div>
              </div>
            )}

            <div className="pt-1.5 border-t border-slate-200/80 flex justify-between items-center">
              <span className="text-slate-500">Genômica:</span>
              <span className="text-sky-700 font-bold">{maskedGenome.display}</span>
            </div>
          </div>
        </div>

        {/* Chief Complaint */}
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs">
          <span className="font-bold text-slate-700 block mb-0.5">Queixa Principal / Motivo da Internação:</span>
          <span className="text-slate-800 italic font-medium">"{patient.chiefComplaint}"</span>
        </div>
      </div>

      {/* Tabs Navigation in Clean Hospital Pills Style */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => handleTabChange('VITALS')}
          className={`flex items-center gap-2 rounded-full py-2 px-4 text-xs font-bold transition ${
            activeTab === 'VITALS'
              ? 'hospital-pill-active'
              : 'hospital-pill-inactive'
          }`}
        >
          <Activity size={15} />
          Sinais Vitais & Telemetria
          <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.2 font-bold">
            Livre (Médicos & Enfermagem)
          </span>
        </button>

        <button
          onClick={() => handleTabChange('DIAGNOSIS')}
          className={`flex items-center gap-2 rounded-full py-2 px-4 text-xs font-bold transition ${
            activeTab === 'DIAGNOSIS'
              ? 'hospital-pill-active'
              : 'hospital-pill-inactive'
          }`}
        >
          <Stethoscope size={15} />
          Diagnóstico Clínico (CID-10)
          {isDoctor ? (
            <span className="rounded-full bg-sky-100 text-sky-800 text-[10px] px-2 py-0.2 font-bold font-mono">
              CRM Liberado
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 text-[10px] px-2 py-0.2 font-bold">
              <Lock size={10} /> Restrito Médicos
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange('HISTORY')}
          className={`flex items-center gap-2 rounded-full py-2 px-4 text-xs font-bold transition ${
            activeTab === 'HISTORY'
              ? 'hospital-pill-active'
              : 'hospital-pill-inactive'
          }`}
        >
          <ClipboardList size={15} />
          Histórico Médico & Prescrições
          {isDoctor ? (
            <span className="rounded-full bg-sky-100 text-sky-800 text-[10px] px-2 py-0.2 font-bold font-mono">
              CRM Liberado
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 text-[10px] px-2 py-0.2 font-bold">
              <Lock size={10} /> Restrito Médicos
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange('AUDIT')}
          className={`flex items-center gap-2 rounded-full py-2 px-4 text-xs font-bold transition ${
            activeTab === 'AUDIT'
              ? 'hospital-pill-active'
              : 'hospital-pill-inactive'
          }`}
        >
          <Terminal size={15} />
          Trilha de Auditoria Zero Trust
        </button>
      </div>

      {/* Tab Content Container */}
      <div className="space-y-6">
        {/* ===================== TAB 1: SINAIS VITAIS ===================== */}
        {activeTab === 'VITALS' && (
          <div className="space-y-6">
            {/* Live ECG Waveform Banner */}
            <LiveEcgCanvas
              heartRate={patient.currentVitals.heartRate}
              isNormal={patient.currentVitals.heartRate <= 100 && patient.currentVitals.heartRate >= 60}
            />

            {/* Current Vitals Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {/* FC */}
              <div className="hospital-card p-3.5">
                <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-1">
                  <span className="flex items-center gap-1 text-rose-600">
                    <Heart size={14} /> FC
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">60-100</span>
                </div>
                <div className="font-mono text-2xl font-extrabold text-slate-900">
                  {patient.currentVitals.heartRate}
                  <span className="text-xs font-normal text-slate-500 ml-1">bpm</span>
                </div>
                <div className="mt-1 text-[10px] font-bold text-rose-600">
                  {patient.currentVitals.heartRate > 100 ? 'Taquicardia' : patient.currentVitals.heartRate < 60 ? 'Bradicardia' : 'Normocárdico'}
                </div>
              </div>

              {/* PA */}
              <div className="hospital-card p-3.5">
                <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-1">
                  <span className="flex items-center gap-1 text-sky-700">
                    <Activity size={14} /> PA
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">&lt;120/80</span>
                </div>
                <div className="font-mono text-xl font-extrabold text-slate-900">
                  {patient.currentVitals.systolicBP}/{patient.currentVitals.diastolicBP}
                  <span className="text-xs font-normal text-slate-500 ml-1">mmHg</span>
                </div>
                <div className="mt-1 text-[10px] font-bold text-sky-700">
                  {patient.currentVitals.systolicBP >= 140 ? 'Hipertensão Grau I' : 'Normotenso'}
                </div>
              </div>

              {/* SpO2 */}
              <div className="hospital-card p-3.5">
                <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-1">
                  <span className="flex items-center gap-1 text-blue-700">
                    <Wind size={14} /> SpO₂
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">&gt;95%</span>
                </div>
                <div className="font-mono text-2xl font-extrabold text-slate-900">
                  {patient.currentVitals.spo2}
                  <span className="text-xs font-normal text-slate-500 ml-1">%</span>
                </div>
                <div className="mt-1 text-[10px] font-bold text-blue-700">
                  {patient.currentVitals.spo2 < 95 ? 'Hipóxia Leve' : 'Saturação Ideal'}
                </div>
              </div>

              {/* Temp */}
              <div className="hospital-card p-3.5">
                <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-1">
                  <span className="flex items-center gap-1 text-amber-700">
                    <Thermometer size={14} /> Temp
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">36.0-37.5</span>
                </div>
                <div className="font-mono text-2xl font-extrabold text-slate-900">
                  {patient.currentVitals.temperature}
                  <span className="text-xs font-normal text-slate-500 ml-1">°C</span>
                </div>
                <div className="mt-1 text-[10px] font-bold text-amber-700">
                  {patient.currentVitals.temperature >= 37.8 ? 'Febre / Hipertermia' : 'Afebril'}
                </div>
              </div>

              {/* Resp Rate */}
              <div className="hospital-card p-3.5">
                <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-1">
                  <span>FR</span>
                  <span className="text-[10px] text-slate-400 font-normal">12-20</span>
                </div>
                <div className="font-mono text-2xl font-extrabold text-slate-900">
                  {patient.currentVitals.respiratoryRate}
                  <span className="text-xs font-normal text-slate-500 ml-1">rpm</span>
                </div>
                <div className="mt-1 text-[10px] font-bold text-slate-600">
                  {patient.currentVitals.respiratoryRate > 20 ? 'Taquipneia' : 'Eupneico'}
                </div>
              </div>

              {/* Glucose */}
              <div className="hospital-card p-3.5">
                <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-1">
                  <span>Glicemia</span>
                  <span className="text-[10px] text-slate-400 font-normal">70-99</span>
                </div>
                <div className="font-mono text-2xl font-extrabold text-slate-900">
                  {patient.currentVitals.bloodGlucose}
                  <span className="text-xs font-normal text-slate-500 ml-1">mg/dL</span>
                </div>
                <div className="mt-1 text-[10px] font-bold text-slate-600">
                  Capilar
                </div>
              </div>

              {/* Glasgow */}
              <div className="hospital-card p-3.5">
                <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-1">
                  <span>Glasgow</span>
                  <span className="text-[10px] text-slate-400 font-normal">15 max</span>
                </div>
                <div className="font-mono text-2xl font-extrabold text-emerald-600">
                  {patient.currentVitals.glasgowScale}
                  <span className="text-xs font-normal text-slate-500 ml-1">/15</span>
                </div>
                <div className="mt-1 text-[10px] font-bold text-emerald-600">
                  Lúcido & Orientado
                </div>
              </div>
            </div>

            {/* Telemetry Line Charts */}
            <div className="hospital-card p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Activity size={16} className="text-sky-600" />
                    Tendência Temporal de Sinais Vitais (Aferições Recentes)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Histórico contínuo de Frequência Cardíaca (FC), Pressão Arterial Sistólica (PAS) e SpO₂
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <span className="flex items-center gap-1.5 text-rose-600 font-bold">
                    <span className="h-2 w-2 rounded-full bg-rose-500" /> FC (bpm)
                  </span>
                  <span className="flex items-center gap-1.5 text-sky-700 font-bold">
                    <span className="h-2 w-2 rounded-full bg-sky-600" /> PAS (mmHg)
                  </span>
                  <span className="flex items-center gap-1.5 text-blue-700 font-bold">
                    <span className="h-2 w-2 rounded-full bg-blue-600" /> SpO₂ (%)
                  </span>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} domain={[60, 180]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    />
                    <Line type="monotone" dataKey="FC" stroke="#e11d48" strokeWidth={2.5} dot={{ r: 4 }} name="FC (bpm)" />
                    <Line type="monotone" dataKey="PAS" stroke="#0284c7" strokeWidth={2.5} dot={{ r: 4 }} name="PAS (mmHg)" />
                    <Line type="monotone" dataKey="SpO2" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4 }} name="SpO₂ (%)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Vitals History List */}
            <div className="hospital-card p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <History size={16} className="text-sky-600" />
                Registros de Enfermagem & Assinatura Digital de Aferição
              </h3>

              <div className="divide-y divide-slate-100 font-mono text-xs">
                {patient.vitalsHistory.map((item) => (
                  <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-sky-700">{item.timestamp}</span>
                      <div className="flex items-center gap-3 text-slate-700">
                        <span>FC: <strong className="text-rose-600">{item.heartRate}</strong></span>
                        <span>PA: <strong className="text-sky-700">{item.systolicBP}/{item.diastolicBP}</strong></span>
                        <span>SpO2: <strong className="text-blue-700">{item.spo2}%</strong></span>
                        <span>Temp: <strong className="text-amber-700">{item.temperature}°C</strong></span>
                      </div>
                    </div>

                    <div className="text-slate-500 font-sans text-xs flex items-center gap-1.5">
                      <UserCheck size={13} className="text-emerald-600" />
                      Assinado por: <strong className="text-slate-800">{item.recordedBy}</strong> ({item.recordedByRole})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 2: DIAGNÓSTICO CLÍNICO ===================== */}
        {activeTab === 'DIAGNOSIS' && (
          <>
            {isNurse ? (
              <RoleRestrictedNotice
                currentUser={currentUser}
                restrictedSectionTitle="Diagnóstico Clínico & Conduta Médica"
                requiredClearance="LEVEL_4_FULL_CLINICAL (Médico CRM)"
              />
            ) : (
              <div className="space-y-6">
                {/* Primary CID-10 Card */}
                <div className="hospital-card p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <span className="rounded-lg bg-sky-100 border border-sky-200 px-3 py-1 font-mono text-sm font-extrabold text-sky-800">
                        CID-10: {patient.clinicalDiagnosis.primaryCID}
                      </span>
                      <span className="font-bold text-slate-900 text-base font-display">
                        {patient.clinicalDiagnosis.cidDescription}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsDiagnosisModalOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 border border-sky-200 px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-100 transition shadow-2xs"
                      >
                        <Edit3 size={13} />
                        Evoluir Prontuário (CRM)
                      </button>
                      <span className="font-mono text-xs text-slate-500">
                        Atualizado em: {patient.clinicalDiagnosis.lastUpdated}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3.5 text-xs leading-relaxed">
                    <div>
                      <strong className="text-slate-700 block mb-1">Sumário Diagnóstico & Evolução Médica:</strong>
                      <p className="text-slate-800 bg-slate-50 p-3.5 rounded-xl border border-slate-200 whitespace-pre-line">
                        {patient.clinicalDiagnosis.diagnosisSummary}
                      </p>
                    </div>

                    <div>
                      <strong className="text-sky-800 block mb-1">Plano Terapêutico & Condutas Prescritas:</strong>
                      <p className="text-slate-800 bg-sky-50/50 p-3.5 rounded-xl border border-sky-100">
                        {patient.clinicalDiagnosis.treatmentPlan}
                      </p>
                    </div>

                    <div>
                      <strong className="text-slate-700 block mb-1">Notas do Médico Assistente:</strong>
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-slate-800 whitespace-pre-line font-mono text-xs">
                        {customPhysicianNotes}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
                      <div>
                        <strong className="text-slate-600 block mb-1">Prognóstico Clínico:</strong>
                        <p className="text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200">
                          {patient.clinicalDiagnosis.prognosis}
                        </p>
                      </div>
                      <div>
                        <strong className="text-slate-600 block mb-1">Médico Responsável:</strong>
                        <p className="text-sky-800 font-bold bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono">
                          {patient.clinicalDiagnosis.admittingPhysician}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Laboratory Results */}
                <div className="hospital-card p-6">
                  <h3 className="text-sm font-bold text-slate-900 mb-3.5 flex items-center gap-2">
                    <FileCheck2 size={16} className="text-sky-600" />
                    Exames Laboratoriais & Marcadores Bioquímicos
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 font-bold">
                          <th className="pb-2.5">Exame / Parâmetro</th>
                          <th className="pb-2.5">Resultado Encontrado</th>
                          <th className="pb-2.5">Faixa de Referência</th>
                          <th className="pb-2.5">Status</th>
                          <th className="pb-2.5">Data / Hora</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {patient.clinicalDiagnosis.labResults.map((lab) => (
                          <tr key={lab.id} className="hover:bg-slate-50">
                            <td className="py-2.5 font-bold text-slate-900">{lab.testName}</td>
                            <td className="py-2.5 font-extrabold text-sky-700">{lab.value}</td>
                            <td className="py-2.5 text-slate-500">{lab.referenceRange}</td>
                            <td className="py-2.5">
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                  lab.status === 'CRITICAL'
                                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                    : lab.status === 'ELEVATED'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                }`}
                              >
                                {lab.status}
                              </span>
                            </td>
                            <td className="py-2.5 text-slate-500">{lab.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ===================== TAB 3: HISTÓRICO MÉDICO & PRESCRIÇÕES ===================== */}
        {activeTab === 'HISTORY' && (
          <>
            {isNurse ? (
              <RoleRestrictedNotice
                currentUser={currentUser}
                restrictedSectionTitle="Histórico Médico Pregresso & Prescrições Controladas"
                requiredClearance="LEVEL_4_FULL_CLINICAL (Médico CRM)"
              />
            ) : (
              <div className="space-y-6">
                {/* Active Prescriptions */}
                <div className="hospital-card p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Pill size={16} className="text-sky-600" />
                        Prescrições Médicas Ativas & Drogas Controladas
                      </h3>
                      <p className="text-xs text-slate-500">
                        Acesso restrito ao corpo médico habilitado (CRM)
                      </p>
                    </div>

                    <button
                      onClick={() => setIsPrescriptionModalOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-sky-600 px-4 py-2 text-xs font-bold text-white hover:bg-sky-500 transition shadow-sm"
                    >
                      <Plus size={14} />
                      Nova Prescrição Médica
                    </button>
                  </div>

                  <div className="space-y-3">
                    {activePrescriptionsList.map((rx) => (
                      <div
                        key={rx.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs font-mono"
                      >
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                            <span className="text-sm">{rx.medication}</span>
                            <span className="rounded-full bg-sky-100 text-sky-800 px-2.5 py-0.5 text-[10px] font-bold">
                              {rx.route}
                            </span>
                          </div>
                          <div className="text-slate-600 mt-1">
                            Dose: <strong className="text-slate-900">{rx.dosage}</strong> • Posologia: <strong className="text-slate-900">{rx.frequency}</strong>
                          </div>
                        </div>

                        <div className="text-right text-[11px] text-slate-500 font-sans mt-2 sm:mt-0">
                          <div>Prescrito por: <strong className="text-slate-800">{rx.prescribedBy}</strong></div>
                          <div>Data: {rx.prescribedDate}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Allergies & Chronic Conditions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Allergies */}
                  <div className="hospital-card p-6 border-rose-200">
                    <h3 className="text-sm font-bold text-rose-700 mb-3 flex items-center gap-2">
                      <AlertTriangle size={16} />
                      Alergias Medicamentosas & Ambientais
                    </h3>
                    <ul className="space-y-2 text-xs">
                      {patient.medicalHistory.knownAllergies.map((allergy, idx) => (
                        <li
                          key={idx}
                          className="rounded-xl border border-rose-200 bg-rose-50 p-3 font-semibold text-rose-800"
                        >
                          ⚠️ {allergy}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Comorbidities */}
                  <div className="hospital-card p-6">
                    <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <ClipboardList size={16} className="text-sky-600" />
                      Comorbidades & Antecedentes Cirúrgicos
                    </h3>
                    <div className="space-y-3 text-xs">
                      <div>
                        <strong className="text-slate-600 block mb-1">Condições Crônicas:</strong>
                        <div className="flex flex-wrap gap-1.5">
                          {patient.medicalHistory.chronicConditions.map((c, idx) => (
                            <span key={idx} className="rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-slate-700 font-semibold">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <strong className="text-slate-600 block mb-1">Cirurgias Anteriores:</strong>
                        <div className="flex flex-wrap gap-1.5">
                          {patient.medicalHistory.pastSurgeries.map((s, idx) => (
                            <span key={idx} className="rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-slate-700 font-semibold">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 font-mono text-[11px]">
                        <span className="text-slate-600">Tipo Sanguíneo: <strong className="text-rose-600 font-bold">{patient.medicalHistory.bloodType}</strong></span>
                        <span className="text-slate-600">Doador de Órgãos: <strong className="text-emerald-700 font-bold">{patient.medicalHistory.organDonor ? 'SIM' : 'NÃO'}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Confidential Notes */}
                {patient.medicalHistory.confidentialPsychNotes && (
                  <div className="hospital-card p-5 border-purple-200 bg-purple-50/50 font-mono text-xs">
                    <div className="text-purple-800 font-bold mb-1 flex items-center gap-1.5">
                      <Lock size={13} />
                      NOTAS CONFIDENCIAIS RESTRITAS AO CORPO CLÍNICO (MÉDICO CRM):
                    </div>
                    <p className="text-slate-700 font-sans text-xs leading-relaxed">{patient.medicalHistory.confidentialPsychNotes}</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ===================== TAB 4: ZERO TRUST TRACE ===================== */}
        {activeTab === 'AUDIT' && (
          <div className="hospital-card p-6 font-mono text-xs space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="font-bold text-slate-900 flex items-center gap-2">
                <Terminal size={15} className="text-sky-600" />
                Auditoria de Integridade Criptográfica do Prontuário
              </span>
              <span className="text-sky-700 font-bold text-[11px] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                TLP:AMBER / RESTRICTED
              </span>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-200 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Hash de Integridade do Registro:</span>
                <span className="text-emerald-700 font-bold">sha256_9b8820fae11370...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Última Aferição Verificada:</span>
                <span className="text-slate-800 font-semibold">{patient.currentVitals.timestamp} ({patient.currentVitals.recordedBy})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Regulamentação Aplicada:</span>
                <span className="text-sky-700 font-bold">ISO 27799:2016 / LGPD Art. 11 / HIPAA Security Rule</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Operador Autorizado Atual:</span>
                <span className="text-slate-800 font-bold">{currentUser.name} ({currentUser.roleTitle})</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Vitals Modal */}
      {isVitalsModalOpen && (
        <VitalsModal
          currentUser={currentUser}
          patientName={maskedName.display}
          onSaveVitals={(vitals) => {
            onSaveNewVitals(patient.id, vitals);
            onLogAuditEvent('REGISTRO_SINAIS_VITAIS', `Prontuário ${patient.recordNumber}`, 'GRANTED');
          }}
          onClose={() => setIsVitalsModalOpen(false)}
        />
      )}

      {/* Doctor Prescription Modal */}
      {isPrescriptionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="hospital-card w-full max-w-lg p-6 bg-white shadow-2xl relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setIsPrescriptionModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                <Pill size={18} />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900">
                  Nova Prescrição Médica
                </h3>
                <p className="text-xs text-slate-500">
                  Ato médico exclusivo • Prescritor: <strong>{currentUser.name} ({currentUser.registrationNumber})</strong>
                </p>
              </div>
            </div>

            <form onSubmit={handleAddPrescription} className="mt-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Medicamento / Princípio Ativo</label>
                <input
                  type="text"
                  required
                  value={newMedication}
                  onChange={(e) => setNewMedication(e.target.value)}
                  placeholder="Ex: Ceftriaxona Dissódica 1g"
                  className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Dose / Concentração</label>
                  <input
                    type="text"
                    required
                    value={newDosage}
                    onChange={(e) => setNewDosage(e.target.value)}
                    placeholder="Ex: 1g IV em 100mL SF"
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Via de Administração</label>
                  <select
                    value={newRoute}
                    onChange={(e) => setNewRoute(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-sky-500 focus:outline-none"
                  >
                    <option value="Oral">Oral (VO)</option>
                    <option value="Intravenosa (IV)">Intravenosa (IV)</option>
                    <option value="Subcutânea (SC)">Subcutânea (SC)</option>
                    <option value="Intramuscular (IM)">Intramuscular (IM)</option>
                    <option value="Inalatória">Inalatória</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Frequência / Intervalo</label>
                <input
                  type="text"
                  required
                  value={newFrequency}
                  onChange={(e) => setNewFrequency(e.target.value)}
                  placeholder="Ex: 12 em 12 horas por 7 dias"
                  className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPrescriptionModalOpen(false)}
                  className="rounded-full px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-full bg-sky-600 px-5 py-2 text-xs font-bold text-white hover:bg-sky-500 transition shadow-md shadow-sky-600/20"
                >
                  <Check size={14} />
                  Assinar & Emitir Prescrição
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Doctor Clinical Diagnosis Note Modal */}
      {isDiagnosisModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="hospital-card w-full max-w-lg p-6 bg-white shadow-2xl relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setIsDiagnosisModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                <Stethoscope size={18} />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900">
                  Evolução Médica do Prontuário
                </h3>
                <p className="text-xs text-slate-500">
                  Assinado por: <strong>{currentUser.name} ({currentUser.registrationNumber})</strong>
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveDiagnosisNote} className="mt-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nova Anotação / Conduta Clínica</label>
                <textarea
                  required
                  rows={4}
                  value={additionalNote}
                  onChange={(e) => setAdditionalNote(e.target.value)}
                  placeholder="Descreva a evolução do quadro clínico, resposta aos fármacos e ajustes no plano terapêutico..."
                  className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-900 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDiagnosisModalOpen(false)}
                  className="rounded-full px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-full bg-sky-600 px-5 py-2 text-xs font-bold text-white hover:bg-sky-500 transition shadow-md shadow-sky-600/20"
                >
                  <Check size={14} />
                  Salvar Evolução Médica
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
