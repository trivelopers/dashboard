import { createContext, useContext, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type SessionUser } from "@shared/schema";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: SessionUser | null;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Check current user on app load
  const { isLoading } = useQuery({
    queryKey: ["/api/v1/auth/me"],
    queryFn: async () => {
      try {
        const response = await api.getCurrentUser();
        const data = await response.json();
        setUser(data.user);
        return data.user;
      } catch (error) {
        setUser(null);
        return null;
      }
    },
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await api.login(credentials);
      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      setUser(data.user);
      queryClient.invalidateQueries();
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: api.logout,
    onSuccess: () => {
      setUser(null);
      queryClient.clear();
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
    },
  });

  const login = async (credentials: { email: string; password: string }) => {
    await loginMutation.mutateAsync(credentials);
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const hasRole = (roles: string[]): boolean => {
    return user ? roles.includes(user.role) : false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
