import React, { useState } from 'react';
import { ShieldAlert, Lock, FileKey, AlertTriangle, CheckCircle2, ChevronRight, UserX } from 'lucide-react';
import { User } from '../types';

interface RoleRestrictedNoticeProps {
  currentUser: User;
  restrictedSectionTitle: string;
  requiredClearance?: string;
  onRequestElevation?: (reason: string) => void;
}

export const RoleRestrictedNotice: React.FC<RoleRestrictedNoticeProps> = ({
  currentUser,
  restrictedSectionTitle,
  requiredClearance = 'LEVEL_4_FULL_CLINICAL (Médico Titular)',
  onRequestElevation,
}) => {
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [justification, setJustification] = useState('');
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!justification.trim()) return;
    if (onRequestElevation) {
      onRequestElevation(justification);
    }
    setRequestSubmitted(true);
  };

  return (
    <div className="hospital-card p-8 border-amber-200 bg-amber-50/40 text-center relative overflow-hidden">
      <div className="max-w-2xl mx-auto">
        {/* Classified Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-100 px-4 py-1.5 text-xs font-mono font-bold text-amber-800">
          <ShieldAlert size={14} className="text-amber-700" />
          ACESSO RESTRITO • RBAC NIST 800-53 / LGPD ART. 11
        </div>

        <h3 className="mt-4 text-xl font-bold text-slate-900 font-display sm:text-2xl">
          Acesso Restrito: {restrictedSectionTitle}
        </h3>

        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          O operador logado (<strong className="text-amber-800">{currentUser.roleTitle}</strong> - {currentUser.registrationNumber}) possui perfil <span className="font-mono text-sky-800 font-bold">{currentUser.clearanceLevel}</span>.
        </p>

        <div className="mt-5 rounded-2xl border border-amber-200 bg-white p-5 text-left font-mono text-xs text-slate-600 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2.5 text-slate-800 font-bold">
            <span>DIRETRIZ DE SEGURANÇA HOSPITALAR:</span>
            <span className="text-amber-700">ISOLAMENTO ATIVO</span>
          </div>
          <p className="text-slate-700">
            • <strong className="text-emerald-700 font-bold">Enfermeiros:</strong> Autorizados estritamente para monitoramento, triagem e registro de <span className="text-emerald-800 font-bold">Sinais Vitais</span>.
          </p>
          <p className="mt-1.5 text-slate-700">
            • <strong className="text-sky-700 font-bold">Médicos (CRM):</strong> Exigido para acesso a Diagnósticos Clínicos (CID-10), Prescrições Controladas e Histórico Médico.
          </p>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
            <span>Zero Information Leakage: Nenhum dado confidencial exposto</span>
            <span className="font-bold text-slate-700">Credencial Exigida: {requiredClearance}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          {!requestSubmitted ? (
            <button
              onClick={() => setShowRequestForm(!showRequestForm)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition shadow-xs"
            >
              <FileKey size={15} className="text-amber-600" />
              {showRequestForm ? 'Ocultar Justificativa' : 'Solicitar Quebra de Emergência (Break-Glass)'}
            </button>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-100 px-5 py-2 text-xs font-bold text-emerald-800">
              <CheckCircle2 size={16} className="text-emerald-700" />
              Solicitação protocolada no SIEM de Segurança para auditoria do CISO.
            </div>
          )}
        </div>

        {/* Break-glass justification form */}
        {showRequestForm && !requestSubmitted && (
          <form onSubmit={handleSubmitRequest} className="mt-5 rounded-2xl border border-amber-200 bg-white p-5 text-left shadow-md">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800 mb-2">
              <AlertTriangle size={15} className="text-amber-600" />
              Protocolo de Auditoria Break-Glass (Acesso Emergencial Temporário)
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Todas as solicitações de elevação de privilégio são assinadas digitalmente e gravadas em log imutável conforme regulação HIPAA/LGPD.
            </p>
            <textarea
              required
              rows={3}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Descreva a urgência clínica / justificativa para auditoria imediata..."
              className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-xs text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:outline-none"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRequestForm(false)}
                className="rounded-full px-4 py-1.5 text-xs text-slate-500 hover:text-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-full bg-amber-600 px-5 py-2 text-xs font-bold text-white hover:bg-amber-500 shadow-sm"
              >
                Enviar Protocolo com Hash
                <ChevronRight size={14} />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
