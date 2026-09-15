import React, { useState } from 'react';
import { Activity, Heart, Thermometer, Droplets, Wind, Plus, X, AlertTriangle, CheckCircle2, Shield } from 'lucide-react';
import { User, VitalsMeasurement } from '../types';
import { sanitizeInput } from '../utils/security';

interface VitalsModalProps {
  currentUser: User;
  patientName: string;
  onSaveVitals: (vitals: VitalsMeasurement) => void;
  onClose: () => void;
}

export const VitalsModal: React.FC<VitalsModalProps> = ({
  currentUser,
  patientName,
  onSaveVitals,
  onClose,
}) => {
  const [heartRate, setHeartRate] = useState<number>(75);
  const [systolicBP, setSystolicBP] = useState<number>(120);
  const [diastolicBP, setDiastolicBP] = useState<number>(80);
  const [spo2, setSpo2] = useState<number>(98);
  const [temperature, setTemperature] = useState<number>(36.5);
  const [respiratoryRate, setRespiratoryRate] = useState<number>(16);
  const [bloodGlucose, setBloodGlucose] = useState<number>(100);
  const [glasgowScale, setGlasgowScale] = useState<number>(15);
  const [notes, setNotes] = useState<string>('');

  // Live sanitization preview for XSS protection showcase
  const scanResult = sanitizeInput(notes);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newMeasurement: VitalsMeasurement = {
      id: `vit_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      heartRate: Number(heartRate),
      systolicBP: Number(systolicBP),
      diastolicBP: Number(diastolicBP),
      spo2: Number(spo2),
      temperature: Number(temperature),
      respiratoryRate: Number(respiratoryRate),
      bloodGlucose: Number(bloodGlucose),
      glasgowScale: Number(glasgowScale),
      recordedBy: currentUser.name,
      recordedByRole: currentUser.role,
      clinicalNotes: scanResult.sanitized,
    };

    onSaveVitals(newMeasurement);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-5">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 shadow-xs">
              <Activity size={22} />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Registrar Aferição de Sinais Vitais
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Paciente: <span className="text-sky-800 font-bold">{patientName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="max-h-[75vh] overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Heart Rate */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
              <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1 mb-1">
                <Heart size={13} className="text-rose-600" />
                Freq. Cardíaca
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={30}
                  max={250}
                  required
                  value={heartRate}
                  onChange={(e) => setHeartRate(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 bg-white p-1.5 font-mono text-sm font-bold text-slate-900 focus:outline-none focus:border-rose-500"
                />
                <span className="text-[10px] text-slate-500 font-semibold">bpm</span>
              </div>
            </div>

            {/* Blood Pressure (PA) */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
              <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1 mb-1">
                <Activity size={13} className="text-sky-700" />
                Pressão Arterial
              </label>
              <div className="flex items-center gap-1 font-mono text-sm">
                <input
                  type="number"
                  min={50}
                  max={250}
                  required
                  value={systolicBP}
                  onChange={(e) => setSystolicBP(Number(e.target.value))}
                  className="w-12 rounded-lg border border-slate-300 bg-white p-1.5 text-center font-bold text-slate-900 focus:outline-none focus:border-sky-500"
                />
                <span className="text-slate-400 font-bold">/</span>
                <input
                  type="number"
                  min={30}
                  max={150}
                  required
                  value={diastolicBP}
                  onChange={(e) => setDiastolicBP(Number(e.target.value))}
                  className="w-12 rounded-lg border border-slate-300 bg-white p-1.5 text-center font-bold text-slate-900 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* SpO2 */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
              <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1 mb-1">
                <Wind size={13} className="text-blue-700" />
                Saturação O₂
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={50}
                  max={100}
                  required
                  value={spo2}
                  onChange={(e) => setSpo2(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 bg-white p-1.5 font-mono text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                />
                <span className="text-[10px] text-slate-500 font-semibold">%</span>
              </div>
            </div>

            {/* Temperature */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
              <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1 mb-1">
                <Thermometer size={13} className="text-amber-700" />
                Temperatura
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.1"
                  min={30}
                  max={44}
                  required
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 bg-white p-1.5 font-mono text-sm font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                />
                <span className="text-[10px] text-slate-500 font-semibold">°C</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Resp Rate */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Freq. Respiratória
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={6}
                  max={60}
                  value={respiratoryRate}
                  onChange={(e) => setRespiratoryRate(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 bg-white p-1.5 font-mono text-sm font-bold text-slate-900 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 font-semibold">rpm</span>
              </div>
            </div>

            {/* Glucose */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Glicemia Capilar
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={20}
                  max={600}
                  value={bloodGlucose}
                  onChange={(e) => setBloodGlucose(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 bg-white p-1.5 font-mono text-sm font-bold text-slate-900 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 font-semibold">mg/dL</span>
              </div>
            </div>

            {/* Glasgow */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Escala de Glasgow
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={3}
                  max={15}
                  value={glasgowScale}
                  onChange={(e) => setGlasgowScale(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 bg-white p-1.5 font-mono text-sm font-bold text-slate-900 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 font-semibold">/ 15</span>
              </div>
            </div>
          </div>

          {/* Clinical Notes with live XSS Sanitization Filter */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Shield size={14} className="text-sky-600" />
                Observações de Enfermagem / Evolução Clínica (Protegido por Sanitizer XSS):
              </label>
              {!scanResult.isClean && (
                <span className="text-[10px] text-rose-600 font-mono font-bold">
                  ⚠️ Script Malicioso Filtrado
                </span>
              )}
            </div>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Paciente orientado, eupneico. Acesso venoso pérvio em MSD..."
              className="w-full rounded-2xl border border-slate-300 bg-white p-3.5 text-xs text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none"
            />
          </div>

          {/* Operator confirmation */}
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3.5 font-mono text-[11px]">
            <span className="text-slate-500">Registrado por:</span>
            <span className="text-sky-800 font-bold">{currentUser.name} ({currentUser.registrationNumber})</span>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-5 py-2 text-xs font-bold text-white hover:bg-sky-500 transition shadow-md shadow-sky-600/20 active:scale-95"
            >
              <CheckCircle2 size={15} />
              Confirmar & Salvar Aferição
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
