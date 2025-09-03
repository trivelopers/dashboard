import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { MessageSquare, MoreVertical } from "lucide-react";
import { type Contact } from "@shared/schema";

export default function Contacts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["/api/v1/contacts"],
    queryFn: async () => {
      const response = await api.getContacts();
      return response.json();
    },
  });

  const updateContactMutation = useMutation({
    mutationFn: async ({ id, requireAdmin }: { id: string; requireAdmin: boolean }) => {
      const response = await api.updateContact(id, { requireAdmin });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/contacts"] });
      toast({
        title: "Contact updated",
        description: "Admin requirement status has been updated",
      });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update contact admin requirement",
        variant: "destructive",
      });
    },
  });

  const filteredContacts = contacts.filter((contact: Contact) => {
    const matchesSearch = 
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.phoneNumber.includes(searchTerm);
    
    const matchesFilter = 
      filter === "all" ||
      (filter === "admin" && contact.requireAdmin) ||
      (filter === "standard" && !contact.requireAdmin);

    return matchesSearch && matchesFilter;
  });

  const handleToggleAdmin = (contactId: string, currentStatus: boolean) => {
    if (!hasRole(["ADMIN", "EDITOR"])) {
      toast({
        title: "Permission denied",
        description: "You don't have permission to edit contacts",
        variant: "destructive",
      });
      return;
    }

    updateContactMutation.mutate({
      id: contactId,
      requireAdmin: !currentStatus,
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatLastActivity = (lastActivity: string | null) => {
    if (!lastActivity) return "Never";
    
    const date = new Date(lastActivity);
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
    <ProtectedLayout title="Contacts" subtitle="Manage WhatsApp contacts and admin requirements">
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search contacts by name or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-contacts"
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-48" data-testid="select-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Contacts</SelectItem>
                <SelectItem value="admin">Admin Required</SelectItem>
                <SelectItem value="standard">Standard Contacts</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-border">
            <h3 className="text-lg font-semibold text-card-foreground">
              Contacts Management
            </h3>
            <p className="text-sm text-muted-foreground">
              Manage WhatsApp contacts and admin requirements
            </p>
          </div>

          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading contacts...</p>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">No contacts found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Contact
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Phone Number
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Last Activity
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Admin Required
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredContacts.map((contact: Contact) => (
                    <tr key={contact.id} className="hover:bg-muted/50" data-testid={`contact-row-${contact.id}`}>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-medium text-primary-foreground">
                              {getInitials(contact.name)}
                            </span>
                          </div>
                          <span className="font-medium text-card-foreground" data-testid={`contact-name-${contact.id}`}>
                            {contact.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-mono text-sm text-card-foreground" data-testid={`contact-phone-${contact.id}`}>
                          {contact.phoneNumber}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-muted-foreground" data-testid={`contact-activity-${contact.id}`}>
                          {formatLastActivity(contact.lastActivity)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <Switch
                          checked={contact.requireAdmin}
                          onCheckedChange={() => handleToggleAdmin(contact.id, contact.requireAdmin)}
                          disabled={!hasRole(["ADMIN", "EDITOR"]) || updateContactMutation.isPending}
                          data-testid={`toggle-admin-${contact.id}`}
                        />
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex gap-2">
                          <Link href={`/chats/${contact.id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              data-testid={`button-chat-${contact.id}`}
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
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
    </ProtectedLayout>
  );
}
