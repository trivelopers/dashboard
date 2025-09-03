import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { ProtectedRoute } from "@/components/auth/protected-route";

interface ProtectedLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  requiredRoles?: string[];
}

export function ProtectedLayout({ 
  children, 
  title, 
  subtitle, 
  requiredRoles 
}: ProtectedLayoutProps) {
  return (
    <ProtectedRoute requiredRoles={requiredRoles}>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header title={title} subtitle={subtitle} />
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
