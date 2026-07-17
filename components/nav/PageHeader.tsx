import { ReactNode, Suspense } from "react";
import { WeekSelector } from "@/components/nav/WeekSelector";

export function PageHeader({
  title,
  subtitle,
  showWeekSelector = true,
  actions,
}: {
  title: string;
  subtitle?: string;
  showWeekSelector?: boolean;
  actions?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-background/90 px-8 py-4 backdrop-blur">
      <div>
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {actions}
        {showWeekSelector && (
          <Suspense fallback={null}>
            <WeekSelector />
          </Suspense>
        )}
      </div>
    </header>
  );
}
