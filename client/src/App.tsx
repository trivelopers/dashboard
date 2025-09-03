import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/auth-context";

// Import pages
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Contacts from "@/pages/contacts";
import Prompt from "@/pages/prompt";
import Users from "@/pages/users";
import ChatHistory from "@/pages/chat-history";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/contacts" component={Contacts} />
      <Route path="/prompt" component={Prompt} />
      <Route path="/users" component={Users} />
      <Route path="/chats/:contactId" component={ChatHistory} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
