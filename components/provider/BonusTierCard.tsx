"use client";

import { Card } from "@/components/ui/Card";
import { MultiLineChart } from "@/components/charts/MultiLineChart";
import { STATUS } from "@/components/charts/palette";
import { formatWeekLabel } from "@/lib/week";
import { formatValue } from "@/lib/format";
import {
  baseTargetSeries,
  compoundingTrendSeries,
  cumulativeTurnoverSeries,
  turnoverPacingPct,
  weeklyBaseTarget,
  ProviderTargets,
} from "@/lib/providerCalc";

export function BonusTierCard({
  targets,
  weeklyTurnover,
  weekLabels,
  jbvHistory,
  bonusMetricHistory,
}: {
  targets: ProviderTargets;
  weeklyTurnover: (number | null)[];
  weekLabels: string[];
  jbvHistory: (number | null)[];
  /** This provider's own bonus-linked specialty figure (e.g. Sam's Gym Memberships, Marcio's Headache Consults) — see providers.targets.bonus_metric_key/bonus_metric_label. */
  bonusMetricHistory?: (number | null)[];
}) {
  const base = weeklyBaseTarget(targets);
  const cumTO = cumulativeTurnoverSeries(weeklyTurnover);
  const baseTgt = baseTargetSeries(targets, weekLabels.length);
  const pacing = turnoverPacingPct(cumTO[cumTO.length - 1] ?? 0, baseTgt[baseTgt.length - 1] ?? null);
  const bonusTiers = targets.bonus_tiers ?? {};
  const onTarget = pacing !== null && pacing >= 100;

  const turnoverChartData = weekLabels.map((week_ending, i) => ({
    label: formatWeekLabel(week_ending),
    "Cumulative Turnover": cumTO[i],
    "Base Target": baseTgt[i],
  }));

  const firstJbv = jbvHistory.find((v): v is number => typeof v === "number");
  const jbvGrowthRate = typeof targets.jbv_growth_rate_weekly === "number" ? targets.jbv_growth_rate_weekly : 0.03;
  const jbvTrend = firstJbv !== undefined ? compoundingTrendSeries(firstJbv, jbvGrowthRate, weekLabels.length) : [];
  const jbvChartData = weekLabels.map((week_ending, i) => ({
    label: formatWeekLabel(week_ending),
    "JBV Actual": jbvHistory[i],
    "JBV Trend": jbvTrend[i] ?? null,
  }));

  const bonusMetricKey = typeof targets.bonus_metric_key === "string" ? targets.bonus_metric_key : null;
  const bonusMetricLabel =
    typeof targets.bonus_metric_label === "string" ? targets.bonus_metric_label : bonusMetricKey;
  const bonusMetricTarget = bonusMetricKey && typeof targets[bonusMetricKey] === "number" ? (targets[bonusMetricKey] as number) : null;
  const latestBonusMetric = bonusMetricHistory ? [...bonusMetricHistory].reverse().find((v) => typeof v === "number") ?? null : null;
  const bonusMetricChartData =
    bonusMetricHistory && bonusMetricLabel
      ? weekLabels.map((week_ending, i) => ({
          label: formatWeekLabel(week_ending),
          [bonusMetricLabel]: bonusMetricHistory[i] ?? null,
          ...(bonusMetricTarget !== null ? { Target: bonusMetricTarget } : {}),
        }))
      : [];

  return (
    <Card
      title="💰 Bonus Tier Tracker"
      className="border-2 border-amber-400/60 bg-amber-400/[0.06] dark:border-amber-300/40 dark:bg-amber-300/[0.05]"
    >
      <div className="mb-4 flex flex-wrap gap-6">
        <Stat label="Weekly Base Target" value={base === null ? "—" : formatValue(base, "currency")} />
        <Stat label="Cumulative Turnover" value={formatValue(cumTO[cumTO.length - 1] ?? 0, "currency")} />
        <Stat
          label="Turnover Pacing"
          value={pacing === null ? "—" : `${pacing.toFixed(1)}%`}
          color={pacing === null ? undefined : onTarget ? STATUS.good : STATUS.critical}
        />
        {bonusMetricLabel && (
          <Stat
            label={bonusMetricLabel}
            value={
              latestBonusMetric === null
                ? "—"
                : bonusMetricTarget !== null
                  ? `${latestBonusMetric} / ${bonusMetricTarget}`
                  : String(latestBonusMetric)
            }
          />
        )}
      </div>

      {(bonusTiers.t1 || bonusTiers.t2 || bonusTiers.t3 || bonusTiers.t4) && (
        <div className="mb-4 flex flex-wrap gap-4 border-t border-amber-400/30 pt-3">
          {(["t1", "t2", "t3", "t4"] as const).map(
            (key) =>
              typeof bonusTiers[key] === "number" && (
                <Stat key={key} label={key.toUpperCase()} value={String(bonusTiers[key])} small />
              )
          )}
          <span className="self-end text-[11px] text-muted">
            Reference thresholds for the directors to compare against the specialty metric — confirm the exact bonus formula with the business before automating a &ldquo;tier reached&rdquo; verdict.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={
                pacing === null
                  ? undefined
                  : onTarget
                    ? { color: STATUS.good, backgroundColor: "color-mix(in srgb, var(--color-success) 15%, transparent)" }
                    : { color: STATUS.critical, backgroundColor: "color-mix(in srgb, var(--color-danger) 15%, transparent)" }
              }
            >
              {pacing === null ? "" : onTarget ? "✓ On Target" : "⚠ Behind Target"}
            </span>
          </div>
          <MultiLineChart
            title="Cumulative Turnover vs Base Target"
            data={turnoverChartData}
            seriesKeys={["Cumulative Turnover", "Base Target"]}
            colors={[onTarget ? STATUS.good : STATUS.critical, "#8b93a5"]}
            format="currency"
          />
        </div>
        {firstJbv !== undefined && (
          <MultiLineChart
            title="JBV Actual vs Trend"
            data={jbvChartData}
            seriesKeys={["JBV Actual", "JBV Trend"]}
            format="number"
          />
        )}
        {bonusMetricLabel && bonusMetricChartData.length > 0 && (
          <MultiLineChart
            title={`${bonusMetricLabel} vs Target`}
            data={bonusMetricChartData}
            seriesKeys={bonusMetricTarget !== null ? [bonusMetricLabel, "Target"] : [bonusMetricLabel]}
            format="number"
          />
        )}
      </div>
    </Card>
  );
}

function Stat({ label, value, small, color }: { label: string; value: string; small?: boolean; color?: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div
        className={small ? "text-sm font-medium" : "text-lg font-semibold"}
        style={{ color: color ?? "var(--color-foreground)" }}
      >
        {value}
      </div>
    </div>
  );
}
