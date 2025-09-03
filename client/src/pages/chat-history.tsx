import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield } from "lucide-react";
import { type ChatMessage, type Contact } from "@shared/schema";

export default function ChatHistory() {
  const { contactId } = useParams();

  const { data: contact } = useQuery({
    queryKey: ["/api/v1/contacts", contactId],
    queryFn: async () => {
      // We need to get contact details from the contacts list
      const response = await api.getContacts();
      const contacts = await response.json();
      return contacts.find((c: Contact) => c.id === contactId);
    },
    enabled: !!contactId,
  });

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["/api/v1/chats", contactId],
    queryFn: async () => {
      if (!contactId) return [];
      const response = await api.getChatMessages(contactId);
      return response.json();
    },
    enabled: !!contactId,
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatLastUpdate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return "Less than 1 hour ago";
    if (diffHours < 24) return `${diffHours} hours ago`;
    return date.toLocaleDateString();
  };

  if (!contactId) {
    return (
      <ProtectedLayout title="Chat History" subtitle="Contact not found">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Contact not found</p>
            <Link href="/contacts">
              <Button className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Contacts
              </Button>
            </Link>
          </CardContent>
        </Card>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout title="Chat History">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/contacts">
            <Button variant="ghost" data-testid="button-back-contacts">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Contacts
            </Button>
          </Link>
          {contact && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-primary-foreground">
                  {getInitials(contact.name)}
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-card-foreground" data-testid="contact-name">
                  {contact.name}
                </h3>
                <p className="text-sm text-muted-foreground font-mono" data-testid="contact-phone">
                  {contact.phoneNumber}
                </p>
              </div>
            </div>
          )}
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="p-4 border-b border-border bg-muted/50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-card-foreground">Chat History</span>
                {messages.length > 0 && (
                  <span className="text-xs text-muted-foreground" data-testid="last-updated">
                    Last updated: {formatLastUpdate(messages[messages.length - 1].timestamp)}
                  </span>
                )}
              </div>
            </div>

            <div className="h-96 overflow-y-auto p-4 space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">No messages found</p>
                </div>
              ) : (
                messages.map((message: ChatMessage) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    data-testid={`message-${message.id}`}
                  >
                    <div
                      className={`chat-bubble ${message.role} p-3 rounded-lg ${
                        message.role === "user"
                          ? "rounded-br-none bg-primary text-primary-foreground"
                          : "rounded-bl-none bg-card border border-border text-card-foreground"
                      }`}
                    >
                      <p className="text-sm" data-testid={`message-content-${message.id}`}>
                        {message.content}
                      </p>
                      <span
                        className={`text-xs mt-1 block ${
                          message.role === "user"
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground"
                        }`}
                        data-testid={`message-time-${message.id}`}
                      >
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {contact?.requireAdmin && (
          <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-accent-foreground mb-1">Admin Review Required</p>
                <p className="text-accent-foreground/80 text-xs">
                  This contact has been marked for admin review. Future messages will be held for approval.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}
