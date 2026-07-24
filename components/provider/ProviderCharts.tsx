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

export function ProviderCharts({ history }: { history: WeekMetrics[] }) {
  // CVA (all clients seen) and NCVA (new clients only) are both "visits per
  // client" metrics, just with a different denominator — one chart makes the
  // relationship between them visible instead of two charts that have to be
  // compared by eye.
  const cvaVsNcvaData = history.map((h) => ({
    label: formatWeekLabel(h.week_ending),
    CVA: typeof h.metrics.ucva === "number" ? h.metrics.ucva : null,
    NCVA: typeof h.metrics.ncva === "number" ? h.metrics.ncva : null,
  }));

  return (
    <Card title="Performance Charts">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MultiLineChart title="CVA vs NCVA" data={cvaVsNcvaData} seriesKeys={["CVA", "NCVA"]} format="decimal" decimals={1} height={160} />
        <LineTrendChart
          title="NCVA — 4wk Rolling Avg"
          data={rollingSeries(history, "ncva")}
          format="decimal"
          decimals={1}
          colorIndex={6}
          accent
        />
        <BarTrendChart title="TPR (Total Patient Revenue)" data={series(history, "tpr")} format="currency" colorIndex={5} accent />
        <LineTrendChart title="Occupancy" data={series(history, "occupancy_pct")} format="percent" colorIndex={2} accent />
        <LineTrendChart
          title="New Patient Booking Rate"
          data={series(history, "new_pt_booking_rate")}
          format="decimal"
          decimals={1}
          colorIndex={3}
          accent
        />
        <LineTrendChart title="New Patients" data={series(history, "new_patients")} format="number" colorIndex={4} accent />
      </div>
    </Card>
  );
}
