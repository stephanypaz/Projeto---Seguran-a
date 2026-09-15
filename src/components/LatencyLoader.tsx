import React, { useEffect, useState } from 'react';
import { Loader2, ShieldCheck, Activity, AlertCircle, CheckCircle2 } from 'lucide-react';

interface LatencyLoaderProps {
  isLoading: boolean;
  operationName?: string;
  durationMs?: number;
  onComplete?: () => void;
}

export const LatencyLoader: React.FC<LatencyLoaderProps> = ({
  isLoading,
  operationName = 'Processamento Criptográfico em Sandbox',
  durationMs = 2500,
  onComplete,
}) => {
  const [progress, setProgress] = useState(0);
  const [stageText, setStageText] = useState('Iniciando handshake Zero Trust...');

  useEffect(() => {
    if (!isLoading) {
      setProgress(0);
      return;
    }

    const intervalTime = 50;
    const increment = 100 / (durationMs / intervalTime);

    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment;
        if (next >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            if (onComplete) onComplete();
          }, 200);
          return 100;
        }

        if (next > 75) {
          setStageText('Validando assinatura digital & integridade...');
        } else if (next > 45) {
          setStageText('Inspecionando payload no Sandbox isolado...');
        } else if (next > 20) {
          setStageText('Criptografando canal TLS 1.3 com chaves efêmeras...');
        }
        return next;
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [isLoading, durationMs, onComplete]);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-2xl">
        {/* Animated radar/spinner */}
        <div className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-sky-100 text-sky-700 shadow-md">
          <Loader2 size={36} className="animate-spin text-sky-600" />
          <ShieldCheck size={18} className="absolute text-emerald-600" />
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3.5 py-1 font-mono text-[11px] font-bold text-sky-800 mb-2">
          <Activity size={12} className="animate-pulse text-sky-600" />
          ALERTA DE SEGURANÇA & LATÊNCIA CONTROLADA
        </div>

        <h3 className="text-base font-bold text-slate-900 font-display">
          {operationName}
        </h3>

        <p className="mt-1 text-xs text-slate-500 font-medium">
          {stageText}
        </p>

        {/* Progress Bar */}
        <div className="mt-5 w-full">
          <div className="flex justify-between text-[11px] font-mono text-slate-600 font-bold mb-1.5">
            <span>Progresso de Inspeção:</span>
            <span className="text-sky-700">{Math.min(100, Math.floor(progress))}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200">
            <div
              className="h-full bg-sky-600 transition-all duration-75 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Anti-Repetitive Action Notice */}
        <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 text-left font-sans text-xs text-amber-900">
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-700" />
          <div>
            <strong className="block font-bold">Prevenção de Ações Repetitivas:</strong>
            Sua solicitação está sendo executada com garantia de idempotência. Por favor, aguarde e não clique repetidamente.
          </div>
        </div>
      </div>
    </div>
  );
};
