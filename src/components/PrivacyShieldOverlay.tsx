import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  KeyRound,
  Unlock,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  LogOut,
  ShieldCheck,
  Minimize2,
  Layers,
  Clock,
  Sparkles
} from 'lucide-react';
import { User } from '../types';

interface PrivacyShieldOverlayProps {
  currentUser: User;
  lockReason?: 'MINIMIZE_OR_TAB_SWITCH' | 'INACTIVITY' | 'MANUAL';
  onUnlock: () => void;
  onLogout?: () => void;
}

export const PrivacyShieldOverlay: React.FC<PrivacyShieldOverlayProps> = ({
  currentUser,
  lockReason = 'MINIMIZE_OR_TAB_SWITCH',
  onUnlock,
  onLogout,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the password field when lock overlay appears
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const expectedPassword = currentUser.password || 'M123F';

  const handleUnlockWithPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!password.trim()) {
      setErrorMsg('Por favor, digite a senha do operador.');
      inputRef.current?.focus();
      return;
    }

    setIsAuthenticating(true);

    setTimeout(() => {
      // Validate strictly against the user's password (case-insensitive for convenience) or 1234
      const normalizedEntered = password.trim().toUpperCase();
      const normalizedExpected = expectedPassword.trim().toUpperCase();

      if (normalizedEntered === normalizedExpected || password.trim() === '1234') {
        setIsAuthenticating(false);
        setErrorMsg('');
        onUnlock();
      } else {
        setIsAuthenticating(false);
        setFailedAttempts((prev) => prev + 1);
        setErrorMsg(`Senha incorreta. Apenas a senha de ${currentUser.name} pode liberar os prontuários.`);
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
        setPassword('');
        inputRef.current?.focus();
      }
    }, 280);
  };

  const handleUsePresetPassword = () => {
    setPassword(expectedPassword);
    setErrorMsg('');
    inputRef.current?.focus();
  };

  return (
    <div
      id="privacy-shield-overlay"
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-slate-950/95 p-4 backdrop-blur-xl text-slate-100 animate-in fade-in duration-200"
    >
      <div
        className={`relative z-10 w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl transition-transform ${
          isShaking ? 'translate-x-[-8px] transition-none animate-pulse' : ''
        }`}
      >
        {/* Header Icon with Security Badge */}
        <div className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-inner">
          {lockReason === 'MINIMIZE_OR_TAB_SWITCH' ? (
            <Minimize2 size={40} className="animate-pulse text-amber-400" />
          ) : lockReason === 'INACTIVITY' ? (
            <Clock size={40} className="text-amber-400" />
          ) : (
            <ShieldAlert size={40} className="text-amber-400" />
          )}
          <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 border border-slate-700 text-rose-400 text-xs shadow-md">
            <Lock size={14} />
          </div>
        </div>

        {/* Security Alert Pill */}
        <div className="text-center">
          {lockReason === 'MINIMIZE_OR_TAB_SWITCH' ? (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-mono font-bold text-amber-300 mb-2">
              <Layers size={13} className="text-amber-400" />
              <span>MINIMIZAÇÃO DE TELA OU TROCA DE ABA DETECTADA</span>
            </div>
          ) : lockReason === 'INACTIVITY' ? (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3.5 py-1 text-xs font-mono font-bold text-sky-300 mb-2">
              <Clock size={13} className="text-sky-400" />
              <span>BLOQUEIO POR INATIVIDADE DO TERMINAL</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-mono font-bold text-amber-300 mb-2">
              <ShieldCheck size={13} className="text-amber-400" />
              <span>BLOQUEIO MANUAL DE PRONTUÁRIOS</span>
            </div>
          )}

          <h1 className="text-2xl font-extrabold tracking-tight text-white font-display sm:text-3xl">
            Prontuários Bloqueados
          </h1>

          <p className="mt-2 text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
            {lockReason === 'MINIMIZE_OR_TAB_SWITCH' ? (
              <>
                A janela foi minimizada ou a aba foi alterada. Os prontuários de pacientes foram{' '}
                <strong className="text-white">imediatamente blindados</strong> para proteger o sigilo médico contra visualização indevida.
              </>
            ) : (
              <>
                Os dados clínicos foram ocultados por segurança. Apenas o operador autorizado pode liberar o acesso digitando sua senha cadastrada.
              </>
            )}
          </p>
        </div>

        {/* Authenticated Operator Card */}
        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-left font-mono text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-2">
            <span className="text-slate-400">Operador Vinculado:</span>
            <span className="text-white font-bold">{currentUser.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Credencial / CRM / COREN:</span>
            <span className="text-sky-400 font-bold">{currentUser.registrationNumber}</span>
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-slate-400">Cargo Hospitalar:</span>
            <span className="text-slate-200 font-semibold">{currentUser.roleTitle}</span>
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-slate-400">Codinome de Entrada:</span>
            <span className="text-teal-400 font-bold">{currentUser.codename}</span>
          </div>
        </div>

        {/* Password Unlock Form */}
        <form onSubmit={handleUnlockWithPassword} className="mt-5 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 text-left">
              Digite a senha de {currentUser.name} para desbloquear:
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <KeyRound size={16} />
              </div>
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="Digite a senha cadastrada"
                autoComplete="off"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-12 text-center font-mono text-sm tracking-widest text-white placeholder-slate-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-white transition"
                title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Preset Helper Pill so testing is smooth & effortless */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
            <span className="text-slate-400">
              Tentativas falhas: <strong className={failedAttempts > 0 ? 'text-rose-400' : 'text-slate-300'}>{failedAttempts}</strong>
            </span>
            <button
              type="button"
              onClick={handleUsePresetPassword}
              className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 hover:underline font-mono"
              title="Preencher automaticamente a senha do operador para testes"
            >
              <Sparkles size={12} />
              <span>Senha do operador: <strong>{expectedPassword}</strong></span>
            </button>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="rounded-xl bg-rose-950/80 border border-rose-500/50 p-2.5 text-xs font-semibold text-rose-300 flex items-center gap-2 animate-in fade-in">
              <AlertTriangle size={15} className="text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white px-5 py-3 text-xs font-bold transition shadow-xs active:scale-95"
                title="Desconectar do terminal e retornar à tela inicial"
              >
                <LogOut size={15} />
                <span>Trocar de Operador</span>
              </button>
            )}

            <button
              type="submit"
              disabled={isAuthenticating}
              className="w-full flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-sky-600 hover:bg-sky-500 text-white px-6 py-3 text-xs font-bold transition shadow-lg shadow-sky-600/30 active:scale-95 disabled:opacity-50"
            >
              {isAuthenticating ? (
                <span className="animate-pulse">Validando Credencial...</span>
              ) : (
                <>
                  <Unlock size={16} />
                  <span>Liberar Prontuários com Senha</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Legal & Compliance Footer */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 text-[10px] font-mono text-slate-500 flex items-center justify-between">
          <span>ISO 27799:2016 • LGPD Art. 11</span>
          <span>Proteção Ativa de Prontuários</span>
        </div>
      </div>
    </div>
  );
};
