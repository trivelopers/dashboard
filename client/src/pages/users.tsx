import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { insertUserSchema, type InsertUser, type PublicUser } from "@shared/schema";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Edit, Trash2 } from "lucide-react";

export default function Users() {
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["/api/v1/users"],
    queryFn: async () => {
      const response = await api.getUsers();
      return response.json();
    },
  });

  const form = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
      role: "VIEWER",
      isActive: true,
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: InsertUser) => {
      const response = await api.createUser(data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/users"] });
      setIsAddUserOpen(false);
      form.reset();
      toast({
        title: "User created",
        description: "New user has been added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Creation failed",
        description: "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await api.deleteUser(userId);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/users"] });
      toast({
        title: "User deleted",
        description: "User has been removed successfully",
      });
    },
    onError: () => {
      toast({
        title: "Deletion failed",
        description: "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertUser) => {
    createUserMutation.mutate(data);
  };

  const handleDeleteUser = (userId: string) => {
    if (confirm("Are you sure you want to delete this user?")) {
      deleteUserMutation.mutate(userId);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "default";
      case "EDITOR":
        return "secondary";
      case "VIEWER":
        return "outline";
      default:
        return "outline";
    }
  };

  const formatLastLogin = (lastLogin: string | null) => {
    if (!lastLogin) return "Never";
    
    const date = new Date(lastLogin);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "Less than 1 hour ago";
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return "1 day ago";
    return `${diffDays} days ago`;
  };

  return (
    <ProtectedLayout
      title="Team Users"
      subtitle="Manage user access and permissions"
      requiredRoles={["ADMIN"]}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-card-foreground">Team Users</h3>
            <p className="text-sm text-muted-foreground">Manage user access and permissions</p>
          </div>
          <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-user">
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="form-add-user">
                <div>
                  <Label>Name</Label>
                  <Input
                    placeholder="John Doe"
                    {...form.register("name")}
                    data-testid="input-name"
                  />
                  {form.formState.errors.name && (
                    <p className="text-xs text-destructive mt-1">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="john@company.com"
                    {...form.register("email")}
                    data-testid="input-email"
                  />
                  {form.formState.errors.email && (
                    <p className="text-xs text-destructive mt-1">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label>Password</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    {...form.register("password")}
                    data-testid="input-password"
                  />
                  {form.formState.errors.password && (
                    <p className="text-xs text-destructive mt-1">
                      {form.formState.errors.password.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label>Role</Label>
                  <Select
                    value={form.watch("role")}
                    onValueChange={(value) => form.setValue("role", value as any)}
                  >
                    <SelectTrigger data-testid="select-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="EDITOR">Editor</SelectItem>
                      <SelectItem value="VIEWER">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button
                    type="submit"
                    disabled={createUserMutation.isPending}
                    data-testid="button-create-user"
                  >
                    {createUserMutation.isPending ? "Creating..." : "Create User"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddUserOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-2">Loading users...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                        User
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                        Role
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                        Last Login
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {users.map((user: PublicUser) => (
                      <tr key={user.id} className="hover:bg-muted/50" data-testid={`user-row-${user.id}`}>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-medium text-primary-foreground">
                                {getInitials(user.name)}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-card-foreground" data-testid={`user-name-${user.id}`}>
                                {user.name}
                              </p>
                              <p className="text-sm text-muted-foreground" data-testid={`user-email-${user.id}`}>
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <Badge variant={getRoleBadgeVariant(user.role)} data-testid={`user-role-${user.id}`}>
                            {user.role}
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-muted-foreground" data-testid={`user-login-${user.id}`}>
                            {formatLastLogin(user.lastLogin)}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-chart-2' : 'bg-muted-foreground'}`}></div>
                            <span className={`text-sm ${user.isActive ? 'text-chart-2' : 'text-muted-foreground'}`} data-testid={`user-status-${user.id}`}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" data-testid={`button-edit-${user.id}`}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteUser(user.id)}
                              disabled={deleteUserMutation.isPending}
                              data-testid={`button-delete-${user.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedLayout>
  );
}
