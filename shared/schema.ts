import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table for authentication and team management
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role", { enum: ["ADMIN", "EDITOR", "VIEWER"] }).notNull().default("VIEWER"),
  lastLogin: timestamp("last_login"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Contacts table for WhatsApp contacts
export const contacts = pgTable("contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phoneNumber: text("phone_number").notNull().unique(),
  requireAdmin: boolean("require_admin").notNull().default(false),
  lastActivity: timestamp("last_activity"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Bot settings table for system configuration
export const botSettings = pgTable("bot_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  promptSystem: text("prompt_system").notNull(),
  clientName: text("client_name").notNull().default("Default Client"),
  isActive: boolean("is_active").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Chat messages table for conversation history
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contactId: varchar("contact_id").notNull().references(() => contacts.id),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastLogin: true,
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true,
  lastActivity: true,
});

export const insertBotSettingsSchema = createInsertSchema(botSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  timestamp: true,
});

// Login schema
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Update schemas
export const updateContactSchema = z.object({
  requireAdmin: z.boolean(),
});

export const updateBotSettingsSchema = z.object({
  promptSystem: z.string().min(1),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type PublicUser = Omit<User, 'password'>;

export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contacts.$inferSelect;

export type InsertBotSettings = z.infer<typeof insertBotSettingsSchema>;
export type BotSettings = typeof botSettings.$inferSelect;

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

export type LoginData = z.infer<typeof loginSchema>;
export type UpdateContact = z.infer<typeof updateContactSchema>;
export type UpdateBotSettings = z.infer<typeof updateBotSettingsSchema>;

export type UserRole = "ADMIN" | "EDITOR" | "VIEWER";

// Session user type
export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  lastLogin: string | null;
  isActive: boolean;
};
