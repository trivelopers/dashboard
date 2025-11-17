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
