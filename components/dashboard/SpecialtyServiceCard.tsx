import { Card } from "@/components/ui/Card";
import { LineTrendChart } from "@/components/charts/LineTrendChart";
import { NotTrackedPanel } from "@/components/dashboard/NotTrackedPanel";
import { formatWeekLabel } from "@/lib/week";
import { WeekMetrics } from "@/components/provider/PerformanceTable";
import { Provider } from "@/lib/types";

export function SpecialtyServiceCard({
  name,
  provider,
  history,
  initialKey,
  totalKey,
}: {
  name: string;
  provider: Provider | null;
  history: WeekMetrics[];
  initialKey: string;
  totalKey: string;
}) {
  if (!provider) {
    return <NotTrackedPanel title={name} items={[`a provider's specialty metrics for ${name}`]} />;
  }

  const chartData = history.map((h) => ({
    week_ending: h.week_ending,
    value: typeof h.metrics[totalKey] === "number" ? (h.metrics[totalKey] as number) : null,
  }));

  const latest = history[history.length - 1]?.metrics ?? {};

  return (
    <Card title={name}>
      <div className="mb-3 flex flex-wrap gap-6">
        <Stat label="Initial Consults" value={latest[initialKey] as number | undefined} />
        <Stat label="Total Consults" value={latest[totalKey] as number | undefined} />
        <span className="self-end text-[11px] text-muted">Owned by {provider.name}</span>
      </div>
      <LineTrendChart
        title={`${name} — Total Consults`}
        data={chartData}
        format="number"
      />
      <p className="mt-2 text-[11px] text-muted">
        {formatWeekLabel(history[0]?.week_ending ?? "")} – {formatWeekLabel(history[history.length - 1]?.week_ending ?? "")}
      </p>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div className="text-lg font-semibold text-foreground">{value ?? "—"}</div>
    </div>
  );
}
