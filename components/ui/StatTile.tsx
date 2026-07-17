import { STATUS } from "@/components/charts/palette";

function formatDelta(deltaPct: number | null) {
  if (deltaPct === null || Number.isNaN(deltaPct)) return null;
  const sign = deltaPct > 0 ? "+" : "";
  return `${sign}${deltaPct.toFixed(1)}%`;
}

export function StatTile({
  label,
  value,
  deltaPct = null,
  goodDirection = "up",
  sublabel,
}: {
  label: string;
  value: string;
  deltaPct?: number | null;
  goodDirection?: "up" | "down";
  sublabel?: string;
}) {
  const delta = formatDelta(deltaPct);
  const isGood =
    deltaPct !== null &&
    (goodDirection === "up" ? deltaPct >= 0 : deltaPct <= 0);

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-foreground">
        {value}
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs">
        {delta && (
          <span
            style={{ color: isGood ? STATUS.good : STATUS.critical }}
            className="font-medium"
          >
            {delta}
          </span>
        )}
        {sublabel && <span className="text-muted">{sublabel}</span>}
      </div>
    </div>
  );
}
