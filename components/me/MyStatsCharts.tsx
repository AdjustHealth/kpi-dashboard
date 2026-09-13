"use client";

import { Card } from "@/components/ui/Card";
import { LineTrendChart, TrendPoint } from "@/components/charts/LineTrendChart";
import { WeekMetrics } from "@/components/provider/PerformanceTable";

function series(history: WeekMetrics[], key: string): TrendPoint[] {
  return history.map((h) => ({
    week_ending: h.week_ending,
    value: typeof h.metrics[key] === "number" ? (h.metrics[key] as number) : null,
  }));
}

/** Deliberately just New Patients + Occupancy — director's call on what a
 * self-service dashboard shows vs. what stays review-gated (turnover, KPA
 * ratings) or is being built elsewhere (a dedicated cancellations tab). */
export function MyStatsCharts({ history, occupancyTarget }: { history: WeekMetrics[]; occupancyTarget: number | null }) {
  return (
    <Card title="Your Stats">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <LineTrendChart title="New Patients" data={series(history, "new_patients")} format="number" colorIndex={4} accent />
        <LineTrendChart
          title="Occupancy"
          data={series(history, "occupancy_pct")}
          format="percent"
          colorIndex={2}
          accent
          target={occupancyTarget}
          betterWhen="higher"
        />
      </div>
    </Card>
  );
}
