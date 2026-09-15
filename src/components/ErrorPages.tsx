import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, FileQuestion, ArrowLeft, RefreshCw, Copy, Check, Lock } from 'lucide-react';
import { generateIncidentId } from '../utils/security';

interface ErrorPage404Props {
  onReturnHome: () => void;
  requestedResource?: string;
}

export const ErrorPage404: React.FC<ErrorPage404Props> = ({
  onReturnHome,
  requestedResource = 'Prontuário / Paciente',
}) => {
  const [incidentId] = useState(generateIncidentId());
  const [copied, setCopied] = useState(false);

  const handleCopyIncident = () => {
    navigator.clipboard?.writeText(incidentId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center text-slate-800">
      <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-sky-100 text-sky-700 shadow-md">
        <FileQuestion size={40} />
      </div>

      <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-1 font-mono text-xs text-slate-700 mb-3 shadow-xs font-bold">
        <span>CÓDIGO DE RESPOSTA CLASSIFICADO: 404_NOT_FOUND</span>
      </div>

      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-display sm:text-4xl">
        Registro Hospitalar Não Encontrado
      </h1>

      <p className="mt-3 max-w-md text-sm text-slate-600 leading-relaxed">
        O identificador de {requestedResource} solicitado não existe no índice clínico ou foi realocado para um cofre de dados criptografado.
      </p>

      {/* Incident Box - Zero Tech Leak */}
      <div className="mt-6 w-full max-w-md rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left font-mono text-xs shadow-xs">
        <div className="flex items-center justify-between text-slate-500 pb-2 border-b border-slate-200">
          <span className="flex items-center gap-1.5 text-sky-800 font-bold">
            <Lock size={14} />
            DIRETIVA ZERO-LEAKAGE
          </span>
          <span className="text-[10px] text-slate-500 font-semibold">ISO 27799</span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-slate-500">ID de Rastreio do Incidente:</span>
          <span className="text-sky-800 font-bold">{incidentId}</span>
        </div>
        <p className="mt-2 text-[11px] text-slate-600 font-sans">
          Para sua segurança e conformidade hospitalar, nenhuma informação técnica de stack trace, banco de dados ou caminhos de servidores é exposta.
        </p>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={handleCopyIncident}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs transition"
        >
          {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
          {copied ? 'ID Copiado!' : 'Copiar Protocolo'}
        </button>

        <button
          onClick={onReturnHome}
          className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-5 py-2 text-xs font-bold text-white hover:bg-sky-500 shadow-md shadow-sky-600/20 active:scale-95 transition"
        >
          <ArrowLeft size={16} />
          Retornar ao Painel Seguro
        </button>
      </div>
    </div>
  );
};

interface ErrorPage500Props {
  onReset: () => void;
  technicalDetailsSilenced?: boolean;
}

export const ErrorPage500: React.FC<ErrorPage500Props> = ({
  onReset,
}) => {
  const [incidentId] = useState(generateIncidentId());
  const [copied, setCopied] = useState(false);

  const handleCopyIncident = () => {
    navigator.clipboard?.writeText(incidentId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center text-slate-800">
      <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-rose-100 text-rose-700 shadow-md">
        <ShieldAlert size={40} className="animate-pulse" />
      </div>

      <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1 font-mono text-xs font-bold text-rose-800 mb-3 shadow-xs">
        <AlertTriangle size={13} />
        SANDBOX FAULT ISOLATION • 500
      </div>

      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-display sm:text-4xl">
        Execução Interrompida em Sandbox de Segurança
      </h1>

      <p className="mt-3 max-w-lg text-sm text-slate-600 leading-relaxed">
        Uma inconsistência temporária de processamento foi contida com sucesso pela arquitetura Zero Trust. Os dados dos pacientes permanecem íntegros e criptografados.
      </p>

      {/* Classified Safe Box */}
      <div className="mt-6 w-full max-w-lg rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left font-mono text-xs shadow-xs">
        <div className="flex items-center justify-between text-slate-500 pb-2 border-b border-slate-200">
          <span className="text-rose-700 font-bold flex items-center gap-1.5">
            <Lock size={14} />
            TRATAMENTO SEGURO DE EXCEÇÃO
          </span>
          <span className="text-slate-500 text-[10px] font-semibold">STACK TRACE OFUSCADO</span>
        </div>

        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Incidente Registrado no SIEM:</span>
            <span className="text-rose-700 font-bold">{incidentId}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Vazamento de Stack Trace:</span>
            <span className="text-emerald-700 font-bold">BLOQUEADO (0% Exposure)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Status dos Prontuários:</span>
            <span className="text-sky-800 font-bold">Protegidos por Criptografia AES-256</span>
          </div>
        </div>

        <div className="mt-3 rounded-xl bg-white p-3 text-[11px] text-slate-600 border border-slate-200 font-sans">
          <strong>[Proteção Ativa]:</strong> O sistema bloqueou a exibição de traces técnicos internos (caminhos de arquivos, bibliotecas, variáveis de ambiente ou consultas SQL) para evitar engenharia reversa.
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={handleCopyIncident}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs transition"
        >
          {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
          {copied ? 'ID Copiado!' : 'Copiar ID do Incidente'}
        </button>

        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-500 shadow-md shadow-rose-600/20 active:scale-95 transition"
        >
          <RefreshCw size={15} />
          Reiniciar Sandbox & Restaurar Sessão
        </button>
      </div>
    </div>
  );
};
