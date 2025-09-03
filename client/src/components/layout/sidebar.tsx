import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  Bot, 
  LayoutDashboard, 
  Users, 
  MessageSquare, 
  Settings, 
  LogOut 
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["ADMIN", "EDITOR", "VIEWER"],
  },
  {
    name: "Contacts",
    href: "/contacts", 
    icon: Users,
    roles: ["ADMIN", "EDITOR", "VIEWER"],
  },
  {
    name: "System Prompt",
    href: "/prompt",
    icon: Settings,
    roles: ["ADMIN", "EDITOR"],
  },
  {
    name: "Team Users",
    href: "/users",
    icon: MessageSquare,
    roles: ["ADMIN"],
  },
];

export function Sidebar() {
  const { user, logout, hasRole } = useAuth();
  const [location] = useLocation();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
            <Bot className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          <span className="font-semibold text-sidebar-foreground">ChatBot Manager</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigation.map((item) => {
            if (!hasRole(item.roles)) return null;
            
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <li key={item.name}>
                <Link href={item.href}>
                  <a
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors ${
                      isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""
                    }`}
                    data-testid={`nav-${item.name.toLowerCase().replace(' ', '-')}`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </a>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-sidebar-border">
        {user && (
          <>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-primary-foreground">
                  {getInitials(user.name)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate" data-testid="user-name">
                  {user.name}
                </p>
                <p className="text-xs text-muted-foreground" data-testid="user-role">
                  {user.role}
                </p>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mb-2">Acme Corporation</div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs text-muted-foreground hover:text-sidebar-foreground"
              onClick={logout}
              data-testid="button-logout"
            >
              <LogOut className="h-3 w-3 mr-2" />
              Sign out
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
