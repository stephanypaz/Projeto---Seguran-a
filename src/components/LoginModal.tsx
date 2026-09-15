import React, { useState } from 'react';
import { ShieldCheck, Lock, UserCheck, Stethoscope, HeartPulse, Shield, KeyRound, CheckCircle2, ArrowRight, X } from 'lucide-react';
import { User } from '../types';
import { MOCK_USERS } from '../data/mockUsers';

interface LoginModalProps {
  currentUser: User;
  onSelectUser: (user: User) => void;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  currentUser,
  onSelectUser,
  onClose,
}) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleSwitch = (user: User) => {
    setIsAuthenticating(true);
    setTimeout(() => {
      onSelectUser(user);
      setIsAuthenticating(false);
      onClose();
    }, 350);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-5">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 shadow-xs">
              <Lock size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base font-bold text-slate-900">
                  Autenticação & Controle de Acesso (RBAC)
                </h2>
                <span className="rounded-full bg-sky-100 px-2 py-0.5 font-mono text-[10px] text-sky-800 font-bold">
                  Zero Trust
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Alterne entre Médicos e Enfermeiros para validar as diretivas de isolamento de prontuário
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

        {/* User Selection List */}
        <div className="p-6 space-y-4">
          <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
            <span>Selecione a Credencial do Operador:</span>
            <span className="text-[11px] font-mono text-sky-700 font-medium">Autenticação Biométrica / FIDO2</span>
          </div>

          <div className="space-y-3">
            {MOCK_USERS.map((user) => {
              const isSelected = currentUser.id === user.id;
              const isDoctor = user.role === 'DOCTOR';
              const isNurse = user.role === 'NURSE';

              return (
                <div
                  key={user.id}
                  onClick={() => handleSwitch(user)}
                  className={`group relative flex items-center justify-between rounded-2xl border p-4 cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'border-sky-500 bg-sky-50/70 shadow-sm ring-1 ring-sky-300'
                      : 'border-slate-200 bg-white hover:border-sky-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                        isDoctor
                          ? 'bg-sky-100 text-sky-700'
                          : isNurse
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-indigo-100 text-indigo-700'
                      }`}
                    >
                      {isDoctor && <Stethoscope size={22} />}
                      {isNurse && <HeartPulse size={22} />}
                      {!isDoctor && !isNurse && <Shield size={22} />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-sm font-bold text-slate-900 group-hover:text-sky-700 transition">
                          {user.name}
                        </span>
                        {isSelected && (
                          <span className="rounded-full bg-sky-600 px-2.5 py-0.5 text-[10px] font-mono text-white font-bold">
                            CONECTADO
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        {user.roleTitle} &bull; <span className="font-mono text-slate-700 font-semibold">{user.registrationNumber}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 group-hover:text-sky-700 transition">
                    <span className="text-[11px] hidden sm:inline">
                      {isDoctor ? 'Acesso Completo' : isNurse ? 'Sinais Vitais' : 'Auditoria'}
                    </span>
                    <ArrowRight size={16} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Security Notice */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs text-slate-600">
            <div className="flex items-center gap-1.5 text-sky-800 font-bold mb-1">
              <ShieldCheck size={16} />
              DIRETIVA DE ACESSO RBAC:
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed font-sans mt-1">
              • <strong>Médicos</strong>: Permissão completa para Prontuário, Sinais Vitais, CID-10, Histórico Clínico e Prescrições.<br />
              • <strong>Enfermeiros</strong>: Acesso estritamente restrito a <strong>Sinais Vitais</strong>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-slate-100 bg-slate-50/80 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-full border border-slate-300 bg-white px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
