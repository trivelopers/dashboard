import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

export function ProtectedRoute({ children, requiredRoles = [] }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
      return;
    }

    if (user && requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
      setLocation("/dashboard");
      return;
    }
  }, [user, isLoading, requiredRoles, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
