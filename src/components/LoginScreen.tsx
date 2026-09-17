import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Check,
  UserCheck,
  KeyRound,
  ArrowRight,
  ShieldAlert,
  Hash,
  Type,
  RefreshCw,
  Clock,
  CreditCard
} from 'lucide-react';
import { User } from '../types';
import { MOCK_USERS } from '../../data/mockUsers';
import { sanitizeInput, isValidCPF } from '../utils/security';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
  onLogAuditEvent: (action: string, resource: string, outcome: 'GRANTED' | 'DENIED_RBAC' | 'BLOCKED_XSS' | 'MASKED_UNAUTHORIZED' | 'SECURITY_ALERT') => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  onLogAuditEvent,
}) => {
  // Input fields
  const [codenameInput, setCodenameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authMode, setAuthMode] = useState<'CODENAME' | 'CPF'>('CODENAME');
  const [cpfInput, setCpfInput] = useState('');

  // Validation & Security States
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutCountdown, setLockoutCountdown] = useState(0);
  const [touchedFields, setTouchedFields] = useState<{ codename?: boolean; password?: boolean; cpf?: boolean }>({});

  // Real-time CPF validation status
  const cleanCpfDigits = cpfInput.replace(/\D/g, '');
  const isCpfComplete = cleanCpfDigits.length === 11;
  const isCpfValid = isCpfComplete ? isValidCPF(cpfInput) : null;

  // Character Limits (as in the security photo: "Limite de Caracteres")
  const CODENAME_MAX_LENGTH = 20;
  const PASSWORD_MAX_LENGTH = 16;
  const CPF_MAX_LENGTH = 14;

  // Mask Formatter for CPF (as in the photo: "Máscaras de Entrada")
  const formatCPF = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '').slice(0, 11);
    if (digitsOnly.length <= 3) return digitsOnly;
    if (digitsOnly.length <= 6) return `${digitsOnly.slice(0, 3)}.${digitsOnly.slice(3)}`;
    if (digitsOnly.length <= 9) return `${digitsOnly.slice(0, 3)}.${digitsOnly.slice(3, 6)}.${digitsOnly.slice(6)}`;
    return `${digitsOnly.slice(0, 3)}.${digitsOnly.slice(3, 6)}.${digitsOnly.slice(6, 9)}-${digitsOnly.slice(9, 11)}`;
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setCpfInput(formatted);
    setErrorMessage(null);
  };

  const handleCodenameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    if (rawVal.length <= CODENAME_MAX_LENGTH) {
      setCodenameInput(rawVal);
      setErrorMessage(null);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    if (rawVal.length <= PASSWORD_MAX_LENGTH) {
      setPasswordInput(rawVal);
      setErrorMessage(null);
    }
  };

  // Submission handler with strict True CPF validation & Security Requirements
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isLockedOut) {
      setErrorMessage(`Terminal temporariamente bloqueado por tentativas excedidas. Aguarde ${lockoutCountdown}s.`);
      return;
    }

    setTouchedFields({ codename: true, password: true, cpf: true });

    // 1. "Campos Obrigatórios" validation
    if (authMode === 'CODENAME' && !codenameInput.trim()) {
      setErrorMessage('Campo Obrigatório (*): Por favor, digite o seu Codinome de acesso.');
      return;
    }

    if (authMode === 'CPF') {
      if (!cpfInput.trim()) {
        setErrorMessage('Campo Obrigatório (*): Por favor, digite o CPF cadastrado.');
        return;
      }

      // Strict Mathematical Real CPF Check (Módulo 11 da Receita Federal)
      if (!isValidCPF(cpfInput)) {
        setErrorMessage('❌ CPF Inválido: Os dígitos verificadores não conferem com o cálculo oficial da Receita Federal (Módulo 11). É obrigatório inserir um CPF verdadeiro para acessar o sistema.');
        onLogAuditEvent('AUTENTICACAO_CPF_INVALIDO', `Tentativa de login com CPF inválido/falso: ${cpfInput}`, 'SECURITY_ALERT');
        return;
      }
    }

    if (!passwordInput.trim()) {
      setErrorMessage('Campo Obrigatório (*): Por favor, digite a sua Senha de acesso.');
      return;
    }

    // 2. Anti-XSS & Tipagem de Inputs check
    const sanitizedCodename = sanitizeInput(codenameInput.trim()).sanitized;
    const sanitizedPassword = sanitizeInput(passwordInput.trim()).sanitized;

    setIsAuthenticating(true);
    setErrorMessage(null);

    setTimeout(() => {
      // Find matching user
      let matchedUser: User | undefined;

      if (authMode === 'CODENAME') {
        matchedUser = MOCK_USERS.find(
          (u) =>
            u.codename.toLowerCase() === sanitizedCodename.toLowerCase() &&
            u.password === sanitizedPassword
        );
      } else {
        const cleanInputDigits = cpfInput.replace(/\D/g, '');
        matchedUser = MOCK_USERS.find((u) => {
          const userCpfDigits = u.cpf ? u.cpf.replace(/\D/g, '') : '';
          return userCpfDigits === cleanInputDigits && u.password === sanitizedPassword;
        });
      }

      if (matchedUser) {
        setSuccessMessage(`Autenticação autorizada com sucesso! Bem-vindo(a), ${matchedUser.name}`);
        onLogAuditEvent('AUTENTICACAO_LOGIN_SUCCESS', `Acesso concedido para ${matchedUser.name} (${matchedUser.codename}) via CPF/Codinome válido`, 'GRANTED');
        
        setTimeout(() => {
          setIsAuthenticating(false);
          onLoginSuccess(matchedUser!);
        }, 600);
      } else {
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        setIsAuthenticating(false);

        const identifier = authMode === 'CPF' ? `CPF "${cpfInput}"` : `Codinome "${sanitizedCodename}"`;
        onLogAuditEvent(
          'AUTENTICACAO_LOGIN_FAILURE',
          `Tentativa de login inválida: ${identifier}`,
          'DENIED_RBAC'
        );

        if (newAttempts >= 5) {
          setIsLockedOut(true);
          setLockoutCountdown(30);
          setErrorMessage('Múltiplas falhas de autenticação detectadas. Bloqueio preventivo ativado por 30 segundos (LGPD / ISO 27799).');

          const timer = setInterval(() => {
            setLockoutCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(timer);
                setIsLockedOut(false);
                setFailedAttempts(0);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        } else {
          setErrorMessage(
            authMode === 'CPF'
              ? `CPF ou Senha incorretos. Verifique se o CPF verdadeiro e a senha correspondem a um profissional cadastrado. (Tentativa ${newAttempts} de 5)`
              : `Credenciais incorretas. Verifique o Codinome e a Senha digitados. (Tentativa ${newAttempts} de 5)`
          );
        }
      }
    }, 450);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans selection:bg-sky-500 selection:text-white">
      {/* Background Subtle Hospital Grid & Light Accents */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#0284c718,transparent_55%)] pointer-events-none" />
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400 border border-sky-400/30 shadow-inner">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-base sm:text-lg font-bold tracking-tight text-white">
                  Hospital Samaritano &middot; Sistema de Prontuários
                </h1>
                <span className="rounded-full bg-emerald-500/15 border border-emerald-400/30 px-2.5 py-0.5 text-[10px] font-mono font-bold text-emerald-400">
                  ONLINE &middot; ISO 27799
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Portal de Autenticação Segura e Controle de Acesso Baseado em Funções (RBAC)
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5 bg-slate-800/60 border border-slate-700/60 px-3 py-1.5 rounded-lg">
              <Lock size={13} className="text-sky-400" />
              Criptografia AES-256 / TLS 1.3
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex flex-col justify-center">
        {/* Login Form Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative">
          <div className="flex items-center justify-between border-b border-slate-800 pb-5 mb-6">
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-extrabold text-white">
                Acesso aos Prontuários
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Informe suas credenciais institucionais para desbloquear a visualização clínica
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-400 border border-sky-400/30">
              <KeyRound size={22} />
            </div>
          </div>

            {/* Notification Banner for Error / Success / Lockout */}
            {errorMessage && (
              <div className="mb-5 flex items-start gap-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-300 animate-in fade-in slide-in-from-top-2">
                <AlertTriangle size={18} className="text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{errorMessage}</div>
              </div>
            )}

            {successMessage && (
              <div className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs text-emerald-300 animate-in fade-in slide-in-from-top-2">
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{successMessage}</div>
              </div>
            )}

            {/* Mode Switcher: CPF Verdadeiro vs Codinome */}
            <div className="mb-5 flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('CPF');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                  authMode === 'CPF'
                    ? 'bg-sky-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <CreditCard size={14} />
                <span>Entrar com CPF Verdadeiro</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('CODENAME');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                  authMode === 'CODENAME'
                    ? 'bg-sky-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Type size={14} />
                <span>Entrar com Codinome</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Requirement 3: Entrada CPF com Validação de Dígitos Verificadores */}
              {authMode === 'CPF' ? (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                      <span>CPF do Profissional</span>
                      <span className="text-rose-400 font-black text-sm" title="Campo Obrigatório">*</span>
                    </label>
                    
                    {/* Limite de Caracteres CPF */}
                    <span className="font-mono text-[11px] text-slate-400 flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                      <Hash size={11} className="text-sky-400" />
                      <span>{cpfInput.length} / {CPF_MAX_LENGTH}</span>
                      <span className="text-[10px] text-slate-500 font-sans">(Máscara)</span>
                    </span>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                      <CreditCard size={16} className={isCpfValid === true ? 'text-emerald-400' : isCpfValid === false ? 'text-rose-400' : 'text-sky-400'} />
                    </div>
                    <input
                      id="input-cpf-masked"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      required
                      maxLength={CPF_MAX_LENGTH}
                      value={cpfInput}
                      onChange={handleCpfChange}
                      placeholder="000.000.000-00"
                      disabled={isLockedOut || isAuthenticating}
                      className={`w-full rounded-2xl border bg-slate-950/80 pl-10 pr-10 py-3 text-sm font-mono text-white placeholder:text-slate-600 focus:outline-none transition ${
                        isCpfValid === true
                          ? 'border-emerald-500/80 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400'
                          : isCpfValid === false
                          ? 'border-rose-500/80 focus:border-rose-400 focus:ring-1 focus:ring-rose-400'
                          : 'border-slate-700/80 focus:border-sky-500 focus:ring-1 focus:ring-sky-500'
                      }`}
                    />
                    {isCpfValid === true && (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-emerald-400">
                        <CheckCircle2 size={18} />
                      </div>
                    )}
                    {isCpfValid === false && (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-rose-400">
                        <AlertTriangle size={18} />
                      </div>
                    )}
                  </div>

                  {/* Real-Time CPF Verification Status Bar */}
                  <div className="mt-1.5 flex items-center justify-between text-[11px]">
                    {isCpfValid === true ? (
                      <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                        <Check size={13} className="shrink-0 font-bold" />
                        <span>CPF Verdadeiro &middot; Dígitos verificadores aprovados (Módulo 11)</span>
                      </div>
                    ) : isCpfValid === false ? (
                      <div className="flex items-center gap-1.5 text-rose-400 font-medium">
                        <AlertTriangle size={13} className="shrink-0" />
                        <span>CPF Inválido &middot; Dígitos verificadores rejeitados</span>
                      </div>
                    ) : (
                      <div className="text-slate-500 flex items-center gap-1.5">
                        <span>Formato automático: 000.000.000-00</span>
                        <span className="text-slate-600">&bull;</span>
                        <span>{cleanCpfDigits.length}/11 dígitos</span>
                      </div>
                    )}
                    <span className="text-sky-400 font-mono text-[10px]">Validador Ativo</span>
                  </div>
                </div>
              ) : (
                /* Requirement 1 & 2 & 4: Codinome Input */
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                      <span>Codinome do Profissional</span>
                      <span className="text-rose-400 font-black text-sm" title="Campo Obrigatório">*</span>
                    </label>
                    
                    {/* Limite de Caracteres Counter */}
                    <span className="font-mono text-[11px] text-slate-400 flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                      <Hash size={11} className="text-sky-400" />
                      <span>{codenameInput.length} / {CODENAME_MAX_LENGTH}</span>
                      <span className="text-[10px] text-slate-500 font-sans">(Limite)</span>
                    </span>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                      <UserCheck size={16} className="text-sky-400" />
                    </div>
                    <input
                      id="input-codename"
                      type="text"
                      inputMode="text"
                      autoComplete="off"
                      spellCheck="false"
                      required
                      maxLength={CODENAME_MAX_LENGTH}
                      value={codenameInput}
                      onChange={handleCodenameChange}
                      onBlur={() => setTouchedFields((prev) => ({ ...prev, codename: true }))}
                      placeholder="Ex: Soldado, Abelha, Karol, Ave, Polaris"
                      disabled={isLockedOut || isAuthenticating}
                      className={`w-full rounded-2xl border bg-slate-950/80 pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none transition ${
                        touchedFields.codename && !codenameInput.trim()
                          ? 'border-rose-500/70 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                          : 'border-slate-700/80 focus:border-sky-500 focus:ring-1 focus:ring-sky-500'
                      }`}
                    />
                  </div>

                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Identificador criptográfico de plantão</span>
                    {codenameInput.length >= CODENAME_MAX_LENGTH && (
                      <span className="text-amber-400 font-mono">Limite máximo atingido</span>
                    )}
                  </div>
                </div>
              )}

              {/* Requirement 1, 2, 4: Senha com Tipagem de Input (Password / Text toggle) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                    <span>Senha de Acesso</span>
                    <span className="text-rose-400 font-black text-sm" title="Campo Obrigatório">*</span>
                  </label>
                  
                  {/* Limite de Caracteres Senha */}
                  <span className="font-mono text-[11px] text-slate-400 flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                    <Hash size={11} className="text-sky-400" />
                    <span>{passwordInput.length} / {PASSWORD_MAX_LENGTH}</span>
                    <span className="text-[10px] text-slate-500 font-sans">(Limite)</span>
                  </span>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                    <Lock size={16} className="text-sky-400" />
                  </div>
                  <input
                    id="input-password"
                    type={showPassword ? 'text' : 'password'}
                    inputMode="text"
                    autoComplete="current-password"
                    spellCheck="false"
                    required
                    maxLength={PASSWORD_MAX_LENGTH}
                    value={passwordInput}
                    onChange={handlePasswordChange}
                    onBlur={() => setTouchedFields((prev) => ({ ...prev, password: true }))}
                    placeholder="Digite sua senha..."
                    disabled={isLockedOut || isAuthenticating}
                    className={`w-full rounded-2xl border bg-slate-950/80 pl-10 pr-12 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none transition ${
                      touchedFields.password && !passwordInput.trim()
                        ? 'border-rose-500/70 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                        : 'border-slate-700/80 focus:border-sky-500 focus:ring-1 focus:ring-sky-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-200 transition"
                    title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Tipagem estrita (input password com sanitização XSS)</span>
                  {passwordInput.length >= PASSWORD_MAX_LENGTH && (
                    <span className="text-amber-400 font-mono">Limite atingido</span>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                id="btn-login-submit"
                disabled={isLockedOut || isAuthenticating}
                className="w-full mt-3 flex items-center justify-center gap-2 rounded-2xl bg-sky-600 py-3.5 px-6 font-display text-sm font-bold text-white shadow-lg shadow-sky-600/30 hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-50 disabled:cursor-not-allowed transition transform active:scale-[0.99]"
              >
                {isAuthenticating ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    <span>Autenticando Credenciais...</span>
                  </>
                ) : isLockedOut ? (
                  <>
                    <Clock size={18} />
                    <span>Bloqueado ({lockoutCountdown}s restantes)</span>
                  </>
                ) : (
                  <>
                    <Lock size={18} />
                    <span>Acessar Prontuários Hospitalares</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Hospital Security Standards Notice */}
          <div className="mt-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 text-xs text-slate-400 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-sky-400">
              <ShieldAlert size={14} />
              <span>Política de Segurança da Informação Hospitalar:</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400 font-mono">
              Art. 11 LGPD &bull; ISO 27799:2016 &bull; CRM Resolução 2.299/2021. Todo acesso é registrado com hash imutável SHA-256 e rastreado no Audit Trail do hospital.
            </p>
          </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/60 bg-slate-950/80 px-6 py-4 text-center text-xs text-slate-500 font-mono">
        Hospital Samaritano &copy; 2026 &middot; Todos os direitos reservados &middot; Sistema de Prontuário Eletrônico com Proteção Criptográfica Zero Trust
      </footer>
    </div>
  );
};
