import React from 'react';
import {
  Stethoscope,
  HeartPulse,
  User as UserIcon,
  LogOut,
} from 'lucide-react';
import { User, NdaState } from '../types';

interface NavbarProps {
  currentUser: User;
  ndaState: NdaState;
  activeNavTab?: string;
  onSelectNavTab?: (tab: string) => void;
  onOpenLoginModal: () => void;
  onLogout?: () => void;
  onOpenNdaModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  ndaState,
  activeNavTab = 'services',
  onSelectNavTab,
  onOpenLoginModal,
  onLogout,
  onOpenNdaModal,
}) => {
  const isDoctor = currentUser.role === 'DOCTOR';
  const isNurse = currentUser.role === 'NURSE';

  const navItems = isNurse
    ? [
        { id: 'services', label: 'Censo de Leitos' },
      ]
    : [
        { id: 'services', label: 'Serviços & Leitos' },
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

          {/* Operator actions */}
          <div className="flex items-center gap-2 sm:gap-3">
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

      {/* Clinical navigation */}
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

        </div>
      </div>
    </header>
  );
};
