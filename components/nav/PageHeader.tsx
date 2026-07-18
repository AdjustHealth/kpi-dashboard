import { ReactNode, Suspense } from "react";
import Link from "next/link";
import { WeekSelector } from "@/components/nav/WeekSelector";

export function PageHeader({
  title,
  subtitle,
  showWeekSelector = true,
  showBack = true,
  actions,
}: {
  title: string;
  subtitle?: string;
  showWeekSelector?: boolean;
  /** Back-to-Dashboard link — on by default, turn off for the Dashboard page itself. */
  showBack?: boolean;
  actions?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-background/90 px-8 py-4 backdrop-blur">
      <div className="flex items-center gap-3">
        {showBack && (
          <Link
            href="/dashboard"
            title="Back to Dashboard"
            className="flex h-8 w-8 flex-none items-center justify-center rounded-md border border-border text-muted hover:border-accent hover:text-accent"
          >
            <span aria-hidden>←</span>
            <span className="sr-only">Back to Dashboard</span>
          </Link>
        )}
        <div>
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
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
