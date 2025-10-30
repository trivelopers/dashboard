import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, Role } from '../types';
import api, { setUnauthorizedHandler } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const transformUser = (backendUser: any): User => {
  const roleMap: { [key: string]: Role } = {
    admin: Role.ADMIN,
    editor: Role.EDITOR,
    user: Role.VIEWER,
    superadmin: Role.ADMIN,
  };

  return {
    id: backendUser.id,
    email: backendUser.email,
    name: backendUser.name,
    role: roleMap[(backendUser.role || 'user').toLowerCase()] || Role.VIEWER,
    clientId: backendUser.clientId,
  };
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user');
    if (!stored) {
      return null;
    }

    try {
      return JSON.parse(stored) as User;
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  const updateUser = useCallback((next: User | null) => {
    setUser(next);
    if (next) {
      localStorage.setItem('user', JSON.stringify(next));
    } else {
      localStorage.removeItem('user');
    }
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem('accessToken');
    updateUser(null);
  }, [updateUser]);

  const checkAuthStatus = useCallback(async () => {
    const accessToken = localStorage.getItem('accessToken');

    if (!accessToken) {
      updateUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data } = await api.get<{ user: any }>('/auth/me');
      updateUser(transformUser(data.user));
    } catch (error: any) {
      console.error('Authentication check failed:', {
        status: error?.response?.status,
        message: error?.response?.data?.message || error.message,
      });
      clearSession();
    } finally {
      setIsLoading(false);
    }
  }, [clearSession, updateUser]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession();
      setIsLoading(false);
    });

    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const login = async (credentials: { email: string; password: string }) => {
    try {
      const { data } = await api.post('/auth/login', credentials);
      localStorage.setItem('accessToken', data.accessToken);
      updateUser(transformUser(data.user));
    } catch (error: any) {
      const message = error?.response?.data?.message || error.message || 'Error de autenticación';
      throw new Error(message);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout failed on the server, but logging out client-side.', error);
    } finally {
      clearSession();
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
