/** Shared by any KPI tile row keyed off a due_status-style breakdown
 * (members/clients: active/on hold/overdue/due this week) — Adjust Gym's
 * Dashboard and My Dashboard's coaching load both use this same set. */
export const KPI_ICON_PATHS = {
  members: "M17 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 5 18.5V20m14 0v-1.5a3.4 3.4 0 0 0-2.5-3.3M15 3.4a3.5 3.5 0 0 1 0 6.7M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z",
  active: "m9 12 2 2 4-4",
  hold: "M9 4v16M15 4v16",
  overdue: "M12 8v5m0 3.5h.01M12 3.5 2.5 20h19L12 3.5Z",
  dueWeek: "M12 7v5l3 3M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
};

function KpiIcon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d={path} />
    </svg>
  );
}

/** A stat number with a colored top accent bar and matching icon chip —
 * originally the Adjust Gym Dashboard's KPI tiles, extracted here on second
 * use (My Dashboard's coaching load) so both stay visually identical. */
export function ColorKpiTile({ label, value, color, iconPath }: { label: string; value: string | number; color: string; iconPath: string }) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-surface p-4 transition-colors hover:border-border/80">
      <div className="absolute inset-x-0 top-0 h-0.5 opacity-70" style={{ background: color }} aria-hidden />
      <div className="flex items-center justify-between">
        <div className="font-display text-3xl font-bold leading-none" style={{ color }}>
          {value}
        </div>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ color, backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)` }}>
          <KpiIcon path={iconPath} />
        </div>
      </div>
      <div className="mt-2 text-xs font-medium text-muted">{label}</div>
    </div>
  );
}
