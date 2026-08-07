"use client";

import { Card } from "@/components/ui/Card";
import { LineTrendChart, TrendPoint } from "@/components/charts/LineTrendChart";
import { MultiLineChart } from "@/components/charts/MultiLineChart";
import { BarTrendChart } from "@/components/charts/BarTrendChart";
import { rollingAverage } from "@/lib/calc";
import { formatWeekLabel } from "@/lib/week";
import { WeekMetrics } from "@/components/provider/PerformanceTable";

function series(history: WeekMetrics[], key: string): TrendPoint[] {
  return history.map((h) => ({
    week_ending: h.week_ending,
    value: typeof h.metrics[key] === "number" ? (h.metrics[key] as number) : null,
  }));
}

function rollingSeries(history: WeekMetrics[], key: string, window = 4): TrendPoint[] {
  const rows = history.map((h) => ({ week_ending: h.week_ending, [key]: h.metrics[key] }));
  const avg = rollingAverage(rows, key, window);
  return history.map((h, i) => ({ week_ending: h.week_ending, value: avg[i] }));
}

export function ProviderCharts({
  history,
  showTpr = false,
  targets = {},
  dropOutRateHistory,
}: {
  history: WeekMetrics[];
  /** TPR (and Turnover) are senior-physio-only on the meeting sheet — director's call. */
  showTpr?: boolean;
  /** Effective targets (role defaults + this provider's overrides) — same object already passed to the KPI Scorecard table, reused here so the trend charts show the same on-track/off-track signal. */
  targets?: Record<string, unknown>;
  /** % of this provider's distinct cancelling clients per week who still have no future booking — see lib/clinicData.ts getDropOutRateHistory. Recomputed live, so past weeks can improve once a client's confirmed rebooked. */
  dropOutRateHistory?: TrendPoint[];
}) {
  const ncvaTarget = typeof targets.ncva === "number" ? targets.ncva : null;
  const tprTarget = typeof targets.tpr === "number" ? targets.tpr : null;
  const occupancyTarget = typeof targets.occupancy_pct === "number" ? targets.occupancy_pct : null;
  // UCVA (all clients seen) and NCVA (new clients only) are both "visits per
  // client" metrics, just with a different denominator — one chart makes the
  // relationship between them visible instead of two charts that have to be
  // compared by eye.
  const cvaVsNcvaData = history.map((h) => ({
    label: formatWeekLabel(h.week_ending),
    UCVA: typeof h.metrics.ucva === "number" ? h.metrics.ucva : null,
    NCVA: typeof h.metrics.ncva === "number" ? h.metrics.ncva : null,
  }));

  return (
    <Card title="Performance Charts">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <MultiLineChart title="UCVA vs NCVA" data={cvaVsNcvaData} seriesKeys={["UCVA", "NCVA"]} format="decimal" decimals={1} height={160} />
          <p className="text-[11px] text-muted">
            UCVA: visits per client across the whole caseload (overall efficiency). NCVA: visits per new client only — a
            retention indicator. If NCVA runs below UCVA, new clients aren&apos;t rebooking as often as existing ones and
            the provider needs more new clients to sustain the same volume.
          </p>
        </div>
        <LineTrendChart
          title="NCVA — 4wk Rolling Avg"
          data={rollingSeries(history, "ncva")}
          format="decimal"
          decimals={1}
          colorIndex={6}
          accent
          target={ncvaTarget}
          betterWhen="higher"
        />
        {showTpr && (
          <BarTrendChart
            title="TPR (Total Patient Revenue)"
            data={series(history, "tpr")}
            format="currency"
            colorIndex={5}
            accent
            target={tprTarget}
            betterWhen="higher"
          />
        )}
        <LineTrendChart
          title="Occupancy"
          data={series(history, "occupancy_pct")}
          format="percent"
          colorIndex={2}
          accent
          target={occupancyTarget}
          betterWhen="higher"
        />
        <LineTrendChart
          title="New Patient Booking Rate"
          data={series(history, "new_pt_booking_rate")}
          format="decimal"
          decimals={1}
          colorIndex={3}
          accent
        />
        <LineTrendChart title="New Patients" data={series(history, "new_patients")} format="number" colorIndex={4} accent />
        {dropOutRateHistory && (
          <div className="flex flex-col gap-1.5">
            <LineTrendChart title="Drop Out Rate" data={dropOutRateHistory} format="percent" colorIndex={1} accent />
            <p className="text-[11px] text-muted">
              % of that week&apos;s distinct cancelling clients still without a future booking — updates as clients get
              rebooked and resolved from the Not Rebooked list above.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
