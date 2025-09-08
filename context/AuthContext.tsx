import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, Role } from '../types';
import api from '../services/api';

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
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuthStatus = useCallback(async () => {
    const accessToken = localStorage.getItem('accessToken');
    console.log('CheckAuthStatus - AccessToken exists:', !!accessToken);
    
    if (accessToken) {
        try {
            console.log('Calling /auth/me endpoint...');
            // The interceptor will add the token to the header
            const { data } = await api.get<{ user: any }>('/auth/me');
            console.log('Auth check successful, user:', data.user);
            setUser(transformUser(data.user));
        } catch (error: any) {
            console.error('Authentication check failed:', {
              status: error.response?.status,
              message: error.response?.data?.message || error.message
            });
            // Token might be invalid or expired, interceptor will try to refresh.
            // If refresh fails, user will be redirected. Here we just clear local state.
            localStorage.removeItem('accessToken');
            setUser(null);
        }
    } else {
        // No hay token, el usuario no está autenticado
        console.log('No access token found');
        setUser(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const login = async (credentials: { email: string; password: string }) => {
    try {
      const { data } = await api.post('/auth/login', credentials);
      localStorage.setItem('accessToken', data.accessToken);
      setUser(transformUser(data.user));
    } catch (error: any) {
      // Propagar el mensaje específico del backend
      const message = error.response?.data?.message || error.message || 'Error de autenticación';
      throw new Error(message);
    }
  }; 

  const logout = async () => {
    try {
        await api.post('/auth/logout');
    } catch (error) {
        console.error("Logout failed on the server, but logging out client-side.", error);
    } finally {
        localStorage.removeItem('accessToken');
        setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};