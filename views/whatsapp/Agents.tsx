import React, { useEffect, useState, useCallback } from 'react';
import {
  CpuChipIcon, PlusIcon, PencilIcon, TrashIcon, XMarkIcon, CheckIcon,
} from '@heroicons/react/24/solid';
import { getAgents, createAgent, updateAgent, deleteAgent } from '../../services/whatsappAgentApi';
import type { AgentDefinition } from '../../types';

// ── Modal ─────────────────────────────────────────────────────────

interface AgentFormData {
  name: string; description: string; systemPrompt: string;
  aiProvider: string; aiModel: string; aiApiKey: string;
  historyLimit: string; toolCallMode: string;
  injectContactInfo: boolean; injectSessionVars: boolean;
}

const EMPTY_FORM: AgentFormData = {
  name: '', description: '', systemPrompt: '',
  aiProvider: 'openai', aiModel: 'gpt-4o', aiApiKey: '',
  historyLimit: '', toolCallMode: 'auto',
  injectContactInfo: true, injectSessionVars: true,
};

interface AgentModalProps {
  agent: AgentDefinition | null;
  onClose: () => void;
  onSave: (data: AgentFormData) => Promise<void>;
}

const AgentModal: React.FC<AgentModalProps> = ({ agent, onClose, onSave }) => {
  const [form, setForm] = useState<AgentFormData>(
    agent
      ? {
          name: agent.name, description: agent.description, systemPrompt: agent.systemPrompt,
          aiProvider: agent.aiProvider ?? 'openai', aiModel: agent.aiModel ?? 'gpt-4o',
          aiApiKey: '', historyLimit: agent.historyLimit != null ? String(agent.historyLimit) : '',
          toolCallMode: agent.toolCallMode, injectContactInfo: agent.injectContactInfo,
          injectSessionVars: agent.injectSessionVars,
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key: keyof AgentFormData, val: string | boolean) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.systemPrompt.trim()) {
      setError('Nombre y system prompt son requeridos.');
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch {
      setError('Error al guardar el agente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-brand-border/40">
          <h2 className="text-xl font-semibold text-brand-dark">
            {agent ? 'Editar agente' : 'Nuevo agente IA'}
          </h2>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-brand-surface transition">
            <XMarkIcon className="h-5 w-5 text-brand-muted" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-brand-dark mb-1">Nombre *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} required
                className="w-full rounded-xl border border-brand-border/60 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                placeholder="ej. Formateador de Especialidades" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-brand-dark mb-1">Descripción</label>
              <input value={form.description} onChange={e => set('description', e.target.value)}
                className="w-full rounded-xl border border-brand-border/60 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                placeholder="Para qué sirve este agente" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-brand-dark mb-1">System Prompt *</label>
              <textarea value={form.systemPrompt} onChange={e => set('systemPrompt', e.target.value)} required
                rows={6}
                className="w-full rounded-xl border border-brand-border/60 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 resize-none font-mono"
                placeholder="Sos un asistente de..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-dark mb-1">Proveedor IA</label>
              <select value={form.aiProvider} onChange={e => set('aiProvider', e.target.value)}
                className="w-full rounded-xl border border-brand-border/60 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30">
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-dark mb-1">Modelo</label>
              <input value={form.aiModel} onChange={e => set('aiModel', e.target.value)}
                className="w-full rounded-xl border border-brand-border/60 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                placeholder="gpt-4o" />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-dark mb-1">API Key</label>
              <input type="password" value={form.aiApiKey} onChange={e => set('aiApiKey', e.target.value)}
                className="w-full rounded-xl border border-brand-border/60 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                placeholder={agent ? '(sin cambios)' : 'sk-...'} />
              <p className="mt-1 text-xs text-brand-muted">Dejá vacío para usar la key del tenant.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-dark mb-1">History Limit</label>
              <input type="number" value={form.historyLimit} onChange={e => set('historyLimit', e.target.value)}
                className="w-full rounded-xl border border-brand-border/60 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                placeholder="0 = sin historial" />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-dark mb-1">Tool Call Mode</label>
              <select value={form.toolCallMode} onChange={e => set('toolCallMode', e.target.value)}
                className="w-full rounded-xl border border-brand-border/60 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30">
                <option value="auto">Auto</option>
                <option value="explicit">Explicit</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div className="col-span-2 flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.injectContactInfo}
                  onChange={e => set('injectContactInfo', e.target.checked)}
                  className="rounded border-brand-border/60 text-brand-primary" />
                <span className="text-sm text-brand-dark">Inyectar info del contacto</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.injectSessionVars}
                  onChange={e => set('injectSessionVars', e.target.checked)}
                  className="rounded border-brand-border/60 text-brand-primary" />
                <span className="text-sm text-brand-dark">Inyectar variables de sesión</span>
              </label>
            </div>
          </div>
        </form>
        <div className="flex justify-end gap-3 p-6 border-t border-brand-border/40">
          <button onClick={onClose} type="button"
            className="rounded-full border border-brand-border/60 px-5 py-2 text-sm font-medium text-brand-muted hover:bg-brand-surface transition">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-brand-primary px-6 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50">
            <CheckIcon className="h-4 w-4" />
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main view ─────────────────────────────────────────────────────

const Agents: React.FC = () => {
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAgent, setModalAgent] = useState<AgentDefinition | null | undefined>(undefined); // undefined=closed
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setAgents(await getAgents()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (form: AgentFormData) => {
    const payload = {
      name: form.name, description: form.description, systemPrompt: form.systemPrompt,
      aiProvider: form.aiProvider as 'openai' | 'anthropic',
      aiModel: form.aiModel || null,
      aiApiKey: form.aiApiKey || undefined,
      historyLimit: form.historyLimit ? Number(form.historyLimit) : null,
      toolCallMode: form.toolCallMode as 'auto' | 'explicit' | 'both',
      injectContactInfo: form.injectContactInfo,
      injectSessionVars: form.injectSessionVars,
    };
    if (modalAgent) { await updateAgent(modalAgent.id, payload); }
    else { await createAgent(payload); }
    await load();
  };

  const handleDelete = async (id: string) => {
    await deleteAgent(id);
    setDeleteId(null);
    await load();
  };

  if (loading) return (
    <div className="flex h-40 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent" />
    </div>
  );

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-brand-border/60 bg-white/90 p-6 shadow-brand-soft">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CpuChipIcon className="h-8 w-8 text-brand-primary" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">WhatsApp Agents</p>
              <h1 className="text-3xl font-semibold text-brand-dark">Agentes IA</h1>
            </div>
          </div>
          <button onClick={() => setModalAgent(null)}
            className="inline-flex items-center gap-2 rounded-full bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90">
            <PlusIcon className="h-4 w-4" /> Nuevo agente
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-brand-border/60 bg-white/90 shadow-brand-soft overflow-hidden">
        {agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-brand-muted">
            <CpuChipIcon className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">No hay agentes configurados.</p>
            <button onClick={() => setModalAgent(null)}
              className="mt-4 text-sm font-medium text-brand-primary hover:underline">
              Crear el primero
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-border/40 bg-brand-surface/50">
                <th className="px-6 py-3 text-left font-semibold text-brand-muted">Nombre</th>
                <th className="px-6 py-3 text-left font-semibold text-brand-muted">Modelo</th>
                <th className="px-6 py-3 text-left font-semibold text-brand-muted">Modo</th>
                <th className="px-6 py-3 text-left font-semibold text-brand-muted">Contexto</th>
                <th className="px-6 py-3 text-right font-semibold text-brand-muted">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/20">
              {agents.map(agent => (
                <tr key={agent.id} className="hover:bg-brand-surface/30 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-brand-dark">{agent.name}</p>
                    <p className="text-xs text-brand-muted mt-0.5 line-clamp-1">{agent.description}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                      {agent.aiProvider ?? 'openai'} / {agent.aiModel ?? 'gpt-4o'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-brand-muted">{agent.toolCallMode}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {agent.injectContactInfo && (
                        <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Contacto</span>
                      )}
                      {agent.injectSessionVars && (
                        <span className="inline-block rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">Sesión</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setModalAgent(agent)}
                        className="rounded-lg p-1.5 text-brand-muted hover:bg-brand-surface hover:text-brand-dark transition">
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleteId(agent.id)}
                        className="rounded-lg p-1.5 text-brand-muted hover:bg-red-50 hover:text-red-600 transition">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Agent Modal */}
      {modalAgent !== undefined && (
        <AgentModal agent={modalAgent} onClose={() => setModalAgent(undefined)} onSave={handleSave} />
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="rounded-2xl bg-white p-8 shadow-2xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-brand-dark mb-2">¿Eliminar agente?</h3>
            <p className="text-sm text-brand-muted mb-6">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)}
                className="rounded-full border border-brand-border/60 px-5 py-2 text-sm font-medium text-brand-muted hover:bg-brand-surface transition">
                Cancelar
              </button>
              <button onClick={() => handleDelete(deleteId)}
                className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 transition">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Agents;
