import React, { useState } from 'react';
import {
  Camera,
  X,
  Search,
  Filter,
  ShieldCheck,
  Laptop,
  Tablet,
  Smartphone,
  Calendar,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  ZoomIn,
  Download,
  Trash2,
  RefreshCw,
  Eye,
  ScanFace
} from 'lucide-react';
import { AccessPhotoRecord } from '../types';
import { downloadPhotoFile } from '../utils/camera';

interface WhoEnteredModalProps {
  accessPhotos: AccessPhotoRecord[];
  onClose: () => void;
  onClearHistory?: () => void;
}

export const WhoEnteredModal: React.FC<WhoEnteredModalProps> = ({
  accessPhotos,
  onClose,
  onClearHistory,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'DOCTOR' | 'NURSE'>('ALL');
  const [deviceFilter, setDeviceFilter] = useState<'ALL' | 'Notebook' | 'Tablet'>('ALL');
  const [selectedPhoto, setSelectedPhoto] = useState<AccessPhotoRecord | null>(null);

  const filteredPhotos = accessPhotos.filter((item) => {
    const matchesSearch =
      item.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.userRoleTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.timestamp.includes(searchTerm);

    const matchesRole = roleFilter === 'ALL' || item.userRole === roleFilter;
    const matchesDevice = deviceFilter === 'ALL' || item.deviceType === deviceFilter;

    return matchesSearch && matchesRole && matchesDevice;
  });

  return (
    <div
      id="modal-who-entered"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-5 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl text-slate-100 my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/70 px-6 py-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Camera size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base sm:text-lg font-bold text-white">
                  Quem Entrou no Sistema &middot; Registro Fotográfico
                </h2>
                <span className="rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2.5 py-0.5 font-mono text-[10px] font-bold">
                  {accessPhotos.length} REGISTROS
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Auditoria de presenças com fotografia capturada via câmera do notebook ou tablet a cada login
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/90 px-6 py-3 text-xs">
          <div className="flex flex-1 items-center gap-2 min-w-[240px] max-w-md bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-1.5">
            <Search size={14} className="text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Buscar por profissional, CRM/COREN ou horário..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent text-slate-200 placeholder-slate-500 text-xs w-full focus:outline-none"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-white">
                <X size={12} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Role Filter */}
            <div className="flex items-center rounded-xl bg-slate-950 p-1 border border-slate-800">
              <button
                onClick={() => setRoleFilter('ALL')}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                  roleFilter === 'ALL' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setRoleFilter('DOCTOR')}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                  roleFilter === 'DOCTOR' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Médicos
              </button>
              <button
                onClick={() => setRoleFilter('NURSE')}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                  roleFilter === 'NURSE' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Enfermagem
              </button>
            </div>

            {/* Device Filter */}
            <div className="flex items-center rounded-xl bg-slate-950 p-1 border border-slate-800">
              <button
                onClick={() => setDeviceFilter('ALL')}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                  deviceFilter === 'ALL' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Dispositivos
              </button>
              <button
                onClick={() => setDeviceFilter('Notebook')}
                className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition ${
                  deviceFilter === 'Notebook' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Laptop size={12} />
                Notebook
              </button>
              <button
                onClick={() => setDeviceFilter('Tablet')}
                className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition ${
                  deviceFilter === 'Tablet' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Tablet size={12} />
                Tablet
              </button>
            </div>
          </div>
        </div>

        {/* Gallery Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950/50">
          {filteredPhotos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center text-slate-400">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-800 text-slate-500 mb-3">
                <Camera size={26} />
              </div>
              <p className="text-sm font-semibold text-slate-300">Nenhum registro fotográfico encontrado</p>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                {searchTerm
                  ? 'Nenhum acesso corresponde aos termos da busca.'
                  : 'Ao fazer login pelo notebook ou tablet, a foto do operador é capturada automaticamente pela câmera.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredPhotos.map((item, index) => (
                <div
                  key={item.id || index}
                  className="group relative rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-lg hover:border-sky-500/50 transition duration-200 flex flex-col"
                >
                  {/* Photo Thumbnail */}
                  <div
                    className="relative aspect-video bg-black cursor-pointer overflow-hidden"
                    onClick={() => setSelectedPhoto(item)}
                  >
                    <img
                      src={item.photoDataUrl}
                      alt={`Foto de acesso de ${item.userName}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />

                    {/* Overlay badges */}
                    <div className="absolute top-2 left-2 flex items-center gap-1.5">
                      <span className="rounded-full bg-slate-950/80 backdrop-blur-xs border border-slate-700 px-2 py-0.5 text-[10px] font-mono text-slate-200 flex items-center gap-1">
                        {item.deviceType === 'Tablet' ? (
                          <Tablet size={11} className="text-teal-400" />
                        ) : item.deviceType === 'Dispositivo Móvel' ? (
                          <Smartphone size={11} className="text-teal-400" />
                        ) : (
                          <Laptop size={11} className="text-teal-400" />
                        )}
                        {item.deviceType}
                      </span>
                    </div>

                    <div className="absolute top-2 right-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-mono font-bold uppercase ${
                          item.status === 'CAPTURED_SUCCESS'
                            ? 'bg-emerald-500/90 text-white'
                            : 'bg-amber-500/90 text-slate-950'
                        }`}
                      >
                        {item.status === 'CAPTURED_SUCCESS' ? 'Câmera OK' : 'Sem Câmera'}
                      </span>
                    </div>

                    {/* Hover Zoom hint */}
                    <div className="absolute inset-0 bg-sky-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                      <span className="bg-slate-950/80 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-sky-400/40">
                        <ZoomIn size={14} />
                        Ampliar Foto
                      </span>
                    </div>
                  </div>

                  {/* Card Content Details */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-white group-hover:text-sky-300 transition">
                            {item.userName}
                          </h3>
                          <p className="text-[11px] text-slate-400">{item.userRoleTitle}</p>
                        </div>
                        <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-mono font-bold text-sky-400 shrink-0">
                          {item.registrationNumber}
                        </span>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1 text-[11px] text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} className="text-slate-500" />
                          <span>{item.timestamp}</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500 truncate">
                          <span className="text-slate-400">IP:</span> {item.ipAddress}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <div className="flex items-center gap-1.5">
                        {item.sharpnessScore !== undefined && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800/60 font-mono text-[9px]">
                            <ScanFace size={10} />
                            {item.sharpnessScore}% Nítido
                          </span>
                        )}
                        <span className="truncate max-w-[110px]" title={`SHA-256: ${item.hashProof}`}>
                          {item.hashProof.slice(0, 10)}...
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const sanitized = item.userName.replace(/\s+/g, '_');
                            downloadPhotoFile(item.photoDataUrl, `acesso_${sanitized}_${Date.now()}.jpg`);
                          }}
                          className="text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded transition"
                          title="Baixar arquivo da foto"
                        >
                          <Download size={12} className="text-sky-400" />
                          <span>Baixar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedPhoto(item)}
                          className="text-sky-400 hover:text-sky-300 font-semibold"
                        >
                          Ver
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 bg-slate-950 px-6 py-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-400" />
            <span>
              Registros imutáveis em conformidade com a ISO 27799 e art. 154-A do Código Penal.
            </span>
          </div>

          <div className="flex items-center gap-3">
            {onClearHistory && (
              <button
                onClick={onClearHistory}
                className="text-[11px] text-slate-500 hover:text-rose-400 transition"
              >
                Limpar Cache Local
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs px-4 py-2 transition"
            >
              Fechar
            </button>
          </div>
        </div>

      </div>

      {/* Enlarged Photo Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="relative max-w-3xl w-full bg-slate-900 rounded-3xl border border-slate-700 overflow-hidden shadow-2xl p-4 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="font-bold text-white text-base">{selectedPhoto.userName}</h3>
                <p className="text-xs text-slate-400">
                  {selectedPhoto.userRoleTitle} &middot; {selectedPhoto.registrationNumber}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const sanitized = selectedPhoto.userName.replace(/\s+/g, '_');
                    downloadPhotoFile(selectedPhoto.photoDataUrl, `registro_acesso_${sanitized}_${Date.now()}.jpg`);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 text-xs font-semibold shadow transition"
                >
                  <Download size={14} />
                  <span>Baixar Foto</span>
                </button>
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden border border-slate-800 bg-black aspect-video flex items-center justify-center">
              <img
                src={selectedPhoto.photoDataUrl}
                alt="Foto ampliada"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-500 block text-[10px] font-mono uppercase">Horário de Acesso</span>
                <span className="font-semibold text-slate-200">{selectedPhoto.timestamp}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-mono uppercase">Dispositivo Detectado</span>
                <span className="font-semibold text-slate-200">{selectedPhoto.deviceType}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-mono uppercase">Endereço IP / Sub-rede</span>
                <span className="font-mono text-slate-300">{selectedPhoto.ipAddress}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-mono uppercase">Hash de Integridade (SHA-256)</span>
                <span className="font-mono text-[10px] text-sky-400 break-all">{selectedPhoto.hashProof}</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
