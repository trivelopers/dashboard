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
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface BotSettings {
    promptSystem: string;
}