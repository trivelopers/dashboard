import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { updateBotSettingsSchema, type UpdateBotSettings } from "@shared/schema";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Save, RotateCcw, Info } from "lucide-react";

export default function Prompt() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: botSettings, isLoading } = useQuery({
    queryKey: ["/api/v1/botsettings"],
    queryFn: async () => {
      const response = await api.getBotSettings();
      return response.json();
    },
  });

  const form = useForm<UpdateBotSettings>({
    resolver: zodResolver(updateBotSettingsSchema),
    defaultValues: {
      promptSystem: "",
    },
  });

  // Update form when data loads
  if (botSettings && !form.getValues().promptSystem) {
    form.setValue("promptSystem", botSettings.promptSystem);
  }

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateBotSettings) => {
      const response = await api.updateBotSettings(data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/botsettings"] });
      toast({
        title: "Prompt updated",
        description: "System prompt has been saved successfully",
      });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update system prompt",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UpdateBotSettings) => {
    updateMutation.mutate(data);
  };

  const handleReset = () => {
    if (botSettings) {
      form.setValue("promptSystem", botSettings.promptSystem);
      toast({
        title: "Form reset",
        description: "Reverted to last saved version",
      });
    }
  };

  if (isLoading) {
    return (
      <ProtectedLayout
        title="System Prompt"
        subtitle="Configure how your chatbot responds to users"
        requiredRoles={["ADMIN", "EDITOR"]}
      >
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded w-64 mb-4"></div>
              <div className="h-64 bg-muted rounded"></div>
            </div>
          </CardContent>
        </Card>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout
      title="System Prompt"
      subtitle="Configure how your chatbot responds to users. This affects all conversations."
      requiredRoles={["ADMIN", "EDITOR"]}
    >
      <Card>
        <CardContent className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-card-foreground mb-2">
              System Prompt Configuration
            </h3>
            <p className="text-sm text-muted-foreground">
              Configure how your chatbot responds to users. This affects all conversations.
            </p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} data-testid="form-prompt">
            <div className="mb-4">
              <Label className="block text-sm font-medium text-card-foreground mb-2">
                Current System Prompt
              </Label>
              <Textarea
                className="h-64 font-mono text-sm resize-none"
                placeholder="Enter your system prompt..."
                {...form.register("promptSystem")}
                data-testid="textarea-prompt"
              />
              {form.formState.errors.promptSystem && (
                <p className="text-xs text-destructive mt-1">
                  {form.formState.errors.promptSystem.message}
                </p>
              )}
            </div>

            <div className="flex items-center gap-4 mb-6">
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                data-testid="button-save-prompt"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                data-testid="button-reset-prompt"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>

            <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                <div className="text-sm text-accent-foreground">
                  <p className="font-medium mb-1">Important Notes:</p>
                  <ul className="space-y-1 text-xs opacity-80">
                    <li>• Changes take effect immediately for new conversations</li>
                    <li>• Existing conversations will continue with the previous prompt until restarted</li>
                    <li>• Test your changes with a few contacts before widespread deployment</li>
                  </ul>
                </div>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </ProtectedLayout>
  );
}
