import api from './api';
import axios from 'axios';
import type {
  AgentDefinition,
  FunctionDefinition,
  Flow,
  ConversationSession,
  FlowAnalytics,
  WhatsappConfig,
} from '../types';

// Las rutas del módulo WhatsApp NO están bajo /api/v1 — usan /api/whatsapp/...
// Por eso creamos un cliente separado que apunta a la raíz del backend.
const backendRoot = ((import.meta as unknown as { env: Record<string, string> }).env.VITE_API_URL ?? '').replace(/\/api\/v1\/?$/, '');

const waApi = axios.create({
  baseURL: backendRoot,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Reusar el interceptor de autenticación del cliente principal
waApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

// ── Agents ────────────────────────────────────────────────────────

export const getAgents = async (): Promise<AgentDefinition[]> => {
  const { data } = await waApi.get<{ agents: AgentDefinition[] }>('/api/whatsapp/agents');
  return data.agents ?? (data as unknown as AgentDefinition[]);
};

export const createAgent = async (payload: Partial<AgentDefinition> & { aiApiKey?: string }): Promise<AgentDefinition> => {
  const { data } = await waApi.post<{ agent: AgentDefinition }>('/api/whatsapp/agents', payload);
  return data.agent ?? (data as unknown as AgentDefinition);
};

export const updateAgent = async (id: string, payload: Partial<AgentDefinition> & { aiApiKey?: string }): Promise<AgentDefinition> => {
  const { data } = await waApi.put<{ agent: AgentDefinition }>(`/api/whatsapp/agents/${id}`, payload);
  return data.agent ?? (data as unknown as AgentDefinition);
};

export const deleteAgent = async (id: string): Promise<void> => {
  await waApi.delete(`/api/whatsapp/agents/${id}`);
};

// ── Functions ─────────────────────────────────────────────────────

export const getFunctions = async (): Promise<FunctionDefinition[]> => {
  const { data } = await waApi.get<FunctionDefinition[]>('/api/whatsapp/functions');
  return Array.isArray(data) ? data : (data as unknown as { functions: FunctionDefinition[] }).functions ?? [];
};

export const createFunction = async (payload: Partial<FunctionDefinition>): Promise<FunctionDefinition> => {
  const { data } = await waApi.post<FunctionDefinition>('/api/whatsapp/functions', payload);
  return data;
};

export const updateFunction = async (id: string, payload: Partial<FunctionDefinition>): Promise<FunctionDefinition> => {
  const { data } = await waApi.put<FunctionDefinition>(`/api/whatsapp/functions/${id}`, payload);
  return data;
};

export const deleteFunction = async (id: string): Promise<void> => {
  await waApi.delete(`/api/whatsapp/functions/${id}`);
};

// ── Flows ─────────────────────────────────────────────────────────

export const getFlows = async (): Promise<Flow[]> => {
  const { data } = await waApi.get<{ flows: Flow[] }>('/api/whatsapp/flows');
  return data.flows ?? (data as unknown as Flow[]);
};

export const getFlow = async (id: string): Promise<Flow> => {
  const { data } = await waApi.get<{ flow: Flow }>(`/api/whatsapp/flows/${id}`);
  return data.flow ?? (data as unknown as Flow);
};

export const createFlow = async (payload: Partial<Flow>): Promise<Flow> => {
  const { data } = await waApi.post<{ flow: Flow }>('/api/whatsapp/flows', payload);
  return data.flow ?? (data as unknown as Flow);
};

export const updateFlow = async (id: string, payload: Partial<Flow>): Promise<Flow> => {
  const { data } = await waApi.put<{ flow: Flow }>(`/api/whatsapp/flows/${id}`, payload);
  return data.flow ?? (data as unknown as Flow);
};

export const activateFlow = async (id: string, isActive: boolean): Promise<Flow> => {
  const { data } = await waApi.patch<{ flow: Flow }>(`/api/whatsapp/flows/${id}/activate`, { isActive });
  return data.flow ?? (data as unknown as Flow);
};

export const deleteFlow = async (id: string): Promise<void> => {
  await waApi.delete(`/api/whatsapp/flows/${id}`);
};

// ── Sessions ──────────────────────────────────────────────────────

export const getSessions = async (status = 'active'): Promise<ConversationSession[]> => {
  const { data } = await waApi.get<{ sessions: ConversationSession[] }>('/api/whatsapp/sessions', {
    params: { status },
  });
  return data.sessions;
};

export const getSession = async (id: string): Promise<ConversationSession> => {
  const { data } = await waApi.get<{ session: ConversationSession }>(`/api/whatsapp/sessions/${id}`);
  return data.session;
};

export const closeSession = async (id: string): Promise<void> => {
  await waApi.delete(`/api/whatsapp/sessions/${id}`);
};

// ── Analytics ─────────────────────────────────────────────────────

export const getFlowsAnalytics = async (): Promise<FlowAnalytics[]> => {
  const { data } = await waApi.get<{ analytics: FlowAnalytics[] }>('/api/whatsapp/analytics/flows');
  return data.analytics;
};

// ── WhatsApp Config ───────────────────────────────────────────────

export const getWhatsappConfig = async (clientId: string): Promise<WhatsappConfig> => {
  const { data } = await waApi.get<WhatsappConfig>(`/api/clients/${clientId}/whatsapp`);
  return data;
};

export const updateWhatsappConfig = async (
  clientId: string,
  payload: Partial<WhatsappConfig['whatsapp']> & Record<string, string>
): Promise<void> => {
  await waApi.patch(`/api/clients/${clientId}/whatsapp`, payload);
};

export const updateAiConfig = async (
  clientId: string,
  payload: Partial<WhatsappConfig['ai']> & { apiKey?: string } & Record<string, unknown>
): Promise<void> => {
  await waApi.patch(`/api/clients/${clientId}/ai`, payload);
};
