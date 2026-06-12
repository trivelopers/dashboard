import React, { useEffect, useState, useCallback } from 'react';
import { CodeBracketIcon, PlusIcon, PencilIcon, TrashIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/solid';
import { getFunctions, createFunction, updateFunction, deleteFunction } from '../../services/whatsappAgentApi';
import type { FunctionDefinition, FunctionParameter } from '../../types';

// ── Parameter row ─────────────────────────────────────────────────

interface ParamRowProps {
  param: FunctionParameter;
  onChange: (p: FunctionParameter) => void;
  onRemove: () => void;
}

const ParamRow: React.FC<ParamRowProps> = ({ param, onChange, onRemove }) => (
  <div className="grid grid-cols-12 gap-2 items-center">
    <input value={param.name} onChange={e => onChange({ ...param, name: e.target.value })}
      placeholder="nombre" className="col-span-2 rounded-lg border border-brand-border/60 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary/30" />
    <select value={param.type} onChange={e => onChange({ ...param, type: e.target.value as FunctionParameter['type'] })}
      className="col-span-2 rounded-lg border border-brand-border/60 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary/30">
      {['string','number','boolean','object','array'].map(t => <option key={t} value={t}>{t}</option>)}
    </select>
    <input value={param.description} onChange={e => onChange({ ...param, description: e.target.value })}
      placeholder="descripción" className="col-span-6 rounded-lg border border-brand-border/60 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary/30" />
    <label className="col-span-1 flex items-center gap-1 cursor-pointer justify-center">
      <input type="checkbox" checked={param.required} onChange={e => onChange({ ...param, required: e.target.checked })} />
      <span className="text-xs text-brand-muted">Req</span>
    </label>
    <button type="button" onClick={onRemove} className="col-span-1 flex justify-center">
      <XMarkIcon className="h-4 w-4 text-red-400 hover:text-red-600 transition" />
    </button>
  </div>
);

// ── Modal ─────────────────────────────────────────────────────────

interface FnFormData {
  name: string; description: string;
  type: 'http' | 'db_query' | 'db_write';
  configMethod: string; configUrl: string;
  configHeaders: string; configBody: string;
  parameters: FunctionParameter[];
}

const EMPTY_FN: FnFormData = {
  name: '', description: '', type: 'http',
  configMethod: 'GET', configUrl: '', configHeaders: '{}', configBody: '',
  parameters: [],
};

interface FunctionModalProps {
  fn: FunctionDefinition | null;
  onClose: () => void;
  onSave: (d: FnFormData) => Promise<void>;
}

const FunctionModal: React.FC<FunctionModalProps> = ({ fn, onClose, onSave }) => {
  const [form, setForm] = useState<FnFormData>(
    fn ? {
      name: fn.name, description: fn.description, type: fn.type,
      configMethod: (fn.config as Record<string,string>).method ?? 'GET',
      configUrl: (fn.config as Record<string,string>).url ?? '',
      configHeaders: JSON.stringify((fn.config as Record<string,unknown>).headers ?? {}, null, 2),
      configBody: fn.config.body ? JSON.stringify(fn.config.body, null, 2) : '',
      parameters: fn.parameters,
    } : EMPTY_FN
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key: keyof FnFormData, val: unknown) => setForm(prev => ({ ...prev, [key]: val }));

  const addParam = () => set('parameters', [...form.parameters, { name: '', type: 'string', description: '', required: false }]);
  const updateParam = (i: number, p: FunctionParameter) =>
    set('parameters', form.parameters.map((x, idx) => idx === i ? p : x));
  const removeParam = (i: number) =>
    set('parameters', form.parameters.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.configUrl.trim()) { setError('Nombre y URL son requeridos.'); return; }
    try { JSON.parse(form.configHeaders); } catch { setError('Headers no es un JSON válido.'); return; }
    if (form.configBody) { try { JSON.parse(form.configBody); } catch { setError('Body no es un JSON válido.'); return; } }
    setSaving(true);
    try { await onSave(form); onClose(); }
    catch { setError('Error al guardar la función.'); }
    finally { setSaving(false); }
  };

  const needsBody = ['POST', 'PUT', 'PATCH'].includes(form.configMethod);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-brand-border/40">
          <h2 className="text-xl font-semibold text-brand-dark">{fn ? 'Editar función' : 'Nueva función'}</h2>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-brand-surface transition">
            <XMarkIcon className="h-5 w-5 text-brand-muted" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2">{error}</p>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-dark mb-1">Nombre *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} required
                placeholder="obtener_especialidades"
                className="w-full rounded-xl border border-brand-border/60 px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-primary/30" />
              <p className="mt-0.5 text-xs text-brand-muted">snake_case — este nombre usa la IA para llamar la función.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-dark mb-1">Tipo</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}
                className="w-full rounded-xl border border-brand-border/60 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30">
                <option value="http">HTTP</option>
                <option value="db_query">DB Query</option>
                <option value="db_write">DB Write</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-brand-dark mb-1">Descripción *</label>
              <input value={form.description} onChange={e => set('description', e.target.value)} required
                placeholder="Obtiene las especialidades médicas activas..."
                className="w-full rounded-xl border border-brand-border/60 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30" />
              <p className="mt-0.5 text-xs text-brand-muted">La IA usa esta descripción para saber cuándo llamar la función.</p>
            </div>
          </div>

          {/* HTTP config */}
          <div className="rounded-xl border border-brand-border/40 bg-brand-surface/30 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">Configuración HTTP</p>
            <div className="flex gap-3">
              <select value={form.configMethod} onChange={e => set('configMethod', e.target.value)}
                className="rounded-xl border border-brand-border/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30">
                {['GET','POST','PUT','PATCH','DELETE'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <input value={form.configUrl} onChange={e => set('configUrl', e.target.value)}
                placeholder="https://api.tudominio.com/especialidades?activas={{session.dni}}"
                className="flex-1 rounded-xl border border-brand-border/60 px-4 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-brand-dark mb-1">Headers (JSON)</label>
              <textarea value={form.configHeaders} onChange={e => set('configHeaders', e.target.value)}
                rows={3} className="w-full rounded-xl border border-brand-border/60 px-4 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-primary/30 resize-none" />
            </div>
            {needsBody && (
              <div>
                <label className="block text-xs font-medium text-brand-dark mb-1">Body (JSON — soporta {'{{variable}}'})</label>
                <textarea value={form.configBody} onChange={e => set('configBody', e.target.value)}
                  rows={4} className="w-full rounded-xl border border-brand-border/60 px-4 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-primary/30 resize-none"
                  placeholder='{"dni": "{{session.dni}}"}' />
              </div>
            )}
          </div>

          {/* Parameters */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">Parámetros</p>
              <button type="button" onClick={addParam}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-primary hover:underline">
                <PlusIcon className="h-3.5 w-3.5" /> Agregar
              </button>
            </div>
            {form.parameters.length === 0
              ? <p className="text-xs text-brand-muted">Sin parámetros definidos.</p>
              : (
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-xs font-medium text-brand-muted px-0.5">
                    <span className="col-span-2">Nombre</span>
                    <span className="col-span-2">Tipo</span>
                    <span className="col-span-6">Descripción</span>
                    <span className="col-span-1 text-center">Req</span>
                    <span className="col-span-1" />
                  </div>
                  {form.parameters.map((p, i) => (
                    <ParamRow key={i} param={p} onChange={np => updateParam(i, np)} onRemove={() => removeParam(i)} />
                  ))}
                </div>
              )}
          </div>
        </form>
        <div className="flex justify-end gap-3 p-6 border-t border-brand-border/40">
          <button type="button" onClick={onClose}
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

const Functions: React.FC = () => {
  const [functions, setFunctions] = useState<FunctionDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalFn, setModalFn] = useState<FunctionDefinition | null | undefined>(undefined);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setFunctions(await getFunctions()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (form: FnFormData) => {
    const headers = JSON.parse(form.configHeaders);
    const config: Record<string, unknown> = { method: form.configMethod, url: form.configUrl, headers };
    if (form.configBody) config.body = JSON.parse(form.configBody);
    const payload = { name: form.name, description: form.description, type: form.type, config, parameters: form.parameters };
    if (modalFn) { await updateFunction(modalFn.id, payload); }
    else { await createFunction(payload); }
    await load();
  };

  const handleDelete = async (id: string) => {
    await deleteFunction(id);
    setDeleteId(null);
    await load();
  };

  const typeBadge: Record<string, string> = {
    http: 'bg-blue-100 text-blue-700',
    db_query: 'bg-orange-100 text-orange-700',
    db_write: 'bg-red-100 text-red-700',
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
            <CodeBracketIcon className="h-8 w-8 text-brand-primary" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">WhatsApp Agents</p>
              <h1 className="text-3xl font-semibold text-brand-dark">Funciones</h1>
            </div>
          </div>
          <button onClick={() => setModalFn(null)}
            className="inline-flex items-center gap-2 rounded-full bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90">
            <PlusIcon className="h-4 w-4" /> Nueva función
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-brand-border/60 bg-white/90 shadow-brand-soft overflow-hidden">
        {functions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-brand-muted">
            <CodeBracketIcon className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">No hay funciones configuradas.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-border/40 bg-brand-surface/50">
                <th className="px-6 py-3 text-left font-semibold text-brand-muted">Nombre</th>
                <th className="px-6 py-3 text-left font-semibold text-brand-muted">Tipo</th>
                <th className="px-6 py-3 text-left font-semibold text-brand-muted">Descripción</th>
                <th className="px-6 py-3 text-center font-semibold text-brand-muted">Params</th>
                <th className="px-6 py-3 text-right font-semibold text-brand-muted">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/20">
              {functions.map(fn => (
                <tr key={fn.id} className="hover:bg-brand-surface/30 transition-colors">
                  <td className="px-6 py-4 font-mono text-sm font-semibold text-brand-dark">{fn.name}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${typeBadge[fn.type] ?? ''}`}>
                      {fn.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-brand-muted line-clamp-1 max-w-xs">{fn.description}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-block rounded-full bg-brand-surface px-2.5 py-0.5 text-xs font-semibold text-brand-dark">
                      {fn.parameters.length}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setModalFn(fn)}
                        className="rounded-lg p-1.5 text-brand-muted hover:bg-brand-surface hover:text-brand-dark transition">
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleteId(fn.id)}
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

      {modalFn !== undefined && (
        <FunctionModal fn={modalFn} onClose={() => setModalFn(undefined)} onSave={handleSave} />
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="rounded-2xl bg-white p-8 shadow-2xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-brand-dark mb-2">¿Eliminar función?</h3>
            <p className="text-sm text-brand-muted mb-6">Los agentes que la referencian dejarán de poder usarla.</p>
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

export default Functions;
