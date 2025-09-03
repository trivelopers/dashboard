import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Shield, MessageSquare } from "lucide-react";

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/v1/dashboard/stats"],
    queryFn: async () => {
      const response = await api.getDashboardStats();
      return response.json();
    },
  });

  const statCards = [
    {
      title: "Total Contacts",
      value: stats?.totalContacts || 0,
      icon: Users,
      color: "chart-1",
    },
    {
      title: "Admin Required",
      value: stats?.adminRequired || 0,
      icon: Shield,
      color: "chart-3",
    },
    {
      title: "Messages Today",
      value: stats?.messagestoday || 0,
      icon: MessageSquare,
      color: "chart-2",
    },
  ];

  const recentActivity = [
    {
      id: 1,
      type: "message",
      title: "New message from +1234567890",
      time: "2 minutes ago",
      icon: MessageSquare,
      color: "primary",
    },
    {
      id: 2,
      type: "admin",
      title: "Contact marked for admin review",
      time: "15 minutes ago",
      icon: Shield,
      color: "chart-3",
    },
    {
      id: 3,
      type: "settings",
      title: "System prompt updated",
      time: "1 hour ago",
      icon: Users,
      color: "chart-2",
    },
  ];

  if (isLoading) {
    return (
      <ProtectedLayout title="Dashboard" subtitle="Acme Corporation Bot Management">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-24 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-16"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout title="Dashboard" subtitle="Acme Corporation Bot Management">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p 
                      className="text-2xl font-semibold text-card-foreground" 
                      data-testid={`stat-${stat.title.toLowerCase().replace(' ', '-')}`}
                    >
                      {stat.value}
                    </p>
                  </div>
                  <div 
                    className={`w-12 h-12 bg-${stat.color} bg-opacity-20 rounded-lg flex items-center justify-center`}
                  >
                    <Icon className={`h-6 w-6 text-${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4">
            Recent Activity
          </h3>
          <div className="space-y-4">
            {recentActivity.map((activity) => {
              const Icon = activity.icon;
              return (
                <div 
                  key={activity.id} 
                  className="flex items-center gap-4 py-3 border-b border-border last:border-b-0"
                  data-testid={`activity-${activity.id}`}
                >
                  <div 
                    className={`w-10 h-10 bg-${activity.color} bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0`}
                  >
                    <Icon className={`h-4 w-4 text-${activity.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-card-foreground">
                      {activity.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.time}
                    </p>
                  </div>
                  <button className="text-primary hover:text-primary/80 text-sm">
                    View
                  </button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </ProtectedLayout>
  );
}
