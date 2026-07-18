import { CLINICIAN_METRIC_FIELDS } from "@/lib/providerSchema";
import { formatValue } from "@/lib/format";
import { STATUS } from "@/components/charts/palette";
import {
  ProviderTargets,
  weeklyBaseTarget,
  cumulativeTurnoverSeries,
  baseTargetSeries,
  turnoverPacingPct,
} from "@/lib/providerCalc";

const HERO_METRIC_KEYS = ["ucva", "ncva", "completed_consults", "fba"] as const;

function heroStat(metrics: Record<string, unknown>, targets: Record<string, unknown>, key: string) {
  const field = CLINICIAN_METRIC_FIELDS.find((f) => f.key === key);
  if (!field) return null;
  const value = metrics[key];
  const target = targets[key];
  const numValue = typeof value === "number" ? value : null;
  const numTarget = typeof target === "number" ? target : null;
  const met =
    numValue !== null && numTarget !== null && field.betterWhen
      ? field.betterWhen === "higher"
        ? numValue >= numTarget
        : numValue <= numTarget
      : null;
  return {
    label: field.label,
    value: formatValue(numValue, field.type, field.decimals),
    color: met === null ? undefined : met ? STATUS.good : STATUS.critical,
  };
}

/**
 * Top-of-page snapshot for the senior physio meeting — this week's headline
 * KPIs plus turnover pacing, before the detailed scorecards further down.
 * Deliberately doesn't compute a "tier reached" verdict (see
 * lib/providerCalc.ts) — the tier thresholds are shown only as reference
 * ticks alongside the pacing bar, not an automated bonus decision.
 */
export function SeniorHeroSummary({
  targets,
  weeklyTurnover,
  currentMetrics,
  effectiveTargets,
}: {
  targets: ProviderTargets;
  weeklyTurnover: (number | null)[];
  currentMetrics: Record<string, unknown>;
  effectiveTargets: Record<string, unknown>;
}) {
  const base = weeklyBaseTarget(targets);
  const cumTO = cumulativeTurnoverSeries(weeklyTurnover);
  const baseTgt = baseTargetSeries(targets, weeklyTurnover.length);
  const pacing = turnoverPacingPct(cumTO[cumTO.length - 1] ?? 0, baseTgt[baseTgt.length - 1] ?? null);
  const bonusTiers = targets.bonus_tiers ?? {};
  const tierValues = [bonusTiers.t1, bonusTiers.t2, bonusTiers.t3, bonusTiers.t4].filter(
    (v): v is number => typeof v === "number"
  );
  const scaleMax = Math.max(100, pacing ?? 0, ...tierValues) * 1.05;

  return (
    <div className="rounded-xl border border-accent/30 bg-gradient-to-br from-accent/10 via-transparent to-accent-secondary/5 p-5">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-accent">This Week at a Glance</p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {HERO_METRIC_KEYS.map((key) => {
          const stat = heroStat(currentMetrics, effectiveTargets, key);
          if (!stat) return null;
          return (
            <div key={key}>
              <div className="text-[11px] uppercase tracking-wide text-muted">{stat.label}</div>
              <div className="text-2xl font-bold text-foreground" style={stat.color ? { color: stat.color } : undefined}>
                {stat.value}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 border-t border-accent/20 pt-4">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="text-xs font-medium text-muted">Turnover Pacing</span>
          <span className="text-sm font-semibold text-foreground">
            {pacing === null ? "—" : `${pacing.toFixed(1)}%`}
            <span className="ml-2 text-xs font-normal text-muted">
              {formatValue(cumTO[cumTO.length - 1] ?? 0, "currency")} cumulative
              {base !== null && ` vs ${formatValue(base, "currency")}/wk base target`}
            </span>
          </span>
        </div>
        {pacing !== null && (
          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-surface-raised">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${Math.min(100, (pacing / scaleMax) * 100)}%` }}
            />
            {tierValues.map((t, i) => (
              <div
                key={i}
                className="absolute top-0 h-full w-0.5 bg-foreground/50"
                style={{ left: `${Math.min(100, (t / scaleMax) * 100)}%` }}
                title={`Tier ${i + 1} reference: ${t}`}
              />
            ))}
          </div>
        )}
        {tierValues.length > 0 && (
          <p className="mt-1.5 text-[11px] text-muted">
            Vertical ticks are the configured T1-T4 reference thresholds — confirm the exact bonus formula with the
            business before treating pacing vs. a tick as a bonus verdict.
          </p>
        )}
      </div>
    </div>
  );
}
