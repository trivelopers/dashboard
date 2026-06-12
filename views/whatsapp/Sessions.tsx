import React, { useEffect, useState, useCallback } from 'react';
import { SignalIcon, XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/solid';
import { getSessions, getSession, closeSession, getFlowsAnalytics } from '../../services/whatsappAgentApi';
import type { ConversationSession, FlowAnalytics } from '../../types';

// ── Status badge ──────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: ConversationSession['status'] }> = ({ status }) => {
  const map: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    completed: 'bg-gray-100 text-gray-600',
    human_takeover: 'bg-yellow-100 text-yellow-700',
    error: 'bg-red-100 text-red-700',
  };
  const labels: Record<string, string> = {
    active: 'Activa', completed: 'Completada', human_takeover: 'Humano', error: 'Error',
  };
  return (
    <span className={`inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${map[status] ?? ''}`}>
      {labels[status] ?? status}
    </span>
  );
};

// ── Session detail modal ──────────────────────────────────────────

interface SessionDetailProps {
  sessionId: string;
  onClose: () => void;
  onClosed: () => void;
}

const SessionDetail: React.FC<SessionDetailProps> = ({ sessionId, onClose, onClosed }) => {
  const [session, setSession] = useState<ConversationSession | null>(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    getSession(sessionId).then(setSession).catch(console.error);
  }, [sessionId]);

  const handleClose = async () => {
    setClosing(true);
    try {
      await closeSession(sessionId);
      onClosed();
      onClose();
    } catch (e) { console.error(e); }
    finally { setClosing(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-6 border-b border-brand-border/40">
          <h2 className="text-lg font-semibold text-brand-dark">Detalle de sesión</h2>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-brand-surface transition">
            <XMarkIcon className="h-5 w-5 text-brand-muted" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!session ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-brand-surface/50 p-3">
                  <p className="text-xs text-brand-muted mb-0.5">Estado</p>
                  <StatusBadge status={session.status} />
                </div>
                <div className="rounded-xl bg-brand-surface/50 p-3">
                  <p className="text-xs text-brand-muted mb-0.5">Nodo actual</p>
                  <p className="font-mono text-xs font-semibold text-brand-dark truncate">{session.currentNodeId}</p>
                </div>
                <div className="col-span-2 rounded-xl bg-brand-surface/50 p-3">
                  <p className="text-xs text-brand-muted mb-0.5">Flujo</p>
                  <p className="text-sm font-semibold text-brand-dark">{session.flowName ?? session.flowId}</p>
                </div>
                {session.currentNode && (
                  <div className="col-span-2 rounded-xl bg-blue-50 border border-blue-100 p-3">
                    <p className="text-xs text-blue-600 font-semibold mb-1">Nodo actual — {session.currentNode.type}</p>
                    <pre className="text-xs text-blue-800 whitespace-pre-wrap">
                      {JSON.stringify(session.currentNode.config, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-brand-muted uppercase tracking-wide mb-2">Variables de sesión</p>
                {Object.keys(session.variables ?? {}).length === 0 ? (
                  <p className="text-xs text-brand-muted">Sin variables.</p>
                ) : (
                  <div className="space-y-1.5">
                    {Object.entries(session.variables ?? {}).map(([k, v]) => (
                      <div key={k} className="flex justify-between rounded-lg bg-brand-surface/50 px-3 py-2">
                        <span className="text-xs font-mono font-semibold text-brand-dark">{k}</span>
                        <span className="text-xs font-mono text-brand-muted max-w-[60%] truncate text-right">
                          {JSON.stringify(v)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        <div className="flex justify-between gap-3 p-6 border-t border-brand-border/40">
          <button onClick={handleClose} disabled={closing || !session || session.status !== 'active'}
            className="rounded-full border border-red-200 px-5 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition disabled:opacity-40">
            {closing ? 'Cerrando...' : 'Forzar cierre'}
          </button>
          <button onClick={onClose}
            className="rounded-full border border-brand-border/60 px-5 py-2 text-sm font-medium text-brand-muted hover:bg-brand-surface transition">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Sessions view ────────────────────────────────────────────

const Sessions: React.FC = () => {
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [analytics, setAnalytics] = useState<FlowAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('active');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, a] = await Promise.all([getSessions(statusFilter), getFlowsAnalytics()]);
      setSessions(s);
      setAnalytics(a);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  // Aggregate stats
  const totalActive = analytics.reduce((s, a) => s + a.sessions.active, 0);
  const totalCompleted = analytics.reduce((s, a) => s + a.sessions.completed, 0);
  const totalError = analytics.reduce((s, a) => s + a.sessions.error, 0);
  const totalTakeover = analytics.reduce((s, a) => s + a.sessions.humanTakeover, 0);
  const avgCompletion = analytics.length
    ? Math.round(analytics.reduce((s, a) => s + a.completionRate, 0) / analytics.length)
    : 0;

  const statCards = [
    { label: 'Sesiones activas', value: totalActive, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Completadas', value: totalCompleted, color: 'text-gray-600', bg: 'bg-gray-50' },
    { label: 'Errores', value: totalError, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Atención humana', value: totalTakeover, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Completación promedio', value: `${avgCompletion}%`, color: 'text-blue-600', bg: 'bg-blue-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-2xl border border-brand-border/60 bg-white/90 p-6 shadow-brand-soft">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SignalIcon className="h-8 w-8 text-brand-primary" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">WhatsApp Agents</p>
              <h1 className="text-3xl font-semibold text-brand-dark">Sesiones y Analíticas</h1>
            </div>
          </div>
          <button onClick={load} className="inline-flex items-center gap-2 rounded-full border border-brand-border/60 px-4 py-2 text-sm text-brand-muted hover:bg-brand-surface transition">
            <ArrowPathIcon className="h-4 w-4" /> Actualizar
          </button>
        </div>
      </section>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {statCards.map(card => (
          <div key={card.label} className={`rounded-2xl border border-brand-border/40 ${card.bg} p-5`}>
            <p className="text-xs font-medium text-brand-muted">{card.label}</p>
            <p className={`text-3xl font-bold mt-1 ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Analytics per flow */}
      {analytics.length > 0 && (
        <section className="rounded-2xl border border-brand-border/60 bg-white/90 p-6 shadow-brand-soft">
          <h2 className="text-lg font-semibold text-brand-dark mb-4">Métricas por flujo</h2>
          <div className="space-y-3">
            {analytics.map(a => (
              <div key={a.flowId} className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-brand-dark truncate">{a.flowName}</p>
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                      a.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>{a.isActive ? 'Activo' : 'Inactivo'}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full bg-green-500 transition-all"
                      style={{ width: `${a.completionRate}%` }} />
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-brand-dark">{a.completionRate}%</p>
                  <p className="text-xs text-brand-muted">{a.sessions.total} total</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Sessions table */}
      <section className="rounded-2xl border border-brand-border/60 bg-white/90 shadow-brand-soft overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border/40">
          <h2 className="text-lg font-semibold text-brand-dark">Sesiones</h2>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="rounded-xl border border-brand-border/60 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30">
            <option value="active">Activas</option>
            <option value="error">Con error</option>
            <option value="human_takeover">Atención humana</option>
            <option value="all">Todas</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-brand-muted">
            <SignalIcon className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">No hay sesiones en este estado.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-border/40 bg-brand-surface/50">
                <th className="px-6 py-3 text-left font-semibold text-brand-muted">Chat</th>
                <th className="px-6 py-3 text-left font-semibold text-brand-muted">Flow</th>
                <th className="px-6 py-3 text-left font-semibold text-brand-muted">Nodo actual</th>
                <th className="px-6 py-3 text-center font-semibold text-brand-muted">Vars</th>
                <th className="px-6 py-3 text-center font-semibold text-brand-muted">Estado</th>
                <th className="px-6 py-3 text-left font-semibold text-brand-muted">Última actividad</th>
                <th className="px-6 py-3 text-right font-semibold text-brand-muted">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/20">
              {sessions.map(session => (
                <tr key={session.id} className="hover:bg-brand-surface/30 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-brand-muted">
                    {typeof session.chatId === 'object'
                      ? session.chatId.platformChatId
                      : String(session.chatId).slice(-8)}
                  </td>
                  <td className="px-6 py-4 text-xs text-brand-muted">
                    {String(session.flowId).slice(-8)}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-brand-dark max-w-xs truncate">
                    {session.currentNodeId}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-block rounded-full bg-brand-surface px-2.5 py-0.5 text-xs font-semibold text-brand-dark">
                      {session.variableCount ?? Object.keys(session.variables ?? {}).length}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <StatusBadge status={session.status} />
                  </td>
                  <td className="px-6 py-4 text-xs text-brand-muted">
                    {new Date(session.updatedAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => setDetailId(session.id)}
                      className="text-xs font-medium text-brand-primary hover:underline">
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {detailId && (
        <SessionDetail
          sessionId={detailId}
          onClose={() => setDetailId(null)}
          onClosed={load}
        />
      )}
    </div>
  );
};

export default Sessions;
