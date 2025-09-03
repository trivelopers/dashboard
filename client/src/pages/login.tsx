import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginData } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export default function Login() {
  const { user, login } = useAuth();
  const [, setLocation] = useLocation();

  const form = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (user) {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  const onSubmit = async (data: LoginData) => {
    try {
      await login(data);
    } catch (error) {
      // Error is handled in auth context
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-primary rounded-xl flex items-center justify-center">
              <Bot className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-semibold text-card-foreground" data-testid="login-title">
              ChatBot Manager
            </h1>
            <p className="text-muted-foreground mt-2">Sign in to your account</p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} data-testid="form-login">
            <div className="space-y-4">
              <div>
                <Label className="block text-sm font-medium text-card-foreground mb-2">
                  Email
                </Label>
                <Input
                  type="email"
                  placeholder="admin@company.com"
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
                <Label className="block text-sm font-medium text-card-foreground mb-2">
                  Password
                </Label>
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
            </div>

            <Button
              type="submit"
              className="w-full mt-6"
              disabled={form.formState.isSubmitting}
              data-testid="button-signin"
            >
              {form.formState.isSubmitting ? "Signing In..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
