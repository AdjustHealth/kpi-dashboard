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

/** Admin's own trend charts — the cancellation-handling stats that genuinely vary per admin staff member. */
export function AdminPerformanceCharts({ history }: { history: WeekMetrics[] }) {
  return (
    <Card title="Performance Charts">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <LineTrendChart title="Cancellations Handled" data={series(history, "cancellations_handled")} format="number" colorIndex={0} />
        <LineTrendChart title="Reschedule Rate" data={series(history, "reschedule_rate_pct")} format="percent" colorIndex={1} />
        <LineTrendChart
          title="Cancellations Booked Within 7 Days"
          data={series(history, "booked_within_7_days_pct")}
          format="percent"
          colorIndex={2}
        />
        <LineTrendChart
          title="Cancellations Not Rebooked %"
          data={series(history, "cancellations_not_rebooked_pct")}
          format="percent"
          colorIndex={3}
        />
        <LineTrendChart
          title="Average Days to Next Booking"
          data={series(history, "avg_days_to_next_booking")}
          format="decimal"
          decimals={1}
          colorIndex={4}
        />
      </div>
    </Card>
  );
}
