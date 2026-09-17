import React, { useState } from 'react';
import {
  ShieldAlert,
  Stethoscope,
  HeartPulse,
  Clock,
  Mail,
  Phone,
  User as UserIcon,
  HelpCircle,
  LogOut,
} from 'lucide-react';
import { User, NdaState, SecurityState } from '../types';

interface NavbarProps {
  currentUser: User;
  ndaState: NdaState;
  securityState: SecurityState;
  activeNavTab?: string;
  onSelectNavTab?: (tab: string) => void;
  onOpenLoginModal: () => void;
  onLogout?: () => void;
  onOpenNdaModal: () => void;
  onOpenSecurityConsole: () => void;
  onToggleShieldLock: () => void;
  onTriggerSimulatedLatency: () => void;
  onTriggerSimulated404: () => void;
  onTriggerSimulated500: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  ndaState,
  securityState,
  activeNavTab = 'services',
  onSelectNavTab,
  onOpenLoginModal,
  onLogout,
  onOpenNdaModal,
  onOpenSecurityConsole,
  onToggleShieldLock,
  onTriggerSimulatedLatency,
  onTriggerSimulated404,
  onTriggerSimulated500,
}) => {
  const [showDemoMenu, setShowDemoMenu] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);

  const isDoctor = currentUser.role === 'DOCTOR';
  const isNurse = currentUser.role === 'NURSE';

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const navItems = isNurse
    ? [
        { id: 'services', label: 'Censo de Leitos' },
        { id: 'departments', label: 'Alas & Setores' },
        { id: 'packages', label: 'Protocolos de Enfermagem' },
        { id: 'doctors', label: 'Equipe de Plantão' },
        { id: 'contact', label: 'Ramais & Emergência' },
      ]
    : [
        { id: 'home', label: 'Início' },
        { id: 'doctors', label: 'Corpo Clínico' },
        { id: 'departments', label: 'Departamentos' },
        { id: 'services', label: 'Serviços & Leitos' },
        { id: 'packages', label: 'Protocolos & Pacotes' },
        { id: 'news', label: 'Notícias & Eventos' },
        { id: 'contact', label: 'Contato' },
        { id: 'about', label: 'Sobre Nós' },
      ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-sm">
      {/* Top Header Bar matching reference image (Logo, Email, Phone, Ask a Question button, Search, Profile) */}
      <div className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          
          {/* Hospital Logo & Brand (Matching Unico Hospital Cross Logo style) */}
          <div className="flex items-center gap-3.5 cursor-pointer" onClick={() => onSelectNavTab && onSelectNavTab('services')}>
            <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-teal-400 p-0.5 shadow-md shadow-sky-500/20">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-white">
                <div className="relative flex items-center justify-center">
                  <div className="h-6 w-2 bg-sky-600 rounded-sm"></div>
                  <div className="absolute h-2 w-6 bg-teal-500 rounded-sm"></div>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-xl font-extrabold tracking-tight text-slate-900">
                  UNICO <span className="text-sky-600 font-black">HOSPITALS</span>
                </span>
                <span className={`hidden sm:inline-block rounded-full px-2 py-0.5 font-mono text-[10px] font-bold border ${
                  isNurse
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-sky-50 border-sky-200 text-sky-700'
                }`}>
                  {isNurse ? 'ESTAÇÃO DE ENFERMAGEM' : 'PORTAL CLÍNICO (CRM)'}
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 hidden sm:block">
                {isNurse
                  ? 'Assistência & Censo de Leitos • Minimização Estrita de Dados (LGPD)'
                  : 'Centro Hospitalar de Alta Complexidade & Prontuários'}
              </p>
            </div>
          </div>

          {/* Right Header Quick Contact & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Email contact pill */}
            <div className="hidden xl:flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/80 px-3.5 py-1.5 text-xs text-slate-600 font-medium">
              <Mail size={14} className="text-sky-600" />
              <span>contato@unicohospitals.com.br</span>
            </div>

            {/* Emergency Phone pill */}
            <div className="hidden lg:flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/80 px-3.5 py-1.5 text-xs text-slate-700 font-bold">
              <Phone size={14} className="text-teal-600" />
              <span>Central: 1620</span>
            </div>

            {/* Blue Primary Button "Ask a Question / Suporte Clínico" */}
            <button
              onClick={onOpenSecurityConsole}
              className="inline-flex items-center gap-1.5 rounded-full bg-sky-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-sky-500 transition shadow-md shadow-sky-600/20 active:scale-95"
              title="Abrir Central de Suporte & Auditoria de Segurança"
            >
              <HelpCircle size={15} />
              <span className="hidden sm:inline">Central de Segurança</span>
              <span className="sm:hidden">Ajuda</span>
            </button>

            {/* Profile Avatar / Operator Switcher Pill */}
            <div
              onClick={onOpenLoginModal}
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 p-1.5 sm:px-3 sm:py-1.5 cursor-pointer transition shadow-xs"
              title="Clique para alternar operador (Médico vs Enfermagem)"
            >
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-white ${
                  isDoctor
                    ? 'bg-sky-600'
                    : isNurse
                    ? 'bg-emerald-600'
                    : 'bg-indigo-600'
                }`}
              >
                {isDoctor && <Stethoscope size={14} />}
                {isNurse && <HeartPulse size={14} />}
                {!isDoctor && !isNurse && <UserIcon size={14} />}
              </div>

              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <span>{currentUser.name}</span>
                  <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                    isDoctor ? 'bg-sky-100 text-sky-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {isDoctor ? 'MÉDICO' : 'ENFERMAGEM'}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-slate-500">
                  Matrícula: <strong className="text-slate-700">{currentUser.registrationNumber}</strong>
                </div>
              </div>
            </div>

            {/* Sair / Logout Button */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 px-3 py-1.5 text-xs font-bold transition shadow-2xs"
                title="Desconectar do terminal e retornar à tela de login"
              >
                <LogOut size={14} />
                <span className="hidden md:inline">Sair</span>
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Main Navigation Row matching reference image */}
      <div className="bg-white border-b border-slate-200">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          
          {/* Navigation Links */}
          <nav className="flex items-center space-x-1 sm:space-x-4 overflow-x-auto py-2.5 text-xs font-semibold text-slate-600 custom-scrollbar">
            {navItems.map((item) => {
              const isActive = activeNavTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectNavTab && onSelectNavTab(item.id)}
                  className={`relative py-1.5 px-3 whitespace-nowrap transition rounded-lg ${
                    isActive
                      ? 'text-sky-600 font-bold bg-sky-50'
                      : 'hover:text-sky-600 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-sky-600 rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick Security Status & Tools Bar */}
          <div className="hidden lg:flex items-center gap-2">
            {/* Auto-lock on Minimization or Tab Switch Active Badge */}
            <div
              className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-mono text-emerald-800"
              title="Proteção de Prontuários: bloqueio automático imediato ao minimizar a tela ou trocar de página/aba"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Proteção Minimização/Aba: <strong className="text-emerald-900">ATIVA</strong></span>
            </div>

            {/* Auto-lock countdown indicator */}
            <div
              className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-mono text-slate-600"
              title="Temporizador de inatividade Zero Trust"
            >
              <Clock size={12} className="text-sky-600" />
              <span>Sessão: <strong className="text-slate-800">{formatSeconds(securityState.secondsUntilAutoLock)}</strong></span>
            </div>

            {/* Privacy Shield Button (Bloquear Prontuários) */}
            <button
              onClick={onToggleShieldLock}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100 transition shadow-2xs active:scale-95"
              title="Bloquear prontuários imediatamente contra olhares indiscretos (exige senha para liberar)"
            >
              <ShieldAlert size={12} className="text-amber-600" />
              <span>Bloquear Prontuários</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
