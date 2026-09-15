import React, { useRef, useState } from 'react';
import { ShieldCheck, FileText, CheckCircle2, Lock, X, RefreshCw, PenTool } from 'lucide-react';
import { User, NdaState } from '../types';
import { generateSHA256Hash } from '../utils/security';

interface NdaModalProps {
  currentUser: User;
  ndaState: NdaState;
  onSignNda: (nda: NdaState) => void;
  onClose: () => void;
}

export const NdaModal: React.FC<NdaModalProps> = ({
  currentUser,
  ndaState,
  onSignNda,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    ctx.strokeStyle = '#0284c7'; // Hospital Sky Blue
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleConfirmSignature = () => {
    if (!hasDrawn || !agreedTerms) return;

    setIsSubmitting(true);
    const canvas = canvasRef.current;
    const signatureData = canvas ? canvas.toDataURL() : '';
    const now = new Date().toISOString();
    const docHash = generateSHA256Hash(`NDA_TERMS_${currentUser.id}_${now}_${currentUser.registrationNumber}`);
    const certThumbprint = generateSHA256Hash(`CERT_AUTHORITY_${currentUser.sessionToken}`).slice(0, 32);

    setTimeout(() => {
      onSignNda({
        isSigned: true,
        signedByName: currentUser.name,
        signedByRole: currentUser.role,
        signedAt: now,
        signatureDataUrl: signatureData,
        documentSha256: docHash,
        certificateThumbprint: certThumbprint,
        organizationUnit: currentUser.department,
      });
      setIsSubmitting(false);
      onClose();
    }, 450);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-5">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 shadow-xs">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
                Termo de Confidencialidade Hospitalar (NDA Digital)
                <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[10px] font-mono text-sky-800 font-bold">
                  Zero Trust DDM
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Necessário para o desmascaramento dinâmico de dados sensíveis (PII / PHI)
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

        {/* Modal Body */}
        <div className="max-h-[75vh] overflow-y-auto p-6 space-y-5 text-xs text-slate-700 custom-scrollbar">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 leading-relaxed font-sans shadow-xs">
            <p className="font-bold text-slate-900 mb-2 flex items-center gap-1.5 font-display text-xs">
              <FileText size={15} className="text-sky-600" />
              CLÁUSULAS DE SIGILO E SEGURANÇA DA INFORMAÇÃO CLASSIFICADA
            </p>
            <p className="text-slate-600 mb-2">
              Em estrita conformidade com a <strong>LGPD (Lei nº 13.709/18, Art. 11)</strong>, <strong>ISO 27799 (Gestão de Segurança na Saúde)</strong> e padrões <strong>HIPAA / NIST 800-53</strong>, o signatário compromete-se a:
            </p>
            <ul className="list-disc pl-4 space-y-1.5 text-slate-600">
              <li>Não exportar, fotografar ou divulgar dados de identificação pessoal, prontuários, sequenciamento genômico ou diagnósticos para fins não clínicos;</li>
              <li>Reconhecer que qualquer visualização de dados não mascarados é registrada com assinatura criptográfica vinculada à sua credencial (<strong>{currentUser.registrationNumber}</strong>);</li>
              <li>Ativar imediatamente o <strong>Escudo de Privacidade</strong> ao ausentar-se do terminal ou posto de atendimento.</li>
            </ul>
          </div>

          {/* User Signer Info */}
          <div className="grid grid-cols-2 gap-3 font-mono text-[11px] bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <span className="text-slate-500 block">Profissional Signatário:</span>
              <span className="text-sky-800 font-bold font-sans">{currentUser.name}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Registro / Cargo:</span>
              <span className="text-slate-800 font-semibold">{currentUser.registrationNumber} ({currentUser.roleTitle})</span>
            </div>
            <div>
              <span className="text-slate-500 block">Departamento:</span>
              <span className="text-slate-800">{currentUser.department}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Identificador de Sessão:</span>
              <span className="text-emerald-700 font-bold truncate block">{currentUser.sessionToken.slice(0, 18)}...</span>
            </div>
          </div>

          {/* Digital Signature Pad */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                <PenTool size={14} className="text-sky-600" />
                Assinatura Digital Manuscrita no Canvas:
              </label>
              <button
                type="button"
                onClick={clearCanvas}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-sky-600 transition"
              >
                <RefreshCw size={12} />
                Limpar Assinatura
              </button>
            </div>

            <div className="relative rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 overflow-hidden cursor-crosshair shadow-inner">
              <canvas
                ref={canvasRef}
                width={580}
                height={130}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-32 block bg-white"
              />
              {!hasDrawn && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-slate-400 text-xs font-medium">
                  Desenhe sua assinatura com o cursor ou toque
                </div>
              )}
            </div>
          </div>

          {/* Agreement Checkbox */}
          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 cursor-pointer hover:border-sky-300 transition">
            <input
              type="checkbox"
              checked={agreedTerms}
              onChange={(e) => setAgreedTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            />
            <span className="text-xs text-slate-700 font-medium leading-relaxed">
              Li e concordo expressamente com os termos do NDA e autorizo a auditoria biométrica contínua da minha sessão.
            </span>
          </label>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-6 py-4">
          <div className="text-[11px] font-mono text-slate-500">
            Hash SHA-256 gerado automaticamente na confirmação
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmSignature}
              disabled={!hasDrawn || !agreedTerms || isSubmitting}
              className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-5 py-2 text-xs font-bold text-white hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-md shadow-sky-600/20 active:scale-95"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Criptografando Termo...
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} />
                  Assinar Digitalmente & Revelar PII
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
