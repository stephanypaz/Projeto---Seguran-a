import React, { useState, useMemo } from 'react';
import {
  Search,
  Activity,
  Heart,
  Thermometer,
  Wind,
  Bed,
  ChevronRight,
  AlertCircle,
  Stethoscope,
} from 'lucide-react';
import { Patient, User, NdaState, TriagePriority } from '../types';
import { maskSensitiveData, isUserAuthorizedForPII } from '../utils/security';

interface PatientListProps {
  patients: Patient[];
  selectedPatientId: string | null;
  onSelectPatient: (patientId: string) => void;
  currentUser: User;
  ndaState: NdaState;
  onOpenNdaModal: () => void;
}

export const PatientList: React.FC<PatientListProps> = ({
  patients,
  selectedPatientId,
  onSelectPatient,
  currentUser,
  ndaState,
  onOpenNdaModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  const isDoctor = currentUser.role === 'DOCTOR' || currentUser.role === 'SECURITY_AUDITOR';
  const isAuthorized = isUserAuthorizedForPII(currentUser.role, ndaState.isSigned);

  const categories = [
    { id: 'ALL', label: 'Todos os Serviços' },
    { id: 'CRITICAL', label: 'UTI & Cuidados Críticos' },
    { id: 'CARDIOLOGY', label: 'Cardiologia & ECG' },
    { id: 'GENERAL', label: 'Clínica Médica' },
    { id: 'NURSING', label: 'Sinais Vitais & Enfermagem' },
  ];

  const filteredPatients = useMemo(() => {
    return patients.filter((patient) => {
      const nameMasked = maskSensitiveData(patient.pii.fullName, isAuthorized, 'NAME');
      const matchesSearch =
        patient.recordNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.bed.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.pii.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        nameMasked.display.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.clinicalDiagnosis.primaryCID.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.clinicalDiagnosis.cidDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.chiefComplaint.toLowerCase().includes(searchQuery.toLowerCase());

      let matchesCategory = true;
      if (activeCategory === 'CRITICAL') {
        matchesCategory = patient.department.includes('UTI') || patient.triagePriority === 'EMERGENCY';
      } else if (activeCategory === 'CARDIOLOGY') {
        matchesCategory = patient.department.includes('Cardio') || patient.chiefComplaint.toLowerCase().includes('dor');
      } else if (activeCategory === 'GENERAL') {
        matchesCategory = patient.department.includes('Médica') || patient.department.includes('Geral');
      } else if (activeCategory === 'NURSING') {
        matchesCategory = true; // All patients require vitals
      }

      return matchesSearch && matchesCategory;
    });
  }, [patients, searchQuery, activeCategory, isAuthorized]);

  const getTriageBadge = (priority: TriagePriority) => {
    switch (priority) {
      case 'EMERGENCY':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 font-mono text-[10px] font-bold text-rose-700">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
            EMERGÊNCIA (VERMELHO)
          </span>
        );
      case 'VERY_URGENT':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 border border-orange-200 px-2.5 py-0.5 font-mono text-[10px] font-bold text-orange-700">
            MUITO URGENTE (LARANJA)
          </span>
        );
      case 'URGENT':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 font-mono text-[10px] font-bold text-amber-800">
            URGENTE (AMARELO)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-700">
            POUCO URGENTE (VERDE)
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Category Pills & Search Filter Row (Matching the clean clinical search style) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
          {categories.map((cat) => {
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`rounded-full px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
                  isSelected
                    ? 'hospital-pill-active'
                    : 'hospital-pill-inactive'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Search input with dark pill button style from the image */}
        <div className="relative min-w-[280px] sm:min-w-[340px]">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar serviço, leito ou paciente..."
            className="w-full rounded-full border border-slate-300 bg-white py-2.5 pl-11 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none shadow-xs transition"
          />
        </div>
      </div>

      {/* Live Inpatient Census & Patient Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Prontuários de Pacientes Internados
            </h2>
            <p className="text-xs text-slate-500">
              Selecione um leito para abrir o prontuário eletrônico completo
            </p>
          </div>
          <span className="rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-bold text-slate-700">
            {filteredPatients.length} Leitos Ativos
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPatients.map((patient) => {
            const isSelected = selectedPatientId === patient.id;
            const maskedName = maskSensitiveData(patient.pii.fullName, isAuthorized, 'NAME');
            const maskedCpf = maskSensitiveData(patient.pii.cpf, isAuthorized, 'CPF');

            return (
              <div
                key={patient.id}
                onClick={() => onSelectPatient(patient.id)}
                className={`hospital-card p-5 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-sky-500 ring-2 ring-sky-100 shadow-md'
                    : ''
                }`}
              >
                <div>
                  {/* Top row with record badge and bed */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-lg">
                        {patient.recordNumber}
                      </span>
                      <span className="flex items-center gap-1 rounded-lg bg-slate-100 border border-slate-200 px-2.5 py-1 font-mono text-xs text-slate-700 font-bold">
                        <Bed size={13} className="text-sky-600" />
                        {patient.bed}
                      </span>
                      {isDoctor && (
                        <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-700">
                          CID: {patient.clinicalDiagnosis.primaryCID}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {getTriageBadge(patient.triagePriority)}
                      <span className="text-[11px] font-mono text-slate-500 font-medium">
                        {patient.room}
                      </span>
                    </div>
                  </div>

                  {/* Patient Name */}
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <h3 className="font-display text-lg font-bold text-slate-900 hover:text-sky-600 transition">
                      {maskedName.display}
                    </h3>
                    {isDoctor && (
                      <span className="text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full font-mono shrink-0">
                        CRM AUTORIZADO
                      </span>
                    )}
                  </div>

                  {/* Demographic info */}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 font-medium">
                    <span>
                      Idade: <strong className="text-slate-700">{patient.age} anos</strong> ({patient.gender === 'M' ? 'Masc' : 'Fem'})
                    </span>
                    <span>•</span>
                    <span>
                      CPF: <span className="font-mono text-slate-700">{maskedCpf.display}</span>
                    </span>
                    <span>•</span>
                    <span className="text-sky-700 font-semibold">{patient.department}</span>
                  </div>

                  {/* Doctor vs Nurse Clinical Preview */}
                  {isDoctor ? (
                    <div className="mt-3 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <Stethoscope size={13} className="text-sky-600" />
                        <span>{patient.clinicalDiagnosis.cidDescription}</span>
                      </div>
                      <p className="text-slate-600 italic text-[11px]">
                        "{patient.chiefComplaint}"
                      </p>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                      "{patient.chiefComplaint}"
                    </p>
                  )}
                </div>

                {/* Vitals Telemetry Row */}
                <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3.5 text-xs font-mono">
                    <div className="flex items-center gap-1.5 text-rose-600 font-bold" title="Frequência Cardíaca">
                      <Heart size={14} className="text-rose-500" />
                      <span>{patient.currentVitals.heartRate}</span>
                      <span className="text-[10px] text-slate-400 font-normal">bpm</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sky-700 font-bold" title="Pressão Arterial">
                      <Activity size={14} className="text-sky-600" />
                      <span>{patient.currentVitals.systolicBP}/{patient.currentVitals.diastolicBP}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-blue-700 font-bold" title="SpO2">
                      <Wind size={14} className="text-blue-500" />
                      <span>{patient.currentVitals.spo2}%</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-amber-700 font-bold" title="Temperatura">
                      <Thermometer size={14} className="text-amber-500" />
                      <span>{patient.currentVitals.temperature}°C</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-700 transition">
                    <span>Ver Prontuário</span>
                    <ChevronRight size={16} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredPatients.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-xs">
            <AlertCircle size={36} className="mx-auto mb-2 text-slate-400" />
            <p className="text-base font-bold text-slate-800">Nenhum leito ou serviço encontrado</p>
            <p className="text-xs text-slate-500 mt-1">Ajuste os filtros de pesquisa ou limpe as categorias.</p>
          </div>
        )}
      </div>
    </div>
  );
};
