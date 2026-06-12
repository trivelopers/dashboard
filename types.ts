export enum Role {
  ADMIN = 'ADMIN',
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER',
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  clientId: string;
}

export interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
  requireAdmin: boolean;
  lastMessageAt: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'admin';
  text: string;
  timestamp: string | null;
  sender?: string | null;
  // Campos multimedia
  type?: 'text' | 'image' | 'file' | 'audio' | 'video';
  mediaUrl?: string | null;
  mediaType?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
}

export interface BotSettings {
    promptSystem: string;
}

export interface PromptHistoryEntry {
  id: string;
  clientId: string;
  prompt: string;
  createdAt: string;
  changedBy: {
    id: string;
    email: string;
    name?: string | null;
    role?: string | null;
  };
  changeType: string;
  changeDetail?: string | null;
  version: number;
}

// ── WhatsApp Agent Types ─────────────────────────────────────────────────────

export interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  aiProvider: 'openai' | 'anthropic' | null;
  aiModel: string | null;
  historyLimit: number | null;
  toolCallMode: 'auto' | 'explicit' | 'both';
  injectContactInfo: boolean;
  injectSessionVars: boolean;
  createdAt: string;
}

export interface FunctionParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
}

export interface FunctionDefinition {
  id: string;
  name: string;
  description: string;
  type: 'http' | 'db_query' | 'db_write';
  config: Record<string, unknown>;
  parameters: FunctionParameter[];
  createdAt: string;
}

export interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  config: Record<string, unknown>;
}

export interface FlowEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  label: string;
}

export interface Flow {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  triggerType: 'any_message' | 'keyword' | 'first_contact' | 'none';
  triggerKeywords: string[];
  nodes: FlowNode[];
  edges: FlowEdge[];
  createdAt: string;
}

export interface ConversationSession {
  id: string;
  chatId: string | { platformChatId: string };
  flowId: string;
  currentNodeId: string;
  variables: Record<string, unknown>;
  status: 'active' | 'completed' | 'human_takeover' | 'error';
  updatedAt: string;
  flowName?: string | null;
  currentNode?: FlowNode | null;
  variableCount?: number;
}

export interface FlowAnalytics {
  flowId: string;
  flowName: string;
  isActive: boolean;
  sessions: {
    total: number;
    completed: number;
    active: number;
    error: number;
    humanTakeover: number;
  };
  completionRate: number;
}

export interface WhatsappConfig {
  whatsapp: {
    phoneNumberId: string | null;
    verifyToken: string | null;
    wabaId: string | null;
    hasAccessToken: boolean;
    hasAppSecret: boolean;
  };
  ai: {
    provider: string | null;
    historyLimit: number;
    hasApiKey: boolean;
  };
}
