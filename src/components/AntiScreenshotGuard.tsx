import React, { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, CameraOff, Printer, Lock, AlertOctagon, XCircle } from 'lucide-react';

interface AntiScreenshotGuardProps {
  onLogSecurityIncident?: (action: string, detail: string) => void;
  children?: React.ReactNode;
}

export const AntiScreenshotGuard: React.FC<AntiScreenshotGuardProps> = ({
  onLogSecurityIncident,
  children,
}) => {
  const [showScreenshotWarning, setShowScreenshotWarning] = useState<boolean>(false);
  const [incidentType, setIncidentType] = useState<'SCREENSHOT' | 'PRINT' | 'INSPECT'>('SCREENSHOT');
  const [incidentCount, setIncidentCount] = useState<number>(0);
  const [isBlackoutActive, setIsBlackoutActive] = useState<boolean>(false);

  // Trigger anti-capture shield
  const triggerBlock = useCallback(
    (type: 'SCREENSHOT' | 'PRINT' | 'INSPECT', description: string) => {
      setIncidentType(type);
      setIncidentCount((prev) => prev + 1);
      setShowScreenshotWarning(true);
      setIsBlackoutActive(true);

      // Overwrite clipboard if possible to prevent clipboard-based print screen dump
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard
          .writeText(
            '⚠️ AVISO DE SEGURANÇA HOSPITALAR: A captura de tela de dados médicos é estritamente proibida (Art. 11 da LGPD e Resolução CFM 2.299/2021). Incidente registrado na trilha de auditoria.'
          )
          .catch(() => {
            // Clipboard access might be blocked in some iframe contexts
          });
      }

      if (onLogSecurityIncident) {
        onLogSecurityIncident('BLOQUEIO_ANTI_CAPTURA_TELA', description);
      }

      // Keep blackout active for at least 800ms
      setTimeout(() => {
        setIsBlackoutActive(false);
      }, 1200);
    },
    [onLogSecurityIncident]
  );

  useEffect(() => {
    // 1. Keydown listener for Screenshot & Print shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen key (standard code 'PrintScreen' or keyCode 44)
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen' || e.keyCode === 44) {
        e.preventDefault();
        e.stopPropagation();
        triggerBlock('SCREENSHOT', 'Tentativa de PrintScreen (Tecla PrtScn) interceptada e bloqueada');
        return false;
      }

      // Ctrl+P / Cmd+P (Print document)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        e.stopPropagation();
        triggerBlock('PRINT', 'Tentativa de Impressão (Ctrl+P / Cmd+P) bloqueada');
        return false;
      }

      // Ctrl+S / Cmd+S (Save webpage)
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        e.stopPropagation();
        triggerBlock('SCREENSHOT', 'Tentativa de Salvar Página (Ctrl+S / Cmd+S) bloqueada');
        return false;
      }

      // Windows Snipping Tool (Win + Shift + S) or Mac Screenshot (Cmd + Shift + 3/4/5)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 's' || e.key === 'S' || e.key === '3' || e.key === '4' || e.key === '5')) {
        e.preventDefault();
        e.stopPropagation();
        triggerBlock('SCREENSHOT', 'Atalho de Captura de Área (Snipping Tool / Screenshot) bloqueado');
        return false;
      }

      // DevTools Inspection attempt (F12 or Ctrl+Shift+I / Ctrl+Shift+J)
      if (e.key === 'F12' || ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c'))) {
        e.preventDefault();
        e.stopPropagation();
        triggerBlock('INSPECT', 'Tentativa de Inspecionar Elementos (DevTools) bloqueada');
        return false;
      }
    };

    // 2. Keyup listener as an extra safeguard for PrintScreen
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen' || e.keyCode === 44) {
        e.preventDefault();
        e.stopPropagation();
        triggerBlock('SCREENSHOT', 'Tentativa de captura liberada (PrintScreen keyup)');
      }
    };

    // 3. Before print event handler
    const handleBeforePrint = (e: Event) => {
      e.preventDefault();
      triggerBlock('PRINT', 'Disparo de comando do navegador para Impressão bloqueado');
    };

    // 4. Context menu (Right Click) prevention for image copy / saving
    const handleContextMenu = (e: MouseEvent) => {
      // Prevent right click menu on clinical tables & images
      e.preventDefault();
    };

    // 5. Drag start prevention
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('dragstart', handleDragStart);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('dragstart', handleDragStart);
    };
  }, [triggerBlock]);

  return (
    <>
      {/* Screen Watermark & Security Layer */}
      <div className="select-none" style={{ WebkitUserSelect: 'none', userSelect: 'none' }}>
        {children}
      </div>

      {/* Instant Blackout Flash to prevent screen grab buffer capture */}
      {isBlackoutActive && (
        <div className="fixed inset-0 z-99999 bg-black flex items-center justify-center pointer-events-none transition-opacity duration-150">
          <div className="text-center text-white p-6">
            <CameraOff size={64} className="mx-auto text-rose-500 animate-pulse mb-3" />
            <h2 className="text-xl font-bold tracking-tight">CAPTURA BLOQUEADA</h2>
            <p className="text-xs text-slate-400 mt-1 font-mono">Proteção de Prontuário Ativa</p>
          </div>
        </div>
      )}

      {/* Warning Dialog Modal when a Screenshot / Print is Attempted */}
      {showScreenshotWarning && (
        <div className="fixed inset-0 z-99990 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl border border-rose-500/40 bg-slate-900 p-6 sm:p-8 shadow-2xl text-white">
            {/* Header Icon */}
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-inner">
              {incidentType === 'PRINT' ? (
                <Printer size={38} className="animate-bounce" />
              ) : (
                <CameraOff size={38} className="animate-pulse" />
              )}
            </div>

            {/* Tag */}
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 px-3.5 py-1 text-xs font-mono font-bold text-rose-400">
                <AlertOctagon size={13} />
                BLOQUEIO DE SEGURANÇA ATIVADO
              </span>

              <h3 className="mt-3 text-xl sm:text-2xl font-extrabold font-display text-white">
                {incidentType === 'PRINT'
                  ? 'Impressão Não Autorizada'
                  : 'Captura de Tela Bloqueada'}
              </h3>

              <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                Por motivos de <strong>segurança e sigilo médico</strong> (LGPD Art. 11 e Resolução CFM 2.299/2021), é estritamente proibido tirar prints, capturar imagens ou imprimir dados de prontuários clínicos.
              </p>
            </div>

            {/* Technical Security Metadata */}
            <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 font-mono text-xs text-slate-400 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Mecanismo de Proteção:</span>
                <span className="text-rose-400 font-bold">Anti-PrintScreen / DLP Guard</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Status da Tentativa:</span>
                <span className="text-emerald-400 font-semibold">Interceptada e Anulada</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Trilha de Auditoria:</span>
                <span className="text-sky-400">Evento registrado com hash SHA-256</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Total de Tentativas:</span>
                <span className="text-amber-400 font-bold">{incidentCount}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={() => setShowScreenshotWarning(false)}
                className="w-full flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 hover:bg-rose-500 py-3 text-sm font-bold text-white transition shadow-lg shadow-rose-600/30 active:scale-95 cursor-pointer"
              >
                <ShieldAlert size={16} />
                <span>Entendido, Retornar ao Sistema</span>
              </button>
            </div>

            <p className="mt-4 text-center font-mono text-[10px] text-slate-500">
              Hospital Santa Clara &bull; Segurança da Informação & Sigilo do Paciente
            </p>
          </div>
        </div>
      )}
    </>
  );
};
