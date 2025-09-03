interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-card-foreground" data-testid="page-title">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1" data-testid="page-subtitle">
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-chart-2 rounded-full"></div>
            <span data-testid="status-bot">Bot Active</span>
          </div>
        </div>
      </div>
    </header>
  );
}
