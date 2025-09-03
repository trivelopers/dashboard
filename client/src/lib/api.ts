import { apiRequest } from "./queryClient";

export const api = {
  // Auth endpoints
  login: (credentials: { email: string; password: string }) =>
    apiRequest("POST", "/api/v1/auth/login", credentials),
  
  logout: () =>
    apiRequest("POST", "/api/v1/auth/logout"),
  
  getCurrentUser: () =>
    apiRequest("GET", "/api/v1/auth/me"),

  // Contacts endpoints
  getContacts: () =>
    apiRequest("GET", "/api/v1/contacts"),
  
  updateContact: (id: string, data: { requireAdmin: boolean }) =>
    apiRequest("PATCH", `/api/v1/contacts/${id}`, data),

  // Bot settings endpoints
  getBotSettings: () =>
    apiRequest("GET", "/api/v1/botsettings"),
  
  updateBotSettings: (data: { promptSystem: string }) =>
    apiRequest("PATCH", "/api/v1/botsettings", data),

  // Chat messages endpoints
  getChatMessages: (contactId: string) =>
    apiRequest("GET", `/api/v1/chats?contactId=${contactId}`),

  // Users endpoints
  getUsers: () =>
    apiRequest("GET", "/api/v1/users"),
  
  createUser: (data: { email: string; password: string; name: string; role: string }) =>
    apiRequest("POST", "/api/v1/users", data),
  
  deleteUser: (id: string) =>
    apiRequest("DELETE", `/api/v1/users/${id}`),

  // Dashboard endpoints
  getDashboardStats: () =>
    apiRequest("GET", "/api/v1/dashboard/stats"),
};
