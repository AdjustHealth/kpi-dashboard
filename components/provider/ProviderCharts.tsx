"use client";

import { Card } from "@/components/ui/Card";
import { LineTrendChart, TrendPoint } from "@/components/charts/LineTrendChart";
import { rollingAverage } from "@/lib/calc";
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
  return (
    <Card title="Performance Charts">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <LineTrendChart title="UCVA" data={series(history, "ucva")} format="decimal" decimals={2} colorIndex={0} />
        <LineTrendChart title="NCVA" data={series(history, "ncva")} format="decimal" decimals={2} colorIndex={1} />
        <LineTrendChart
          title="NCVA — 4wk Rolling Avg"
          data={rollingSeries(history, "ncva")}
          format="decimal"
          decimals={2}
          colorIndex={1}
        />
        <LineTrendChart title="Occupancy" data={series(history, "occupancy_pct")} format="percent" colorIndex={2} />
        <LineTrendChart
          title="New Patient Booking Rate"
          data={series(history, "new_pt_booking_rate_pct")}
          format="percent"
          colorIndex={3}
        />
        <LineTrendChart title="New Patients" data={series(history, "new_patients")} format="number" colorIndex={4} />
      </div>
    </Card>
  );
}
