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

function numTarget(targets: Record<string, unknown>, key: string): number | null {
  return typeof targets[key] === "number" ? (targets[key] as number) : null;
}

/** Admin's own trend charts — the cancellation-handling stats that genuinely vary per admin staff member. */
export function AdminPerformanceCharts({
  history,
  targets = {},
}: {
  history: WeekMetrics[];
  /** Effective targets, same object already passed to the KPI Scorecard table above. */
  targets?: Record<string, unknown>;
}) {
  return (
    <Card title="Performance Charts">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <LineTrendChart title="Cancellations Handled" data={series(history, "cancellations_handled")} format="number" colorIndex={0} />
        <LineTrendChart
          title="Reschedule Rate"
          data={series(history, "reschedule_rate_pct")}
          format="percent"
          colorIndex={1}
          target={numTarget(targets, "reschedule_rate_pct")}
          betterWhen="higher"
        />
        <LineTrendChart
          title="Cancellations Booked Within 7 Days"
          data={series(history, "booked_within_7_days_pct")}
          format="percent"
          colorIndex={2}
          target={numTarget(targets, "booked_within_7_days_pct")}
          betterWhen="higher"
        />
        <LineTrendChart
          title="Cancellations Not Rebooked %"
          data={series(history, "cancellations_not_rebooked_pct")}
          format="percent"
          colorIndex={3}
          target={numTarget(targets, "cancellations_not_rebooked_pct")}
          betterWhen="lower"
        />
        <LineTrendChart
          title="Average Days to Next Booking"
          data={series(history, "avg_days_to_next_booking")}
          format="decimal"
          decimals={1}
          colorIndex={4}
          target={numTarget(targets, "avg_days_to_next_booking")}
          betterWhen="lower"
        />
      </div>
    </Card>
  );
}
