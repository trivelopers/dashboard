import { 
  type User, 
  type InsertUser, 
  type Contact, 
  type InsertContact,
  type BotSettings,
  type InsertBotSettings,
  type ChatMessage,
  type InsertChatMessage,
  type UpdateContact,
  type UpdateBotSettings,
  type PublicUser,
  type SessionUser
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserLastLogin(id: string): Promise<void>;
  getUsers(): Promise<PublicUser[]>;
  deleteUser(id: string): Promise<void>;

  // Contact methods
  getContacts(): Promise<Contact[]>;
  getContact(id: string): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: string, updates: UpdateContact): Promise<Contact | undefined>;
  deleteContact(id: string): Promise<void>;

  // Bot settings methods
  getBotSettings(): Promise<BotSettings | undefined>;
  updateBotSettings(updates: UpdateBotSettings): Promise<BotSettings>;
  createBotSettings(settings: InsertBotSettings): Promise<BotSettings>;

  // Chat message methods
  getChatMessages(contactId: string): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;

  // Dashboard stats
  getDashboardStats(): Promise<{
    totalContacts: number;
    adminRequired: number;
    messagestoday: number;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private contacts: Map<string, Contact>;
  private botSettings: BotSettings | undefined;
  private chatMessages: Map<string, ChatMessage>;

  constructor() {
    this.users = new Map();
    this.contacts = new Map();
    this.chatMessages = new Map();
    this.initializeData();
  }

  private initializeData() {
    // Create default admin user
    const adminId = randomUUID();
    const admin: User = {
      id: adminId,
      email: "admin@company.com",
      password: "password", // In real app, this would be hashed
      name: "John Doe",
      role: "ADMIN",
      lastLogin: new Date(),
      isActive: true,
      createdAt: new Date(),
    };
    this.users.set(adminId, admin);

    // Create editor user
    const editorId = randomUUID();
    const editor: User = {
      id: editorId,
      email: "editor@company.com",
      password: "password",
      name: "Sarah Miller",
      role: "EDITOR",
      lastLogin: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      isActive: true,
      createdAt: new Date(),
    };
    this.users.set(editorId, editor);

    // Create viewer user
    const viewerId = randomUUID();
    const viewer: User = {
      id: viewerId,
      email: "viewer@company.com",
      password: "password",
      name: "Mike Johnson",
      role: "VIEWER",
      lastLogin: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      isActive: false,
      createdAt: new Date(),
    };
    this.users.set(viewerId, viewer);

    // Create sample contacts
    const contact1Id = randomUUID();
    const contact1: Contact = {
      id: contact1Id,
      name: "John Customer",
      phoneNumber: "+1234567890",
      requireAdmin: false,
      lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      createdAt: new Date(),
    };
    this.contacts.set(contact1Id, contact1);

    const contact2Id = randomUUID();
    const contact2: Contact = {
      id: contact2Id,
      name: "Sarah Customer",
      phoneNumber: "+1987654321",
      requireAdmin: true,
      lastActivity: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      createdAt: new Date(),
    };
    this.contacts.set(contact2Id, contact2);

    // Create default bot settings
    this.botSettings = {
      id: randomUUID(),
      promptSystem: `You are a helpful AI assistant for Acme Corporation. You should:
1. Always be professional and courteous
2. Provide accurate information about our products and services
3. If you don't know something, admit it and offer to connect them with a human
4. Keep responses concise but helpful
5. Use a friendly tone while maintaining professionalism

When a user asks about pricing, always direct them to our sales team.
For technical support questions, gather their contact information and issue details.`,
      clientName: "Acme Corporation",
      isActive: true,
      updatedAt: new Date(),
    };

    // Create sample chat messages
    const messages = [
      {
        id: randomUUID(),
        contactId: contact1Id,
        role: "assistant" as const,
        content: "Hello! How can I help you today?",
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      },
      {
        id: randomUUID(),
        contactId: contact1Id,
        role: "user" as const,
        content: "Hi, I'm interested in your pricing plans.",
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000 + 2 * 60 * 1000),
      },
      {
        id: randomUUID(),
        contactId: contact1Id,
        role: "assistant" as const,
        content: "Great! I'd be happy to help you with pricing information. Let me connect you with our sales team who can provide you with detailed pricing based on your specific needs.",
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000 + 3 * 60 * 1000),
      },
      {
        id: randomUUID(),
        contactId: contact1Id,
        role: "user" as const,
        content: "That would be perfect, thanks!",
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000 + 4 * 60 * 1000),
      },
      {
        id: randomUUID(),
        contactId: contact1Id,
        role: "assistant" as const,
        content: "I've notified our sales team. Someone will reach out to you within the next business day. Is there anything else I can help you with in the meantime?",
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000 + 5 * 60 * 1000),
      },
    ];

    messages.forEach(msg => this.chatMessages.set(msg.id, msg));
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      createdAt: new Date(),
      lastLogin: null,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserLastLogin(id: string): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.lastLogin = new Date();
      this.users.set(id, user);
    }
  }

  async getUsers(): Promise<PublicUser[]> {
    return Array.from(this.users.values()).map(({ password, ...user }) => user);
  }

  async deleteUser(id: string): Promise<void> {
    this.users.delete(id);
  }

  async getContacts(): Promise<Contact[]> {
    return Array.from(this.contacts.values()).sort((a, b) => 
      (b.lastActivity?.getTime() || 0) - (a.lastActivity?.getTime() || 0)
    );
  }

  async getContact(id: string): Promise<Contact | undefined> {
    return this.contacts.get(id);
  }

  async createContact(insertContact: InsertContact): Promise<Contact> {
    const id = randomUUID();
    const contact: Contact = {
      ...insertContact,
      id,
      createdAt: new Date(),
      lastActivity: null,
    };
    this.contacts.set(id, contact);
    return contact;
  }

  async updateContact(id: string, updates: UpdateContact): Promise<Contact | undefined> {
    const contact = this.contacts.get(id);
    if (contact) {
      const updated = { ...contact, ...updates };
      this.contacts.set(id, updated);
      return updated;
    }
    return undefined;
  }

  async deleteContact(id: string): Promise<void> {
    this.contacts.delete(id);
  }

  async getBotSettings(): Promise<BotSettings | undefined> {
    return this.botSettings;
  }

  async updateBotSettings(updates: UpdateBotSettings): Promise<BotSettings> {
    if (this.botSettings) {
      this.botSettings = {
        ...this.botSettings,
        ...updates,
        updatedAt: new Date(),
      };
    } else {
      this.botSettings = {
        id: randomUUID(),
        ...updates,
        clientName: "Default Client",
        isActive: true,
        updatedAt: new Date(),
      };
    }
    return this.botSettings;
  }

  async createBotSettings(settings: InsertBotSettings): Promise<BotSettings> {
    this.botSettings = {
      ...settings,
      id: randomUUID(),
      updatedAt: new Date(),
    };
    return this.botSettings;
  }

  async getChatMessages(contactId: string): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values())
      .filter(msg => msg.contactId === contactId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const id = randomUUID();
    const message: ChatMessage = {
      ...insertMessage,
      id,
      timestamp: new Date(),
    };
    this.chatMessages.set(id, message);
    return message;
  }

  async getDashboardStats(): Promise<{
    totalContacts: number;
    adminRequired: number;
    messagestoday: number;
  }> {
    const contacts = Array.from(this.contacts.values());
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const messagestoday = Array.from(this.chatMessages.values())
      .filter(msg => msg.timestamp >= today).length;

    return {
      totalContacts: contacts.length,
      adminRequired: contacts.filter(c => c.requireAdmin).length,
      messagestoday,
    };
  }
}

export const storage = new MemStorage();
