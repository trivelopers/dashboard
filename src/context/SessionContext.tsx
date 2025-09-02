'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';

export type Role = 'ADMIN' | 'EDITOR' | 'VIEWER';
export interface User {
  id: string;
  email: string;
  role: Role;
}

interface SessionContextProps {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextProps>({
  user: null,
  login: async () => {},
  logout: async () => {}
});

export const SessionProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  const fetchMe = async () => {
    try {
      const { data } = await axios.get<User>('/api/v1/me/', { withCredentials: true });
      setUser(data);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    fetchMe();
  }, []);

  const login = async (email: string, password: string) => {
    await axios.post('/api/v1/auth/login/', { email, password }, { withCredentials: true });
    await fetchMe();
  };

  const logout = async () => {
    await axios.post('/api/v1/auth/logout/', {}, { withCredentials: true });
    Cookies.remove('csrftoken');
    setUser(null);
  };

  return (
    <SessionContext.Provider value={{ user, login, logout }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => useContext(SessionContext);
