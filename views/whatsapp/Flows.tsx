import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowPathIcon, PlusIcon, PencilSquareIcon, TrashIcon, PlayIcon, StopIcon } from '@heroicons/react/24/solid';
import { getFlows, createFlow, activateFlow, deleteFlow } from '../../services/whatsappAgentApi';
import type { Flow } from '../../types';

const TRIGGER_LABELS: Record<string, string> = {
  any_message: 'Cualquier mensaje',
  keyword: 'Palabra clave',
  first_contact: 'Primer contacto',
};

const Flows: React.FC = () => {
  const navigate = useNavigate();
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // New flow form state
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTrigger, setNewTrigger] = useState<Flow['triggerType']>('any_message');
  const [newKeywords, setNewKeywords] = useState('');

  const load = useCallback(async () => {
    try { setFlows(await getFlows()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const flow = await createFlow({
        name: newName.trim(),
        description: newDesc.trim(),
        triggerType: newTrigger,
        triggerKeywords: newKeywords ? newKeywords.split(',').map(k => k.trim()).filter(Boolean) : [],
        nodes: [],
        edges: [],
        isActive: false,
      });
      setShowNewForm(false);
      setNewName(''); setNewDesc(''); setNewKeywords('');
      navigate(`/whatsapp/flows/${flow.id}`);
    } catch (e) { console.error(e); }
    finally { setCreating(false); }
  };

  const handleToggleActive = async (flow: Flow) => {
    setTogglingId(flow.id);
    try {
      await activateFlow(flow.id, !flow.isActive);
      await load();
    } catch (e) { console.error(e); }
    finally { setTogglingId(null); }
  };

  const handleDelete = async (id: string) => {
    await deleteFlow(id);
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
      {/* Header */}
      <section className="rounded-2xl border border-brand-border/60 bg-white/90 p-6 shadow-brand-soft">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ArrowPathIcon className="h-8 w-8 text-brand-primary" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">WhatsApp Agents</p>
              <h1 className="text-3xl font-semibold text-brand-dark">Flujos</h1>
            </div>
          </div>
          <button onClick={() => setShowNewForm(true)}
            className="inline-flex items-center gap-2 rounded-full bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90">
            <PlusIcon className="h-4 w-4" /> Nuevo flujo
          </button>
        </div>
      </section>

      {/* New flow inline form */}
      {showNewForm && (
        <section className="rounded-2xl border-2 border-brand-primary/30 bg-brand-primary/5 p-6 shadow-brand-soft">
          <h2 className="text-lg font-semibold text-brand-dark mb-4">Nuevo flujo</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-brand-dark mb-1">Nombre *</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} required
                  placeholder="Sistema de Turnos Médicos"
                  className="w-full rounded-xl border border-brand-border/60 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30" />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-dark mb-1">Trigger</label>
                <select value={newTrigger} onChange={e => setNewTrigger(e.target.value as Flow['triggerType'])}
                  className="w-full rounded-xl border border-brand-border/60 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30">
                  <option value="any_message">Cualquier mensaje</option>
                  <option value="keyword">Palabra clave</option>
                  <option value="first_contact">Primer contacto</option>
                </select>
              </div>
              <div className="col-span-full">
                <label className="block text-sm font-medium text-brand-dark mb-1">Descripción</label>
                <input value={newDesc} onChange={e => setNewDesc(e.target.value)}
                  placeholder="Descripción del flujo"
                  className="w-full rounded-xl border border-brand-border/60 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30" />
              </div>
              {newTrigger === 'keyword' && (
                <div className="col-span-full">
                  <label className="block text-sm font-medium text-brand-dark mb-1">Palabras clave (separadas por coma)</label>
                  <input value={newKeywords} onChange={e => setNewKeywords(e.target.value)}
                    placeholder="turno, cita, agendar"
                    className="w-full rounded-xl border border-brand-border/60 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30" />
                </div>
              )}
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowNewForm(false)}
                className="rounded-full border border-brand-border/60 px-5 py-2 text-sm font-medium text-brand-muted hover:bg-brand-surface transition">
                Cancelar
              </button>
              <button type="submit" disabled={creating}
                className="inline-flex items-center gap-2 rounded-full bg-brand-primary px-6 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50">
                {creating ? 'Creando...' : 'Crear y abrir editor →'}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Flows list */}
      <section className="rounded-2xl border border-brand-border/60 bg-white/90 shadow-brand-soft overflow-hidden">
        {flows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-brand-muted">
            <ArrowPathIcon className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">No hay flujos configurados.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-border/40 bg-brand-surface/50">
                <th className="px-6 py-3 text-left font-semibold text-brand-muted">Nombre</th>
                <th className="px-6 py-3 text-left font-semibold text-brand-muted">Trigger</th>
                <th className="px-6 py-3 text-center font-semibold text-brand-muted">Nodos</th>
                <th className="px-6 py-3 text-center font-semibold text-brand-muted">Estado</th>
                <th className="px-6 py-3 text-right font-semibold text-brand-muted">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/20">
              {flows.map(flow => (
                <tr key={flow.id} className="hover:bg-brand-surface/30 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-brand-dark">{flow.name}</p>
                    <p className="text-xs text-brand-muted mt-0.5 line-clamp-1">{flow.description}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-brand-muted">
                    {TRIGGER_LABELS[flow.triggerType]}
                    {flow.triggerKeywords?.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {flow.triggerKeywords.map(kw => (
                          <span key={kw} className="rounded-full bg-brand-surface px-2 py-0.5 text-xs">{kw}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-block rounded-full bg-brand-surface px-3 py-0.5 text-xs font-semibold text-brand-dark">
                      {flow.nodes?.length ?? 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleToggleActive(flow)}
                      disabled={togglingId === flow.id}
                      title={flow.isActive ? 'Desactivar' : 'Activar'}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
                        flow.isActive
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-brand-surface text-brand-muted hover:bg-brand-border/20'
                      }`}>
                      {flow.isActive ? <PlayIcon className="h-3.5 w-3.5" /> : <StopIcon className="h-3.5 w-3.5" />}
                      {togglingId === flow.id ? '...' : flow.isActive ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => navigate(`/whatsapp/flows/${flow.id}`)}
                        className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-brand-primary border border-brand-primary/30 hover:bg-brand-primary/5 transition">
                        <PencilSquareIcon className="h-3.5 w-3.5" /> Editor
                      </button>
                      <button onClick={() => setDeleteId(flow.id)}
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

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="rounded-2xl bg-white p-8 shadow-2xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-brand-dark mb-2">¿Eliminar flujo?</h3>
            <p className="text-sm text-brand-muted mb-6">Se eliminarán también todas las sesiones activas de este flujo.</p>
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

export default Flows;
