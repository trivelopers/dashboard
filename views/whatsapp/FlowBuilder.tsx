import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow, Background, Controls, MiniMap,
  addEdge, applyNodeChanges, applyEdgeChanges,
  Handle, Position, type Node, type Edge,
  type OnNodesChange, type OnEdgesChange, type OnConnect,
  type NodeProps,
  MarkerType,
  useReactFlow, ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  ArrowLeftIcon, CloudArrowUpIcon, PlayIcon, StopIcon,
  XMarkIcon, CheckIcon, PlusIcon,
} from '@heroicons/react/24/solid';
import { getFlow, updateFlow, activateFlow, getAgents, getFunctions, getFlows } from '../../services/whatsappAgentApi';
import type { Flow, FlowNode as BackendNode, FlowEdge as BackendEdge, AgentDefinition, FunctionDefinition } from '../../types';

// ── Node type palette ─────────────────────────────────────────────

export interface NodeTypeMeta {
  type: string;
  label: string;
  color: string;
  bg: string;
  description: string;
}

const NODE_TYPES_META: NodeTypeMeta[] = [
  { type: 'template',      label: 'Plantilla Meta',  color: '#7c3aed', bg: '#f5f3ff', description: 'Envía plantilla aprobada por Meta' },
  { type: 'ai',            label: 'Agente IA',       color: '#2563eb', bg: '#eff6ff', description: 'Genera respuesta con IA' },
  { type: 'wait_input',    label: 'Esperar input',   color: '#d97706', bg: '#fffbeb', description: 'Espera respuesta del usuario' },
  { type: 'condition',     label: 'Condición',       color: '#ea580c', bg: '#fff7ed', description: 'Bifurcación condicional' },
  { type: 'switch',        label: 'Switch (menú)',   color: '#7e22ce', bg: '#faf5ff', description: 'Bifurcación multi-opción' },
  { type: 'jump_to_flow',  label: 'Saltar a flujo',  color: '#0369a1', bg: '#f0f9ff', description: 'Inicia otro flujo' },
  { type: 'function',      label: 'Función',         color: '#16a34a', bg: '#f0fdf4', description: 'Llama función externa' },
  { type: 'send_text',     label: 'Texto libre',     color: '#64748b', bg: '#f8fafc', description: 'Envía texto con variables' },
  { type: 'increment_var', label: 'Incrementar var', color: '#dc2626', bg: '#fef2f2', description: 'Incrementa variable de sesión' },
  { type: 'delay',         label: 'Delay',           color: '#0891b2', bg: '#ecfeff', description: 'Pausa de tiempo' },
  { type: 'assign_human',  label: 'Humano',          color: '#92400e', bg: '#fef3c7', description: 'Transfiere a humano' },
  { type: 'update_contact',label: 'Actualizar ctc',  color: '#15803d', bg: '#f0fdf4', description: 'Actualiza datos del contacto' },
];

const colorForType = (type: string) =>
  NODE_TYPES_META.find(n => n.type === type)?.color ?? '#64748b';
const bgForType = (type: string) =>
  NODE_TYPES_META.find(n => n.type === type)?.bg ?? '#f8fafc';
const labelForType = (type: string) =>
  NODE_TYPES_META.find(n => n.type === type)?.label ?? type;

// ── Custom node renderer ──────────────────────────────────────────

const FlowNodeComponent: React.FC<NodeProps> = ({ data, selected }) => {
  const color = colorForType(data.type as string);
  const bg = bgForType(data.type as string);
  // The label is the user-defined name; fall back to type-specific hints
  const displayName =
    (data.label as string) ||
    (data.config as Record<string,string>)?.templateName ||
    (data.config as Record<string,string>)?.saveInputTo ||
    (data.config as Record<string,string>)?.variable ||
    (data.id as string);
  return (
    <div style={{
      background: bg,
      border: `2px solid ${selected ? color : color + '55'}`,
      borderRadius: 12,
      minWidth: 160,
      maxWidth: 220,
      boxShadow: selected ? `0 0 0 3px ${color}33` : '0 2px 8px rgba(0,0,0,0.08)',
      transition: 'box-shadow 0.15s, border-color 0.15s',
    }}>
      <Handle type="target" position={Position.Top}
        style={{ background: color, width: 10, height: 10, border: '2px solid white' }} />
      <div style={{ padding: '10px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{
            display: 'inline-block', width: 8, height: 8,
            borderRadius: '50%', background: color, flexShrink: 0,
          }} />
          <span style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {labelForType(data.type as string)}
          </span>
        </div>
        {/* User-defined name — shown prominently */}
        <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: 0, wordBreak: 'break-word' }}>
          {displayName}
        </p>
      </div>
      <Handle type="source" position={Position.Bottom}
        style={{ background: color, width: 10, height: 10, border: '2px solid white' }} />
    </div>
  );
};

const nodeTypes = { default: FlowNodeComponent };

// ── Conversion helpers ────────────────────────────────────────────

const backendToRF = (backendNodes: BackendNode[], backendEdges: BackendEdge[]): { nodes: Node[], edges: Edge[] } => ({
  nodes: backendNodes.map(n => ({
    id: n.id,
    type: 'default',
    position: n.position,
    data: { ...n.config, type: n.type, id: n.id },
  })),
  edges: backendEdges.map(e => ({
    id: e.id,
    source: e.sourceNodeId,
    target: e.targetNodeId,
    label: e.label || undefined,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { strokeWidth: 2 },
    labelStyle: { fontSize: 11, fontWeight: 600 },
    labelBgStyle: { fill: '#fff', fillOpacity: 0.9 },
  })),
});

const rfToBackend = (nodes: Node[], edges: Edge[]): { nodes: BackendNode[], edges: BackendEdge[] } => ({
  nodes: nodes.map(n => ({
    id: n.id,
    type: n.data.type as string,
    position: n.position,
    config: (() => {
      const { type: _t, id: _i, ...rest } = n.data as Record<string, unknown>;
      return rest;
    })(),
  })),
  edges: edges.map(e => ({
    id: e.id,
    sourceNodeId: e.source,
    targetNodeId: e.target,
    label: (e.label as string) ?? '',
  })),
});

// ── Properties panel ──────────────────────────────────────────────

interface PropsPanelProps {
  node: Node | null;
  agents: AgentDefinition[];
  functions: FunctionDefinition[];
  flows: Flow[];
  currentFlowId: string;
  onChange: (id: string, data: Record<string, unknown>) => void;
  onClose: () => void;
}

const PropertiesPanel: React.FC<PropsPanelProps> = ({ node, agents, functions, flows, currentFlowId, onChange, onClose }) => {
  if (!node) return null;
  const type = node.data.type as string;
  const data = node.data as Record<string, unknown>;

  const update = (key: string, val: unknown) => onChange(node.id, { ...data, [key]: val });

  const inputCls = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30";
  const labelCls = "block text-xs font-medium text-gray-500 mb-1";

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div>
          <span className="text-xs font-bold uppercase tracking-wide" style={{ color: colorForType(type) }}>
            {labelForType(type)}
          </span>
          <p className="text-xs text-gray-400 font-mono mt-0.5">{node.id}</p>
        </div>
        <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100 transition">
          <XMarkIcon className="h-4 w-4 text-gray-400" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Universal: nombre del nodo */}
        <div>
          <label className={labelCls}>Nombre del nodo *</label>
          <input
            className={inputCls}
            value={(data.label as string) ?? ''}
            onChange={e => update('label', e.target.value)}
            placeholder={`ej. Menú principal`}
            autoFocus
          />
          <p className="mt-1 text-xs text-gray-400">Este nombre se muestra en el canvas para identificar el nodo.</p>
        </div>

        <hr className="border-gray-100" />
        {type === 'template' && (
          <>
            <div>
              <label className={labelCls}>Nombre de la plantilla</label>
              <input className={inputCls} value={(data.templateName as string) ?? ''}
                onChange={e => update('templateName', e.target.value)}
                placeholder="menu_principal" />
            </div>
            <div>
              <label className={labelCls}>Código de idioma</label>
              <input className={inputCls} value={(data.languageCode as string) ?? 'es'}
                onChange={e => update('languageCode', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Body template (variables {'{{var}}'})</label>
              <textarea className={inputCls + ' resize-none font-mono'} rows={3}
                value={(data.bodyTemplate as string) ?? ''}
                onChange={e => update('bodyTemplate', e.target.value)}
                placeholder="Hola {{contact.name}}" />
              <p className="mt-1 text-xs text-gray-400">Vacío = plantilla sin variables dinámicas.</p>
            </div>
            {/* Dynamic URL Buttons */}
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-blue-700">Botones URL dinámicos</p>
                <button
                  type="button"
                  onClick={() => {
                    const currentButtons = (data.urlButtons as Array<{ index: number; text: string; urlSuffix: string }>) ?? [];
                    let baseButtons = [...currentButtons];
                    if (baseButtons.length === 0 && data.urlButton) {
                      const oldBtn = data.urlButton as { text?: string; urlSuffix?: string };
                      baseButtons.push({ index: 0, text: oldBtn.text ?? '', urlSuffix: oldBtn.urlSuffix ?? '' });
                    }
                    const nextIndex = baseButtons.reduce((max, b) => Math.max(max, b.index), -1) + 1;
                    update('urlButtons', [...baseButtons, { index: nextIndex, text: '', urlSuffix: '' }]);
                  }}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  <PlusIcon className="h-3 w-3" /> Agregar botón
                </button>
              </div>
              <p className="text-xs text-blue-500">
                La URL base se define en Meta; acá solo el sufijo dinámico (la parte variable).
                El índice debe coincidir con el orden del botón en la plantilla de Meta (0 para el primero, 1 para el segundo).
              </p>

              {(() => {
                const rawButtons = (data.urlButtons as Array<{ index: number; text: string; urlSuffix: string }>) ?? [];
                const buttons = (rawButtons.length === 0 && data.urlButton)
                  ? [{ index: 0, text: (data.urlButton as any).text ?? '', urlSuffix: (data.urlButton as any).urlSuffix ?? '' }]
                  : rawButtons;

                const updateButton = (indexToUpdate: number, field: string, value: any) => {
                  const updated = buttons.map((btn, idx) => {
                    if (idx === indexToUpdate) {
                      return { ...btn, [field]: value };
                    }
                    return btn;
                  });
                  update('urlButtons', updated);
                  if (data.urlButton) {
                    onChange(node.id, { ...data, urlButton: undefined, urlButtons: updated });
                  }
                };

                const deleteButton = (indexToDelete: number) => {
                  const updated = buttons.filter((_, idx) => idx !== indexToDelete);
                  update('urlButtons', updated);
                  if (data.urlButton) {
                    onChange(node.id, { ...data, urlButton: undefined, urlButtons: updated });
                  }
                };

                return (
                  <div className="space-y-3">
                    {buttons.map((btn, idx) => (
                      <div key={idx} className="p-2.5 rounded border border-blue-200 bg-white/60 space-y-2 relative">
                        <button
                          type="button"
                          onClick={() => deleteButton(idx)}
                          className="absolute top-2 right-2 text-gray-400 hover:text-red-600"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-1">
                            <label className={labelCls}>Índice (Meta)</label>
                            <input
                              type="number"
                              className={inputCls}
                              value={btn.index}
                              onChange={e => updateButton(idx, 'index', Number(e.target.value))}
                              placeholder="0"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className={labelCls}>Texto del botón</label>
                            <input
                              className={inputCls}
                              value={btn.text}
                              onChange={e => updateButton(idx, 'text', e.target.value)}
                              placeholder="Modificar turno"
                            />
                          </div>
                        </div>
                        <div>
                          <label className={labelCls}>Sufijo URL</label>
                          <input
                            className={inputCls + ' font-mono text-xs'}
                            value={btn.urlSuffix}
                            onChange={e => updateButton(idx, 'urlSuffix', e.target.value)}
                            placeholder="{{session.token}}"
                          />
                        </div>
                      </div>
                    ))}
                    {buttons.length === 0 && (
                      <p className="text-xs text-gray-400 italic">No hay botones configurados.</p>
                    )}
                  </div>
                );
              })()}
            </div>
          </>
        )}

        {type === 'ai' && (
          <>
            <div>
              <label className={labelCls}>Agente IA</label>
              <select className={inputCls} value={(data.agentId as string) ?? ''}
                onChange={e => update('agentId', e.target.value)}>
                <option value="">— Seleccionar agente —</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Guardar respuesta en variable (opcional)</label>
              <input
                className={inputCls}
                value={(data.saveResponseTo as string) ?? ''}
                onChange={e => update('saveResponseTo', e.target.value)}
                placeholder="ej: lista_profesionales"
              />
              <p className="mt-1 text-xs text-gray-400">
                La respuesta se guarda en{' '}
                <code>session.{(data.saveResponseTo as string) || '...'}</code>
              </p>
            </div>
            {/* Silent mode toggle */}
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <input
                id={`silent-${node.id}`}
                type="checkbox"
                className="mt-0.5 h-4 w-4 cursor-pointer rounded accent-amber-500"
                checked={!!(data.silent)}
                onChange={e => update('silent', e.target.checked)}
              />
              <div>
                <label htmlFor={`silent-${node.id}`} className="cursor-pointer text-xs font-semibold text-amber-700">
                  Solo guardar (no enviar al usuario)
                </label>
                <p className="mt-0.5 text-xs text-amber-600">
                  Activá esto cuando usás el agente como <strong>preprocesador</strong>: la IA
                  formatea datos y los guarda en la variable, pero <strong>no envía nada</strong> por WhatsApp.
                  El nodo siguiente (ej: Texto libre) usa <code>{'{{session.' + ((data.saveResponseTo as string) || '...') + '}}'}</code> para enviar.
                </p>
              </div>
            </div>
          </>
        )}

        {type === 'wait_input' && (
          <div>
            <label className={labelCls}>Guardar en variable</label>
            <input className={inputCls} value={(data.saveInputTo as string) ?? ''}
              onChange={e => update('saveInputTo', e.target.value)}
              placeholder="opcion_elegida" />
            <p className="mt-1 text-xs text-gray-400">
              El input del usuario se guarda en <code>session.{(data.saveInputTo as string) || '...'}</code>
            </p>
          </div>
        )}

        {type === 'condition' && (
          <>
            <div>
              <label className={labelCls}>Variable</label>
              <input className={inputCls} value={(data.variable as string) ?? ''}
                onChange={e => update('variable', e.target.value)}
                placeholder="session.opcion_elegida" />
            </div>
            <div>
              <label className={labelCls}>Operador</label>
              <select className={inputCls} value={(data.operator as string) ?? 'eq'}
                onChange={e => update('operator', e.target.value)}>
                {['eq','neq','contains','contains_any','eq_any','gt','lt','gte','lte','exists','not_exists','not_empty','is_empty'].map(op => (
                  <option key={op} value={op}>{op}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Valor (array JSON para contains_any / eq_any)</label>
              <input className={inputCls} value={
                typeof data.value === 'string'
                  ? data.value
                  : JSON.stringify(data.value ?? '')
              } onChange={e => {
                try { update('value', JSON.parse(e.target.value)); }
                catch { update('value', e.target.value); }
              }} placeholder='["1", "turno", "obtener"]' />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Edge verdadero</label>
                <input className={inputCls} value={(data.trueEdgeLabel as string) ?? ''}
                  onChange={e => update('trueEdgeLabel', e.target.value)} placeholder="opcion1" />
              </div>
              <div>
                <label className={labelCls}>Edge falso</label>
                <input className={inputCls} value={(data.falseEdgeLabel as string) ?? ''}
                  onChange={e => update('falseEdgeLabel', e.target.value)} placeholder="invalido" />
              </div>
            </div>
          </>
        )}

        {type === 'function' && (
          <>
            <div>
              <label className={labelCls}>Función</label>
              <select className={inputCls} value={(data.functionId as string) ?? ''}
                onChange={e => update('functionId', e.target.value)}>
                <option value="">— Seleccionar función —</option>
                {functions.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Guardar resultado en</label>
              <input className={inputCls} value={(data.saveResultTo as string) ?? ''}
                onChange={e => update('saveResultTo', e.target.value)}
                placeholder="especialidades" />
            </div>
          </>
        )}

        {type === 'send_text' && (
          <div>
            <label className={labelCls}>Texto (soporta {'{{variable}}'})</label>
            <textarea className={inputCls + ' resize-none'} rows={4}
              value={(data.text as string) ?? ''}
              onChange={e => update('text', e.target.value)}
              placeholder="Hola {{contact.name}}, tu DNI es {{session.dni}}" />
          </div>
        )}

        {type === 'increment_var' && (
          <>
            <div>
              <label className={labelCls}>Variable</label>
              <input className={inputCls} value={(data.variable as string) ?? ''}
                onChange={e => update('variable', e.target.value)}
                placeholder="intento_menu" />
            </div>
            <div>
              <label className={labelCls}>Incremento</label>
              <input className={inputCls} type="number" value={String(data.amount ?? 1)}
                onChange={e => update('amount', Number(e.target.value))} />
            </div>
          </>
        )}

        {type === 'delay' && (
          <div>
            <label className={labelCls}>Duración (ms)</label>
            <input className={inputCls} type="number" value={String(data.durationMs ?? 1000)}
              onChange={e => update('durationMs', Number(e.target.value))} />
          </div>
        )}

        {type === 'assign_human' && (
          <div>
            <label className={labelCls}>Mensaje al agente (opcional)</label>
            <textarea className={inputCls + ' resize-none'} rows={3}
              value={(data.message as string) ?? ''}
              onChange={e => update('message', e.target.value)}
              placeholder="El paciente necesita ayuda con..." />
          </div>
        )}

        {type === 'update_contact' && (
          <div>
            <label className={labelCls}>Campo a actualizar</label>
            <input className={inputCls} value={(data.field as string) ?? ''}
              onChange={e => update('field', e.target.value)} placeholder="name" />
            <div className="mt-3">
              <label className={labelCls}>Valor (soporta {'{{variable}}'})</label>
              <input className={inputCls} value={(data.value as string) ?? ''}
                onChange={e => update('value', e.target.value)} placeholder="{{session.nombre}}" />
            </div>
          </div>
        )}

        {type === 'switch' && (() => {
          // cases is stored as an array of { value, edgeLabel }
          const rawCases = (data.cases as Array<{ value: string; edgeLabel: string }>) ?? [];
          const updateCases = (next: Array<{ value: string; edgeLabel: string }>) =>
            update('cases', next);
          return (
            <>
              <div>
                <label className={labelCls}>Variable de sesión a evaluar</label>
                <input className={inputCls} value={(data.variable as string) ?? ''}
                  onChange={e => update('variable', e.target.value)}
                  placeholder="menu_opcion" />
                <p className="mt-1 text-xs text-gray-400">
                  Ej: <code>menu_opcion</code> (sin llaves, el engine lo resuelve solo)
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={labelCls} style={{ marginBottom: 0 }}>Casos</label>
                  <button
                    type="button"
                    onClick={() => updateCases([...rawCases, { value: '', edgeLabel: '' }])}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <PlusIcon className="h-3 w-3" /> Agregar caso
                  </button>
                </div>
                <div className="space-y-2">
                  {rawCases.map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        className={inputCls}
                        style={{ flex: 1 }}
                        value={c.value}
                        onChange={e => {
                          const next = rawCases.map((x, j) => j === i ? { ...x, value: e.target.value } : x);
                          updateCases(next);
                        }}
                        placeholder={`Valor (ej: "${i + 1}")`}
                      />
                      <span className="text-gray-300 text-xs flex-shrink-0">→</span>
                      <input
                        className={inputCls}
                        style={{ flex: 1 }}
                        value={c.edgeLabel}
                        onChange={e => {
                          const next = rawCases.map((x, j) => j === i ? { ...x, edgeLabel: e.target.value } : x);
                          updateCases(next);
                        }}
                        placeholder="label arista"
                      />
                      <button
                        type="button"
                        onClick={() => updateCases(rawCases.filter((_, j) => j !== i))}
                        className="text-red-400 hover:text-red-600 flex-shrink-0"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                {rawCases.length === 0 && (
                  <p className="text-xs text-gray-400 italic">Sin casos. Agregá al menos uno.</p>
                )}
              </div>

              <div>
                <label className={labelCls}>Label de arista por defecto</label>
                <input className={inputCls} value={(data.defaultEdgeLabel as string) ?? 'invalido'}
                  onChange={e => update('defaultEdgeLabel', e.target.value)}
                  placeholder="invalido" />
                <p className="mt-1 text-xs text-gray-400">
                  Se usa cuando ningún caso coincide con la variable.
                </p>
              </div>
            </>
          );
        })()}

        {type === 'jump_to_flow' && (
          <>
            <div>
              <label className={labelCls}>Flujo de destino *</label>
              <select
                className={inputCls}
                value={(data.targetFlowId as string) ?? ''}
                onChange={e => update('targetFlowId', e.target.value)}
              >
                <option value="">— Seleccionar flujo —</option>
                {flows
                  .filter(f => f.id !== currentFlowId)
                  .map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name}{!f.isActive ? ' (inactivo)' : ''}
                    </option>
                  ))}
              </select>
              <p className="mt-1 text-xs text-gray-400">
                Solo se listan los flujos de este tenant. Los inactivos también pueden usarse como destino.
              </p>
            </div>
            <div>
              <label className={labelCls}>Mensaje antes de saltar (opcional)</label>
              <textarea className={inputCls + ' resize-none'} rows={3}
                value={(data.transferMessage as string) ?? ''}
                onChange={e => update('transferMessage', e.target.value)}
                placeholder="Un momento, te conecto con el proceso correspondiente..." />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ── Node Palette ──────────────────────────────────────────────────

interface PaletteProps {
  onDragStart: (type: string) => void;
}

const NodePalette: React.FC<PaletteProps> = ({ onDragStart }) => (
  <div className="flex flex-col h-full bg-gray-50 border-r border-gray-200">
    <div className="px-4 py-3 border-b border-gray-200">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nodos</p>
    </div>
    <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
      {NODE_TYPES_META.map(meta => (
        <div
          key={meta.type}
          draggable
          onDragStart={() => onDragStart(meta.type)}
          style={{ borderLeft: `3px solid ${meta.color}`, background: meta.bg }}
          className="rounded-lg px-3 py-2.5 cursor-grab active:cursor-grabbing select-none hover:opacity-90 transition-opacity"
        >
          <p className="text-xs font-bold" style={{ color: meta.color }}>{meta.label}</p>
          <p className="text-xs text-gray-400 mt-0.5 leading-tight">{meta.description}</p>
        </div>
      ))}
    </div>
  </div>
);

// ── Main FlowBuilder ──────────────────────────────────────────────

let _nodeIdCounter = 1;
const newNodeId = () => `node_${Date.now()}_${_nodeIdCounter++}`;

const FlowBuilderInner: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { screenToFlowPosition } = useReactFlow();

  const [flow, setFlow] = useState<Flow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  // Edge label editing state
  const [editingEdge, setEditingEdge] = useState<{ id: string; label: string } | null>(null);

  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [functions, setFunctions] = useState<FunctionDefinition[]>([]);
  const [flows, setFlows] = useState<Flow[]>([]);

  const dragTypeRef = useRef<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([getFlow(id), getAgents(), getFunctions(), getFlows()])
      .then(([f, a, fn, fl]) => {
        setFlow(f);
        setAgents(a);
        setFunctions(fn);
        setFlows(fl);
        const { nodes: n, edges: e } = backendToRF(f.nodes ?? [], f.edges ?? []);
        setNodes(n);
        setEdges(e);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const onNodesChange: OnNodesChange = useCallback(changes => {
    setNodes(ns => applyNodeChanges(changes, ns));
  }, []);

  const onEdgesChange: OnEdgesChange = useCallback(changes => {
    setEdges(es => applyEdgeChanges(changes, es));
  }, []);

  const onConnect: OnConnect = useCallback(params => {
    setEdges(es => addEdge({
      ...params,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { strokeWidth: 2 },
      labelStyle: { fontSize: 11, fontWeight: 600 },
      labelBgStyle: { fill: '#fff', fillOpacity: 0.9 },
    }, es));
  }, []);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setEditingEdge(null);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setEditingEdge(null);
  }, []);

  // Double-click on an edge → open label editor
  const onEdgeDoubleClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setEditingEdge({ id: edge.id, label: (edge.label as string) ?? '' });
    setSelectedNode(null);
  }, []);

  // Confirm edge label edit
  const commitEdgeLabel = useCallback(() => {
    if (!editingEdge) return;
    setEdges(es => es.map(e =>
      e.id === editingEdge.id ? { ...e, label: editingEdge.label } : e
    ));
    setEditingEdge(null);
  }, [editingEdge]);

  const handleNodeDataChange = useCallback((nodeId: string, newData: Record<string, unknown>) => {
    setNodes(ns => ns.map(n => n.id === nodeId ? { ...n, data: newData } : n));
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = dragTypeRef.current;
    if (!type) return;

    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    // Count existing nodes of same type to build a readable default name
    const sameTypeCount = nodes.filter(n => n.data.type === type).length;
    const defaultLabel = sameTypeCount === 0
      ? labelForType(type)
      : `${labelForType(type)} ${sameTypeCount + 1}`;

    const nodeId = newNodeId();
    const newNode: Node = {
      id: nodeId,
      type: 'default',
      position,
      data: { type, id: nodeId, label: defaultLabel },
    };
    setNodes(ns => [...ns, newNode]);
    // Auto-select the new node so the user can edit its name immediately
    setSelectedNode(newNode);
    dragTypeRef.current = null;
  }, [screenToFlowPosition, nodes]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleSave = async () => {
    if (!flow || !id) return;
    setSaving(true);
    try {
      const { nodes: backendNodes, edges: backendEdges } = rfToBackend(nodes, edges);
      await updateFlow(id, { nodes: backendNodes, edges: backendEdges });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleToggleActive = async () => {
    if (!flow || !id) return;
    await activateFlow(id, !flow.isActive);
    setFlow(f => f ? { ...f, isActive: !f.isActive } : f);
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
    </div>
  );

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 border-b border-gray-200 bg-white px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/whatsapp/flows')}
            className="rounded-full p-1.5 hover:bg-gray-100 transition">
            <ArrowLeftIcon className="h-4 w-4 text-gray-500" />
          </button>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{flow?.name}</p>
            <p className="text-xs text-gray-400">{nodes.length} nodos · {edges.length} conexiones</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleToggleActive}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition ${
              flow?.isActive
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}>
            {flow?.isActive ? <PlayIcon className="h-3.5 w-3.5" /> : <StopIcon className="h-3.5 w-3.5" />}
            {flow?.isActive ? 'Activo' : 'Inactivo'}
          </button>
          <button onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">
            {saved ? <CheckIcon className="h-4 w-4" /> : <CloudArrowUpIcon className="h-4 w-4" />}
            {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Palette */}
        <div className="w-48 flex-shrink-0">
          <NodePalette onDragStart={type => { dragTypeRef.current = type; }} />
        </div>

        {/* Canvas */}
        <div className="flex-1" style={{ position: 'relative' }} onDrop={onDrop} onDragOver={onDragOver}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onEdgeDoubleClick={onEdgeDoubleClick}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={20} color="#e2e8f0" />
            <Controls />
            <MiniMap nodeColor={n => colorForType(n.data?.type as string ?? '')} pannable zoomable />
          </ReactFlow>
          {/* Edge label editor overlay */}
          {editingEdge && (
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.15)', zIndex: 10,
            }} onClick={commitEdgeLabel}>
              <div
                style={{
                  background: 'white', borderRadius: 12, padding: '16px 20px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.18)', minWidth: 280,
                }}
                onClick={e => e.stopPropagation()}
              >
                <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8 }}>
                  LABEL DE LA ARISTA
                </p>
                <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 12 }}>
                  Debe coincidir exactamente con el <code>edgeLabel</code> del nodo Switch o Condición.
                </p>
                <input
                  autoFocus
                  style={{
                    width: '100%', border: '2px solid #3b82f6', borderRadius: 8,
                    padding: '8px 12px', fontSize: 14, fontWeight: 600,
                    outline: 'none', boxSizing: 'border-box',
                  }}
                  value={editingEdge.label}
                  onChange={e => setEditingEdge(prev => prev ? { ...prev, label: e.target.value } : null)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitEdgeLabel();
                    if (e.key === 'Escape') setEditingEdge(null);
                  }}
                  placeholder='ej: solicitar, invalido, hay_datos...'
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setEditingEdge(null)}
                    style={{
                      padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e8f0',
                      fontSize: 12, cursor: 'pointer', background: 'white', color: '#64748b',
                    }}
                  >Cancelar</button>
                  <button
                    onClick={commitEdgeLabel}
                    style={{
                      padding: '6px 14px', borderRadius: 8, border: 'none',
                      background: '#3b82f6', color: 'white', fontSize: 12,
                      fontWeight: 600, cursor: 'pointer',
                    }}
                  >Confirmar</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Properties panel */}
        <div className={`border-l border-gray-200 flex-shrink-0 overflow-hidden transition-all duration-200 ${selectedNode ? 'w-72' : 'w-0'}`}>
          {selectedNode && (
            <PropertiesPanel
              node={selectedNode}
              agents={agents}
              functions={functions}
              flows={flows}
              currentFlowId={id ?? ''}
              onChange={(id, data) => {
                handleNodeDataChange(id, data);
                setSelectedNode(prev => prev?.id === id ? { ...prev, data } : prev);
              }}
              onClose={() => setSelectedNode(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Wrap with ReactFlowProvider (required for useReactFlow hook)
const FlowBuilder: React.FC = () => (
  <ReactFlowProvider>
    <FlowBuilderInner />
  </ReactFlowProvider>
);

export default FlowBuilder;
