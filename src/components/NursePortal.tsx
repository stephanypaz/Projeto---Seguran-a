import React, { useState, useMemo } from 'react';
import {
  HeartPulse,
  Activity,
  Heart,
  Thermometer,
  Wind,
  Bed,
  Search,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Pill,
  ClipboardCheck,
  FileText,
  Clock,
  ArrowLeft,
  ShieldCheck,
  Droplets,
  UserCheck,
  ChevronRight,
  Send,
  Sparkles,
  Phone,
  Syringe,
  Check
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { NursePermittedPatient, User, VitalsMeasurement, TriagePriority, Prescription, NursingCareNote } from '../types';
import { LiveEcgCanvas } from './LiveEcgCanvas';
import { VitalsModal } from './VitalsModal';
import { sanitizeInput } from '../utils/security';

interface NursePortalProps {
  patients: NursePermittedPatient[];
  currentUser: User;
  onSaveNewVitals: (patientId: string, vitals: VitalsMeasurement) => void;
  onAddNursingNote: (
    patientId: string,
    note: string,
    category: 'EVOLUCAO' | 'CURATIVO' | 'INTERCORRENCIA' | 'MEDICACAO' | 'GERAL'
  ) => void;
  onAdministerMedication: (patientId: string, prescriptionId: string, medicationName: string) => void;
  onLogAuditEvent: (action: string, resource: string, outcome: 'GRANTED' | 'DENIED_RBAC' | 'SECURITY_ALERT') => void;
}

export const NursePortal: React.FC<NursePortalProps> = ({
  patients,
  currentUser,
  onSaveNewVitals,
  onAddNursingNote,
  onAdministerMedication,
  onLogAuditEvent,
}) => {
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'VITALS' | 'MEDICATIONS' | 'CARE_NOTES'>('VITALS');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  
  // Vitals modal state
  const [vitalsModalPatient, setVitalsModalPatient] = useState<NursePermittedPatient | null>(null);

  // New nursing note form state
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteCategory, setNewNoteCategory] = useState<'EVOLUCAO' | 'CURATIVO' | 'INTERCORRENCIA' | 'MEDICACAO' | 'GERAL'>('EVOLUCAO');

  // Care checklist quick toggles (Bedside care items)
  const [careChecklist, setCareChecklist] = useState<Record<string, boolean>>({
    decubitus: true,
    ivAccess: true,
    dressings: false,
    diuresis: true,
    oxigenation: true,
  });

  const selectedPatient = useMemo(() => {
    return patients.find((p) => p.id === selectedPatientId) || null;
  }, [patients, selectedPatientId]);

  const categories = [
    { id: 'ALL', label: 'Todos os Leitos' },
    { id: 'CRITICAL', label: 'UTI & Cuidados Intensivos' },
    { id: 'CARDIOLOGY', label: 'Cardiologia & Telemetria' },
    { id: 'ONCOLOGY', label: 'Oncologia & Isolamento' },
    { id: 'GENERAL', label: 'Enfermarias Clínicas' },
  ];

  const filteredPatients = useMemo(() => {
    return patients.filter((patient) => {
      const matchesSearch =
        patient.bed.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.recordNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.chiefComplaint.toLowerCase().includes(searchQuery.toLowerCase());

      let matchesCategory = true;
      if (activeCategory === 'CRITICAL') {
        matchesCategory = patient.department.includes('UTI') || patient.triagePriority === 'EMERGENCY';
      } else if (activeCategory === 'CARDIOLOGY') {
        matchesCategory = patient.department.includes('Cardio');
      } else if (activeCategory === 'ONCOLOGY') {
        matchesCategory = patient.department.includes('Onco');
      } else if (activeCategory === 'GENERAL') {
        matchesCategory = !patient.department.includes('UTI') && !patient.department.includes('Cardio');
      }

      return matchesSearch && matchesCategory;
    });
  }, [patients, searchQuery, activeCategory]);

  const getTriageBadge = (priority: TriagePriority) => {
    switch (priority) {
      case 'EMERGENCY':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 border border-rose-200 px-2.5 py-0.5 font-mono text-[10px] font-bold text-rose-800">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-ping" />
            EMERGÊNCIA (VERMELHO)
          </span>
        );
      case 'VERY_URGENT':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 border border-orange-200 px-2.5 py-0.5 font-mono text-[10px] font-bold text-orange-800">
            MUITO URGENTE (LARANJA)
          </span>
        );
      case 'URGENT':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-200 px-2.5 py-0.5 font-mono text-[10px] font-bold text-amber-900">
            URGENTE (AMARELO)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-800">
            POUCO URGENTE (VERDE)
          </span>
        );
    }
  };

  const handleSelectPatient = (patient: NursePermittedPatient) => {
    setSelectedPatientId(patient.id);
    onLogAuditEvent('ENFERMAGEM_ACESSO_LEITO', `Leito ${patient.bed} - Prontuário ${patient.recordNumber}`, 'GRANTED');
  };

  const handleCreateNursingNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !newNoteText.trim()) return;

    const sanitized = sanitizeInput(newNoteText.trim()).sanitized;
    onAddNursingNote(selectedPatient.id, sanitized, newNoteCategory);
    setNewNoteText('');
    onLogAuditEvent(
      'REGISTRO_ANOTACAO_ENFERMAGEM',
      `Nova evolução no Leito ${selectedPatient.bed} (${newNoteCategory})`,
      'GRANTED'
    );
  };

  const handleAdminister = (rx: Prescription) => {
    if (!selectedPatient) return;
    onAdministerMedication(selectedPatient.id, rx.id, rx.medication);
    onLogAuditEvent(
      'ADMINISTRACAO_MEDICAMENTO_ENFERMAGEM',
      `Dose de ${rx.medication} checada e administrada no Leito ${selectedPatient.bed}`,
      'GRANTED'
    );
  };

  const chartData = selectedPatient?.vitalsHistory.map((v) => ({
    time: v.timestamp,
    FC: v.heartRate,
    PAS: v.systolicBP,
    PAD: v.diastolicBP,
    SpO2: v.spo2,
    Temp: v.temperature,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Top Banner for Dedicated Nurse Station */}
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20 shrink-0">
              <HeartPulse size={24} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-xl font-extrabold text-slate-900 tracking-tight">
                  Estação de Enfermagem & Gestão de Leitos
                </h1>
                <span className="rounded-full bg-emerald-600 text-white px-2.5 py-0.5 font-mono text-[11px] font-bold shadow-2xs">
                  COREN ATIVO
                </span>
                <span className="rounded-full bg-white border border-emerald-300 text-emerald-800 px-2.5 py-0.5 font-mono text-[10px] font-bold">
                  MINIMIZAÇÃO DE DADOS (LGPD)
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Visualização dedicada com entrega estrita apenas de dados assistenciais autorizados (sinais vitais, aprazamento de medicações, alergias e cuidados de enfermagem).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
            <div className="text-right">
              <div className="text-xs font-bold text-slate-800">{currentUser.name}</div>
              <div className="text-[11px] font-mono text-emerald-700 font-semibold">{currentUser.registrationNumber}</div>
            </div>
            <div className="h-9 w-9 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 font-bold text-xs">
              ENF
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW A: SELECTED BED DETAILS (PRONTUÁRIO ASSISTENCIAL DE ENFERMAGEM)      */}
      {/* ========================================================================= */}
      {selectedPatient ? (
        <div className="space-y-6">
          {/* Back Action & Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={() => setSelectedPatientId(null)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-700 transition shadow-xs"
            >
              <ArrowLeft size={16} />
              Voltar ao Censo de Leitos
            </button>

            <div className="flex items-center gap-2.5">
              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 text-xs font-bold text-emerald-800 font-mono flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" />
                Acesso Assistencial Liberado (COREN)
              </span>

              <button
                onClick={() => setVitalsModalPatient(selectedPatient)}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition shadow-md shadow-emerald-600/20 active:scale-95"
              >
                <Plus size={15} />
                Aferir Novos Sinais Vitais
              </button>
            </div>
          </div>

          {/* Bed Information Header Card */}
          <div className="hospital-card p-6 sm:p-7">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
              <div className="space-y-3 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1.5 rounded-lg bg-emerald-100 border border-emerald-200 px-3 py-1 font-mono text-xs text-emerald-900 font-bold">
                    <Bed size={14} className="text-emerald-700" />
                    {selectedPatient.bed}
                  </span>
                  <span className="rounded-lg bg-slate-100 border border-slate-200 px-3 py-1 font-mono text-xs text-slate-800 font-bold">
                    {selectedPatient.room}
                  </span>
                  <span className="rounded-lg bg-slate-100 border border-slate-200 px-3 py-1 text-xs text-slate-700 font-bold">
                    {selectedPatient.department}
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1 rounded-lg">
                    PRONTUÁRIO: {selectedPatient.recordNumber}
                  </span>
                  {getTriageBadge(selectedPatient.triagePriority)}
                </div>

                <div className="flex items-center gap-3">
                  <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    {selectedPatient.patientName}
                  </h2>
                </div>

                <p className="text-xs text-slate-500 font-medium">
                  Idade: <strong className="text-slate-800">{selectedPatient.age} anos</strong> • Gênero:{' '}
                  <strong className="text-slate-800">{selectedPatient.gender === 'M' ? 'Masculino' : 'Feminino'}</strong> • Internação:{' '}
                  <span className="font-mono text-slate-700 font-semibold">{selectedPatient.admissionDate}</span>
                </p>
              </div>

              {/* Bedside Safety Highlights (Allergies & Blood Type) */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs space-y-2.5 min-w-[300px] max-w-sm w-full">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-sans font-bold text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck size={16} className="text-emerald-600" />
                    Segurança do Paciente no Leito:
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    VERIFICADO
                  </span>
                </div>

                {/* Allergies Highlight */}
                <div className="space-y-1">
                  <span className="text-slate-500 text-[11px] block font-sans font-bold">Alergias Conhecidas:</span>
                  {selectedPatient.allergies.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedPatient.allergies.map((allergy, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 rounded-lg bg-rose-100 border border-rose-200 px-2 py-0.5 text-[11px] font-bold text-rose-800 font-sans"
                        >
                          <AlertTriangle size={12} className="text-rose-600" />
                          {allergy}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-emerald-700 font-bold text-[11px] font-sans">Sem alergias relatadas</span>
                  )}
                </div>

                <div className="flex justify-between items-center pt-1 border-t border-slate-200/70">
                  <span className="text-slate-500 font-sans">Tipo Sanguíneo:</span>
                  <span className="text-rose-700 font-bold flex items-center gap-1">
                    <Droplets size={13} />
                    {selectedPatient.bloodType}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-1 border-t border-slate-200/70">
                  <span className="text-slate-500 font-sans">Contato da Família:</span>
                  <span className="text-slate-800 font-semibold text-[11px] truncate max-w-[190px]">
                    {selectedPatient.emergencyContact}
                  </span>
                </div>
              </div>
            </div>

            {/* Motivo da Admissão (Queixa Principal) */}
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 text-xs">
              <span className="font-bold text-slate-700 block mb-0.5 font-sans">Queixa / Motivo da Admissão:</span>
              <span className="text-slate-800 italic font-medium">"{selectedPatient.chiefComplaint}"</span>
            </div>
          </div>

          {/* Navigation Pills exclusively for Nursing (NO forbidden options, NO padlock placeholders) */}
          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
            <button
              onClick={() => setActiveTab('VITALS')}
              className={`flex items-center gap-2 rounded-full py-2 px-4 text-xs font-bold transition ${
                activeTab === 'VITALS' ? 'hospital-pill-active' : 'hospital-pill-inactive'
              }`}
            >
              <Activity size={15} />
              Sinais Vitais & Telemetria
              <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.2 font-bold font-mono">
                {selectedPatient.vitalsHistory.length} aferições
              </span>
            </button>

            <button
              onClick={() => setActiveTab('MEDICATIONS')}
              className={`flex items-center gap-2 rounded-full py-2 px-4 text-xs font-bold transition ${
                activeTab === 'MEDICATIONS' ? 'hospital-pill-active' : 'hospital-pill-inactive'
              }`}
            >
              <Pill size={15} />
              Administração de Medicamentos & Aprazamento
              <span className="rounded-full bg-sky-100 text-sky-800 text-[10px] px-2 py-0.2 font-bold font-mono">
                {selectedPatient.activePrescriptions.length} prescritos
              </span>
            </button>

            <button
              onClick={() => setActiveTab('CARE_NOTES')}
              className={`flex items-center gap-2 rounded-full py-2 px-4 text-xs font-bold transition ${
                activeTab === 'CARE_NOTES' ? 'hospital-pill-active' : 'hospital-pill-inactive'
              }`}
            >
              <FileText size={15} />
              Anotações de Enfermagem & Plano de Cuidados
              <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.2 font-bold font-mono">
                {selectedPatient.nursingNotes.length} notas
              </span>
            </button>
          </div>

          {/* ================= TAB 1: SINAIS VITAIS & TELEMETRIA ================= */}
          {activeTab === 'VITALS' && (
            <div className="space-y-6">
              {/* Live ECG Waveform Banner */}
              <LiveEcgCanvas
                heartRate={selectedPatient.currentVitals.heartRate}
                isNormal={
                  selectedPatient.currentVitals.heartRate <= 100 && selectedPatient.currentVitals.heartRate >= 60
                }
              />

              {/* Current Vitals Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* FC */}
                <div className="hospital-card p-3.5">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-1">
                    <span className="flex items-center gap-1 text-rose-600">
                      <Heart size={14} /> FC
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">60-100</span>
                  </div>
                  <div className="font-mono text-2xl font-extrabold text-slate-900">
                    {selectedPatient.currentVitals.heartRate}
                    <span className="text-xs font-normal text-slate-500 ml-1">bpm</span>
                  </div>
                  <div className="mt-1 text-[10px] font-bold text-rose-600">
                    {selectedPatient.currentVitals.heartRate > 100
                      ? 'Taquicardia'
                      : selectedPatient.currentVitals.heartRate < 60
                      ? 'Bradicardia'
                      : 'Normocárdico'}
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
                    {selectedPatient.currentVitals.systolicBP}/{selectedPatient.currentVitals.diastolicBP}
                    <span className="text-xs font-normal text-slate-500 ml-1">mmHg</span>
                  </div>
                  <div className="mt-1 text-[10px] font-bold text-sky-700">
                    {selectedPatient.currentVitals.systolicBP >= 140 ? 'Pressão Elevada' : 'Normotenso'}
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
                    {selectedPatient.currentVitals.spo2}
                    <span className="text-xs font-normal text-slate-500 ml-1">%</span>
                  </div>
                  <div className="mt-1 text-[10px] font-bold text-blue-700">
                    {selectedPatient.currentVitals.spo2 < 95 ? 'Atenção: Hipóxia Leve' : 'Saturação Ideal'}
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
                    {selectedPatient.currentVitals.temperature}
                    <span className="text-xs font-normal text-slate-500 ml-1">°C</span>
                  </div>
                  <div className="mt-1 text-[10px] font-bold text-amber-700">
                    {selectedPatient.currentVitals.temperature >= 37.8 ? 'Hipertermia / Febre' : 'Afebril'}
                  </div>
                </div>

                {/* Resp Rate */}
                <div className="hospital-card p-3.5">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-1">
                    <span className="text-slate-600">FR</span>
                    <span className="text-[10px] text-slate-400 font-normal">12-20</span>
                  </div>
                  <div className="font-mono text-2xl font-extrabold text-slate-900">
                    {selectedPatient.currentVitals.respiratoryRate}
                    <span className="text-xs font-normal text-slate-500 ml-1">rpm</span>
                  </div>
                  <div className="mt-1 text-[10px] font-bold text-slate-600">
                    {selectedPatient.currentVitals.respiratoryRate > 20 ? 'Taquipneia' : 'Eupneico'}
                  </div>
                </div>

                {/* Glicemia */}
                <div className="hospital-card p-3.5">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-1">
                    <span className="flex items-center gap-1 text-teal-700">
                      <Droplets size={13} /> Glicemia
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">70-140</span>
                  </div>
                  <div className="font-mono text-2xl font-extrabold text-slate-900">
                    {selectedPatient.currentVitals.bloodGlucose}
                    <span className="text-xs font-normal text-slate-500 ml-1">mg/dL</span>
                  </div>
                  <div className="mt-1 text-[10px] font-bold text-teal-700">
                    {selectedPatient.currentVitals.bloodGlucose > 140 ? 'Glicemia Elevada' : 'Normoglicêmico'}
                  </div>
                </div>
              </div>

              {/* Vitals Trend Chart */}
              <div className="hospital-card p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Activity size={16} className="text-emerald-600" />
                      Evolução Temporal dos Sinais Vitais (Últimas Aferições)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Curva de telemetria registrada pela equipe de enfermagem de plantão
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
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderColor: '#cbd5e1',
                          borderRadius: '12px',
                          fontSize: '12px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        }}
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
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Clock size={16} className="text-emerald-600" />
                    Histórico de Aferições & Assinaturas COREN
                  </h3>
                  <button
                    onClick={() => setVitalsModalPatient(selectedPatient)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1 text-xs font-bold hover:bg-emerald-100 transition"
                  >
                    <Plus size={13} />
                    Nova Aferição
                  </button>
                </div>

                <div className="divide-y divide-slate-100 font-mono text-xs">
                  {selectedPatient.vitalsHistory.map((item) => (
                    <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          {item.timestamp}
                        </span>
                        <div className="flex flex-wrap items-center gap-3 text-slate-700">
                          <span>
                            FC: <strong className="text-rose-600">{item.heartRate}</strong>
                          </span>
                          <span>
                            PA: <strong className="text-sky-700">{item.systolicBP}/{item.diastolicBP}</strong>
                          </span>
                          <span>
                            SpO2: <strong className="text-blue-700">{item.spo2}%</strong>
                          </span>
                          <span>
                            Temp: <strong className="text-amber-700">{item.temperature}°C</strong>
                          </span>
                          <span>
                            FR: <strong>{item.respiratoryRate}</strong>
                          </span>
                          <span>
                            Glic: <strong>{item.bloodGlucose}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="text-slate-500 font-sans text-xs flex items-center gap-1.5">
                        <UserCheck size={13} className="text-emerald-600" />
                        Aferido por: <strong className="text-slate-800">{item.recordedBy}</strong>
                        <span className="text-[10px] text-emerald-700 font-mono bg-emerald-50 px-1.5 py-0.5 rounded font-bold">
                          COREN
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: CHECAGEM & ADMINISTRAÇÃO DE MEDICAMENTOS ================= */}
          {activeTab === 'MEDICATIONS' && (
            <div className="space-y-6">
              <div className="hospital-card p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
                      <Pill size={18} className="text-sky-600" />
                      Aprazamento & Administração de Medicamentos no Leito
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Medicações ativas para verificação de via, dosagem e registro de checagem da enfermagem
                    </p>
                  </div>

                  <span className="rounded-full bg-sky-50 border border-sky-200 px-3 py-1 font-mono text-xs font-bold text-sky-800 self-start sm:self-auto">
                    {selectedPatient.activePrescriptions.length} Medicamentos Ativos
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  {selectedPatient.activePrescriptions.map((rx) => {
                    const isAdministered = selectedPatient.medicationAdministrations?.some(
                      (adm) => adm.prescriptionId === rx.id
                    );
                    const lastAdm = selectedPatient.medicationAdministrations?.find(
                      (adm) => adm.prescriptionId === rx.id
                    );

                    return (
                      <div
                        key={rx.id}
                        className={`rounded-2xl border p-4.5 transition ${
                          isAdministered
                            ? 'border-emerald-200 bg-emerald-50/40'
                            : 'border-slate-200 bg-white hover:border-sky-300'
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-1.5 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-display text-base font-bold text-slate-900">
                                {rx.medication}
                              </span>
                              <span className="rounded-full bg-sky-100 border border-sky-200 px-2.5 py-0.5 text-xs font-bold font-mono text-sky-800">
                                {rx.dosage}
                              </span>
                              <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                                Via: {rx.route}
                              </span>
                              <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                                Frequência: {rx.frequency}
                              </span>
                            </div>

                            <p className="text-xs text-slate-500">
                              Prescrito por: <strong className="text-slate-700">{rx.prescribedBy}</strong> em{' '}
                              <span className="font-mono">{rx.prescribedDate}</span>
                            </p>

                            {isAdministered && lastAdm && (
                              <div className="text-xs text-emerald-800 font-semibold flex items-center gap-1.5 pt-1">
                                <CheckCircle2 size={14} className="text-emerald-600" />
                                Dose checada e administrada às <span className="font-mono">{lastAdm.administeredAt}</span> por{' '}
                                <strong>{lastAdm.administeredBy}</strong> ({lastAdm.administeredByCoren})
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {isAdministered ? (
                              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 border border-emerald-300 px-3.5 py-1.5 text-xs font-bold text-emerald-800">
                                <Check size={14} className="text-emerald-700" />
                                Checado & Administrado
                              </div>
                            ) : (
                              <button
                                onClick={() => handleAdminister(rx)}
                                className="inline-flex items-center gap-2 rounded-full bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 text-xs font-bold transition shadow-xs active:scale-95"
                              >
                                <Syringe size={14} />
                                Checar / Registrar Administração
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 3: ANOTAÇÕES DE ENFERMAGEM & CUIDADOS ================= */}
          {activeTab === 'CARE_NOTES' && (
            <div className="space-y-6">
              {/* Quick Bedside Checklist */}
              <div className="hospital-card p-6">
                <h3 className="font-display text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <ClipboardCheck size={18} className="text-emerald-600" />
                  Plano Assistencial & Checklist de Cuidados de Leito
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Marque as intervenções executadas no plantão para rastreabilidade assistencial
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/70 cursor-pointer transition">
                    <input
                      type="checkbox"
                      checked={careChecklist.decubitus}
                      onChange={(e) => setCareChecklist((prev) => ({ ...prev, decubitus: e.target.checked }))}
                      className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-800 block">Mudança de Decúbito (2/2h)</span>
                      <span className="text-slate-500 text-[11px]">Prevenção de lesões por pressão</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/70 cursor-pointer transition">
                    <input
                      type="checkbox"
                      checked={careChecklist.ivAccess}
                      onChange={(e) => setCareChecklist((prev) => ({ ...prev, ivAccess: e.target.checked }))}
                      className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-800 block">Inspeção de Acesso Venoso</span>
                      <span className="text-slate-500 text-[11px]">Pérvio, sem sinais flogísticos</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/70 cursor-pointer transition">
                    <input
                      type="checkbox"
                      checked={careChecklist.diuresis}
                      onChange={(e) => setCareChecklist((prev) => ({ ...prev, diuresis: e.target.checked }))}
                      className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-800 block">Controle de Diurese</span>
                      <span className="text-slate-500 text-[11px]">Balanço hídrico verificado</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/70 cursor-pointer transition">
                    <input
                      type="checkbox"
                      checked={careChecklist.oxigenation}
                      onChange={(e) => setCareChecklist((prev) => ({ ...prev, oxigenation: e.target.checked }))}
                      className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-800 block">Vigilância Respiratória</span>
                      <span className="text-slate-500 text-[11px]">Cateter / Máscara posicionada</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/70 cursor-pointer transition">
                    <input
                      type="checkbox"
                      checked={careChecklist.dressings}
                      onChange={(e) => setCareChecklist((prev) => ({ ...prev, dressings: e.target.checked }))}
                      className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-800 block">Curativo Cirúrgico</span>
                      <span className="text-slate-500 text-[11px]">Limpo, seco e oclusivo</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Form to Add New Nursing Note */}
              <div className="hospital-card p-6">
                <h3 className="font-display text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <FileText size={18} className="text-emerald-600" />
                  Nova Anotação de Enfermagem (Evolução / Intercorrências)
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Registro oficial assinado com sua credencial COREN
                </p>

                <form onSubmit={handleCreateNursingNote} className="space-y-3.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-bold text-slate-700">Categoria:</span>
                    {(['EVOLUCAO', 'CURATIVO', 'INTERCORRENCIA', 'MEDICACAO', 'GERAL'] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setNewNoteCategory(cat)}
                        className={`rounded-full px-3 py-1 font-bold text-xs transition ${
                          newNoteCategory === cat
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {cat === 'EVOLUCAO'
                          ? 'Evolução de Leito'
                          : cat === 'CURATIVO'
                          ? 'Curativo'
                          : cat === 'INTERCORRENCIA'
                          ? 'Intercorrência'
                          : cat === 'MEDICACAO'
                          ? 'Medicação'
                          : 'Geral'}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={3}
                    required
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="Descreva a evolução assistencial, queixas do paciente, intercorrências ou cuidados prestados..."
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50/60 p-3.5 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none transition"
                  />

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-slate-500">
                      Assinando como: <strong className="text-slate-800">{currentUser.name}</strong> ({currentUser.registrationNumber})
                    </span>

                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition shadow-md shadow-emerald-600/20 active:scale-95"
                    >
                      <Send size={14} />
                      Salvar Anotação (COREN)
                    </button>
                  </div>
                </form>
              </div>

              {/* Feed of Nursing Notes */}
              <div className="hospital-card p-6">
                <h3 className="font-display text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Clock size={18} className="text-emerald-600" />
                  Histórico de Anotações da Equipe de Enfermagem
                </h3>

                <div className="space-y-3">
                  {selectedPatient.nursingNotes.map((note) => (
                    <div key={note.id} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-800">
                            {note.category}
                          </span>
                          <span className="font-mono text-xs text-slate-500">{note.timestamp}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                          <UserCheck size={13} className="text-emerald-600" />
                          <span>{note.authorName}</span>
                          <span className="font-mono text-[11px] text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded font-bold">
                            {note.authorCoren}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-800 whitespace-pre-line leading-relaxed">{note.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* VIEW B: BED CENSUS & OVERVIEW (CENSO DE LEITOS DA ENFERMAGEM)             */
        /* ========================================================================= */
        <div className="space-y-6">
          {/* Filter Pills & Search Box */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
              {categories.map((cat) => {
                const isSelected = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`rounded-full px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
                      isSelected ? 'hospital-pill-active' : 'hospital-pill-inactive'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            <div className="relative min-w-[280px] sm:min-w-[340px]">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                <Search size={16} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar leito, paciente ou setor..."
                className="w-full rounded-full border border-slate-300 bg-white py-2.5 pl-11 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none shadow-xs transition"
              />
            </div>
          </div>

          {/* Active Beds Counter */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Censo de Leitos & Telemetria em Tempo Real
              </h2>
              <p className="text-xs text-slate-500">
                Selecione um leito para abrir o painel de cuidados e aprazamento de enfermagem
              </p>
            </div>

            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800 font-mono">
              {filteredPatients.length} Leitos Sob Cuidados
            </span>
          </div>

          {/* Grid of Bed Cards for Nurses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPatients.map((patient) => {
              const hasAllergies = patient.allergies.length > 0;

              return (
                <div
                  key={patient.id}
                  className="hospital-card p-5 cursor-pointer hover:border-emerald-400 transition-all group"
                  onClick={() => handleSelectPatient(patient)}
                >
                  {/* Top row: Bed and Priority */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1.5 rounded-lg bg-emerald-100 border border-emerald-200 px-2.5 py-1 font-mono text-xs text-emerald-950 font-bold">
                        <Bed size={14} className="text-emerald-700" />
                        {patient.bed}
                      </span>
                      <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                        {patient.room}
                      </span>
                      <span className="font-mono text-xs text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                        {patient.recordNumber}
                      </span>
                    </div>

                    <div>{getTriageBadge(patient.triagePriority)}</div>
                  </div>

                  {/* Patient Name */}
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <h3 className="font-display text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition">
                      {patient.patientName}
                    </h3>
                    <span className="text-[11px] font-mono text-slate-500 font-medium">
                      {patient.age} anos ({patient.gender === 'M' ? 'Masc' : 'Fem'})
                    </span>
                  </div>

                  {/* Bedside Safety Row: Allergies & Blood Type */}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {hasAllergies ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 border border-rose-200 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                        <AlertTriangle size={12} />
                        Alergia: {patient.allergies.join(', ')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        Sem alergias
                      </span>
                    )}

                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-mono text-slate-700 font-bold">
                      <Droplets size={11} className="text-rose-600" />
                      {patient.bloodType}
                    </span>

                    <span className="text-[11px] text-slate-500">• {patient.department}</span>
                  </div>

                  {/* Chief complaint */}
                  <p className="mt-2.5 text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                    "{patient.chiefComplaint}"
                  </p>

                  {/* Live Vitals Telemetry Row */}
                  <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3 text-xs font-mono">
                      <div className="flex items-center gap-1 text-rose-600 font-bold" title="Frequência Cardíaca">
                        <Heart size={14} className="text-rose-500" />
                        <span>{patient.currentVitals.heartRate}</span>
                        <span className="text-[10px] text-slate-400 font-normal">bpm</span>
                      </div>
                      <div className="flex items-center gap-1 text-sky-700 font-bold" title="Pressão Arterial">
                        <Activity size={14} className="text-sky-600" />
                        <span>{patient.currentVitals.systolicBP}/{patient.currentVitals.diastolicBP}</span>
                      </div>
                      <div className="flex items-center gap-1 text-blue-700 font-bold" title="SpO2">
                        <Wind size={14} className="text-blue-500" />
                        <span>{patient.currentVitals.spo2}%</span>
                      </div>
                      <div className="flex items-center gap-1 text-amber-700 font-bold" title="Temperatura">
                        <Thermometer size={14} className="text-amber-500" />
                        <span>{patient.currentVitals.temperature}°C</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setVitalsModalPatient(patient);
                        }}
                        className="rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1 text-xs font-bold transition"
                        title="Aferir novos sinais vitais"
                      >
                        + Sinais
                      </button>

                      <div className="flex items-center gap-1 text-xs font-bold text-emerald-700 group-hover:text-emerald-800 transition">
                        <span>Cuidados</span>
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredPatients.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-xs">
              <Bed size={36} className="mx-auto mb-2 text-slate-400" />
              <p className="text-base font-bold text-slate-800">Nenhum leito encontrado</p>
              <p className="text-xs text-slate-500 mt-1">Verifique o filtro de setor ou termo digitado na busca.</p>
            </div>
          )}
        </div>
      )}

      {/* Vitals Modal for Quick Bedside Measurement */}
      {vitalsModalPatient && (
        <VitalsModal
          currentUser={currentUser}
          patientName={vitalsModalPatient.patientName}
          onSaveVitals={(vitals) => {
            onSaveNewVitals(vitalsModalPatient.id, vitals);
            onLogAuditEvent(
              'REGISTRO_SINAIS_VITAIS_ENFERMAGEM',
              `Aferição no Leito ${vitalsModalPatient.bed}: FC ${vitals.heartRate}, PA ${vitals.systolicBP}/${vitals.diastolicBP}`,
              'GRANTED'
            );
            setVitalsModalPatient(null);
          }}
          onClose={() => setVitalsModalPatient(null)}
        />
      )}
    </div>
  );
};
