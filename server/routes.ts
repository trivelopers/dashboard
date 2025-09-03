import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  loginSchema, 
  insertUserSchema, 
  updateContactSchema, 
  updateBotSettingsSchema,
  type SessionUser 
} from "@shared/schema";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const COOKIE_NAME = "auth-token";

// Middleware to verify JWT token
const authenticateToken = async (req: any, res: any, next: any) => {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await storage.getUser(decoded.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Invalid or inactive user" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Middleware to check user roles
const requireRole = (roles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Enable cookie parsing
  const cookieParser = await import("cookie-parser");
  app.use(cookieParser.default());

  // Auth routes
  app.post("/api/v1/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(email);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (!user.isActive) {
        return res.status(401).json({ message: "Account is inactive" });
      }

      await storage.updateUserLastLogin(user.id);

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "24h" });
      
      res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });

      const sessionUser: SessionUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        lastLogin: user.lastLogin?.toISOString() || null,
        isActive: user.isActive,
      };

      res.json({ user: sessionUser });
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  app.post("/api/v1/auth/logout", (req, res) => {
    res.clearCookie(COOKIE_NAME);
    res.json({ message: "Logged out successfully" });
  });

  app.get("/api/v1/auth/me", authenticateToken, (req: any, res) => {
    const sessionUser: SessionUser = {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
      lastLogin: req.user.lastLogin?.toISOString() || null,
      isActive: req.user.isActive,
    };
    res.json({ user: sessionUser });
  });

  // Contacts routes
  app.get("/api/v1/contacts", authenticateToken, async (req, res) => {
    try {
      const contacts = await storage.getContacts();
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });

  app.patch("/api/v1/contacts/:id", authenticateToken, requireRole(["ADMIN", "EDITOR"]), async (req, res) => {
    try {
      const { id } = req.params;
      const updates = updateContactSchema.parse(req.body);
      
      const contact = await storage.updateContact(id, updates);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }

      res.json(contact);
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  // Bot settings routes
  app.get("/api/v1/botsettings", authenticateToken, async (req, res) => {
    try {
      const settings = await storage.getBotSettings();
      if (!settings) {
        return res.status(404).json({ message: "Bot settings not found" });
      }
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bot settings" });
    }
  });

  app.patch("/api/v1/botsettings", authenticateToken, requireRole(["ADMIN", "EDITOR"]), async (req, res) => {
    try {
      const updates = updateBotSettingsSchema.parse(req.body);
      const settings = await storage.updateBotSettings(updates);
      res.json(settings);
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  // Chat messages routes
  app.get("/api/v1/chats", authenticateToken, async (req, res) => {
    try {
      const { contactId } = req.query;
      if (!contactId || typeof contactId !== "string") {
        return res.status(400).json({ message: "Contact ID is required" });
      }

      const messages = await storage.getChatMessages(contactId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chat messages" });
    }
  });

  // Users routes
  app.get("/api/v1/users", authenticateToken, requireRole(["ADMIN"]), async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/v1/users", authenticateToken, requireRole(["ADMIN"]), async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      const { password, ...publicUser } = user;
      res.status(201).json(publicUser);
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  app.delete("/api/v1/users/:id", authenticateToken, requireRole(["ADMIN"]), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteUser(id);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Dashboard stats route
  app.get("/api/v1/dashboard/stats", authenticateToken, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
