import React from 'react';
import { AlertTriangle, ShieldAlert, ArrowRight, XCircle, FileWarning } from 'lucide-react';

interface AccessRestrictedModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export const AccessRestrictedModal: React.FC<AccessRestrictedModalProps> = ({
  onConfirm,
  onCancel,
}) => {
  return (
    <div
      id="modal-access-restricted"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 sm:p-6 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="access-restricted-title"
    >
      <div className="relative w-full max-w-2xl rounded-3xl border border-amber-500/40 bg-slate-900/95 p-6 sm:p-8 shadow-2xl shadow-amber-950/30 backdrop-blur-xl text-slate-100 my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header with Warning Icon */}
        <div className="flex items-start gap-4 pb-5 border-b border-slate-800">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-inner">
            <AlertTriangle size={26} className="text-amber-400 animate-pulse" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[11px] font-mono font-bold text-amber-300 uppercase tracking-wider mb-1">
              <ShieldAlert size={13} />
              Aviso Legal &amp; Segurança da Informação
            </div>
            <h2
              id="access-restricted-title"
              className="text-xl sm:text-2xl font-black font-display tracking-tight text-white flex items-center gap-2"
            >
              <span>⚠️ ATENÇÃO — ACESSO RESTRITO</span>
            </h2>
          </div>
        </div>

        {/* Legal Text Content Body */}
        <div className="py-5 space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed max-h-[60vh] overflow-y-auto pr-2 font-normal">
          <p className="font-semibold text-slate-100">
            Este tablet e o sistema de prontuário eletrônico são destinados exclusivamente a profissionais autorizados.
          </p>

          <p className="text-slate-300">
            O acesso, uso ou tentativa de acesso sem autorização, a violação dos mecanismos de segurança, a utilização indevida de credenciais de terceiros ou a obtenção, alteração ou divulgação não autorizada de informações poderão sujeitar o responsável às medidas administrativas, civis e criminais cabíveis, conforme a legislação brasileira.
          </p>

          <div className="rounded-2xl bg-slate-950/80 border border-amber-500/20 p-4 text-slate-200">
            <div className="flex items-start gap-2.5">
              <FileWarning size={18} className="text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs sm:text-xs leading-relaxed text-slate-300">
                A invasão de dispositivo informático pode configurar crime previsto no <strong className="text-amber-300">art. 154-A do Código Penal (Decreto-Lei nº 2.848/1940)</strong>, com redação dada pela <strong className="text-amber-300">Lei nº 14.155/2021</strong>, cuja pena pode ser de 1 a 4 anos de reclusão e multa, podendo ser agravada conforme as circunstâncias e os resultados da conduta.
              </p>
            </div>
          </div>

          <p className="text-slate-300">
            Todos os acessos e operações realizados no sistema poderão ser registrados para fins de segurança, auditoria e proteção dos dados dos pacientes.
          </p>

          <div className="pt-2 border-t border-slate-800/80 font-medium text-amber-200/90 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
            <span>Ao prosseguir, você declara possuir autorização para utilizar este sistema.</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-5 border-t border-slate-800 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
          <button
            type="button"
            id="btn-cancel-access-restriction"
            onClick={onCancel}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white px-5 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            <XCircle size={18} />
            <span>Cancelar</span>
          </button>

          <button
            type="button"
            id="btn-confirm-access-restriction"
            onClick={onConfirm}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white px-6 py-3 text-sm font-bold shadow-lg shadow-sky-600/30 transition transform active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-sky-400"
          >
            <span>Estou ciente</span>
            <ArrowRight size={18} />
          </button>
        </div>

      </div>
    </div>
  );
};
