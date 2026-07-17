"use client";

import { Card } from "@/components/ui/Card";
import { MultiLineChart } from "@/components/charts/MultiLineChart";
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
}: {
  targets: ProviderTargets;
  weeklyTurnover: (number | null)[];
  weekLabels: string[];
  jbvHistory: (number | null)[];
}) {
  const base = weeklyBaseTarget(targets);
  const cumTO = cumulativeTurnoverSeries(weeklyTurnover);
  const baseTgt = baseTargetSeries(targets, weekLabels.length);
  const pacing = turnoverPacingPct(cumTO[cumTO.length - 1] ?? 0, baseTgt[baseTgt.length - 1] ?? null);
  const bonusTiers = targets.bonus_tiers ?? {};

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

  return (
    <Card title="Bonus Tier Tracker">
      <div className="mb-4 flex flex-wrap gap-6">
        <Stat label="Weekly Base Target" value={base === null ? "—" : formatValue(base, "currency")} />
        <Stat label="Cumulative Turnover" value={formatValue(cumTO[cumTO.length - 1] ?? 0, "currency")} />
        <Stat label="Turnover Pacing" value={pacing === null ? "—" : `${pacing.toFixed(1)}%`} />
      </div>

      {(bonusTiers.t1 || bonusTiers.t2 || bonusTiers.t3 || bonusTiers.t4) && (
        <div className="mb-4 flex flex-wrap gap-4 border-t border-border pt-3">
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
        <MultiLineChart
          title="Cumulative Turnover vs Base Target"
          data={turnoverChartData}
          seriesKeys={["Cumulative Turnover", "Base Target"]}
          format="currency"
        />
        {firstJbv !== undefined && (
          <MultiLineChart
            title="JBV Actual vs Trend"
            data={jbvChartData}
            seriesKeys={["JBV Actual", "JBV Trend"]}
            format="number"
          />
        )}
      </div>
    </Card>
  );
}

function Stat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div className={small ? "text-sm font-medium text-foreground" : "text-lg font-semibold text-foreground"}>
        {value}
      </div>
    </div>
  );
}
