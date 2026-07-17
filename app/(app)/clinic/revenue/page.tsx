import { PageHeader } from "@/components/nav/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { MultiLineChart } from "@/components/charts/MultiLineChart";
import { NotTrackedPanel } from "@/components/dashboard/NotTrackedPanel";
import { getClinicHistory, getClinicTargets } from "@/lib/clinicData";
import { clinicStatTile } from "@/components/dashboard/statHelpers";
import { formatValue } from "@/lib/format";
import { formatWeekLabel, defaultWeekEnding } from "@/lib/week";

export default async function RevenuePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week: weekParam } = await searchParams;
  const week = weekParam ?? defaultWeekEnding();
  const [history, targets] = await Promise.all([getClinicHistory(week, 12), getClinicTargets()]);

  const weeklyTarget = typeof targets.weekly_revenue_target === "number" ? targets.weekly_revenue_target : null;

  const gymPrivate = history.map((h) => {
    const glofox = typeof h.m_glofox === "number" ? h.m_glofox : 0;
    const mscred = typeof h.m_mscred === "number" ? h.m_mscred : 0;
    return glofox + mscred;
  });

  const trendData = history.map((h) => ({
    label: formatWeekLabel(h.week_ending),
    "Total Revenue": h.total_rev ?? null,
    "Total Adjust + Podiatry": h.total_adjust_pod_rev ?? null,
    ...(weeklyTarget !== null ? { Target: weeklyTarget } : {}),
  }));

  const gymData = history.map((h, i) => ({
    label: formatWeekLabel(h.week_ending),
    "Gym Private": gymPrivate[i],
    "Gym 3rd Party": h.m_gym3p ?? null,
  }));

  const gymPrivateLatest = gymPrivate[gymPrivate.length - 1] ?? 0;

  return (
    <>
      <PageHeader title="Revenue" subtitle="Everything displayed chronologically." />
      <div className="flex flex-col gap-6 p-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile {...clinicStatTile(history, "total_rev")} label="Total Adjust Revenue" />
          <StatTile {...clinicStatTile(history, "m_pod_rev")} label="Podiatry Revenue" />
          <StatTile
            label="Gym Private"
            value={formatValue(gymPrivateLatest, "currency")}
          />
          <StatTile {...clinicStatTile(history, "m_gym3p")} label="Gym Third Party" />
        </div>

        <NotTrackedPanel
          title="Revenue By Payer"
          items={["Private, Medicare, DVA, WorkCover, NDIS, Other revenue splits"]}
        />

        <Card title="Weekly Revenue Trend & vs Target">
          <MultiLineChart
            title="Total Revenue vs Target"
            data={trendData}
            seriesKeys={weeklyTarget !== null ? ["Total Revenue", "Total Adjust + Podiatry", "Target"] : ["Total Revenue", "Total Adjust + Podiatry"]}
            format="currency"
            height={260}
          />
        </Card>

        <Card title="Gym Revenue">
          <MultiLineChart
            title="Gym Private vs Third Party"
            data={gymData}
            seriesKeys={["Gym Private", "Gym 3rd Party"]}
            format="currency"
          />
        </Card>

        <NotTrackedPanel title="Cost Lines & Payer Mix" items={["Staff Costs, Clinic Costs, Loan Costs, and a payer-mix pie chart"]} />
      </div>
    </>
  );
}
