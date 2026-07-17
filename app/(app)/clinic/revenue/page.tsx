import { PageHeader } from "@/components/nav/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { MultiLineChart } from "@/components/charts/MultiLineChart";
import { PieChart } from "@/components/charts/PieChart";
import { getClinicHistory, getClinicTargets } from "@/lib/clinicData";
import { clinicStatTile } from "@/components/dashboard/statHelpers";
import { formatValue } from "@/lib/format";
import { PAYER_CATEGORY_LABELS } from "@/lib/nookal/payerCategories";
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
  const breakeven = typeof targets.weekly_breakeven_target === "number" ? targets.weekly_breakeven_target : null;
  const costStaff = typeof targets.cost_staff === "number" ? targets.cost_staff : null;
  const costStaffRentGlofox = typeof targets.cost_staff_rent_glofox === "number" ? targets.cost_staff_rent_glofox : null;
  const costFull = typeof targets.cost_staff_rent_glofox_loan === "number" ? targets.cost_staff_rent_glofox_loan : null;

  const gymPrivate = history.map((h) => {
    const glofox = typeof h.m_glofox === "number" ? h.m_glofox : 0;
    const mscred = typeof h.m_mscred === "number" ? h.m_mscred : 0;
    return glofox + mscred;
  });

  const trendSeriesKeys = ["Total Revenue"];
  if (weeklyTarget !== null) trendSeriesKeys.push("Target");
  if (breakeven !== null) trendSeriesKeys.push("Break-Even");

  const trendData = history.map((h) => ({
    label: formatWeekLabel(h.week_ending),
    "Total Revenue": h.total_rev ?? null,
    ...(weeklyTarget !== null ? { Target: weeklyTarget } : {}),
    ...(breakeven !== null ? { "Break-Even": breakeven } : {}),
  }));

  const costSeriesKeys: string[] = [];
  if (costStaff !== null) costSeriesKeys.push("Staff");
  if (costStaffRentGlofox !== null) costSeriesKeys.push("Staff + Rent + Glofox");
  if (costFull !== null) costSeriesKeys.push("+ Loan");

  const costData = history.map((h) => ({
    label: formatWeekLabel(h.week_ending),
    "Total Revenue": h.total_rev ?? null,
    ...(costStaff !== null ? { Staff: costStaff } : {}),
    ...(costStaffRentGlofox !== null ? { "Staff + Rent + Glofox": costStaffRentGlofox } : {}),
    ...(costFull !== null ? { "+ Loan": costFull } : {}),
  }));

  const gymData = history.map((h, i) => ({
    label: formatWeekLabel(h.week_ending),
    "Gym Private": gymPrivate[i],
    "Gym 3rd Party": h.m_gym3p ?? null,
  }));

  const gymPrivateLatest = gymPrivate[gymPrivate.length - 1] ?? 0;

  const latest = history[history.length - 1] ?? {};
  const payerData = (["private", "medicare", "dva", "workcover", "ndis", "other"] as const)
    .map((key) => ({
      name: PAYER_CATEGORY_LABELS[key],
      value: (latest[`rev_${key}`] as number | null) ?? 0,
    }))
    .filter((d) => d.value > 0);

  return (
    <>
      <PageHeader title="Revenue" subtitle="Everything displayed chronologically." />
      <div className="flex flex-col gap-6 p-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile {...clinicStatTile(history, "total_rev")} label="Total Adjust Revenue" />
          <StatTile {...clinicStatTile(history, "m_pod_rev")} label="Podiatry Revenue" />
          <StatTile label="Gym Private" value={formatValue(gymPrivateLatest, "currency")} />
          <StatTile {...clinicStatTile(history, "m_gym3p")} label="Gym Third Party" />
        </div>

        <Card title="Weekly Revenue Trend vs Target & Break-Even">
          <MultiLineChart title="Total Revenue vs Target vs Break-Even" data={trendData} seriesKeys={trendSeriesKeys} format="currency" height={260} />
          {weeklyTarget === null && (
            <p className="mt-2 text-[11px] text-muted">
              Set a Weekly Revenue Target on the Targets page to show it here.
            </p>
          )}
        </Card>

        {costSeriesKeys.length > 0 && (
          <Card title="Revenue vs Cost Lines">
            <MultiLineChart
              title="Total Revenue vs Staff / Staff+Rent+Glofox / +Loan"
              data={costData}
              seriesKeys={["Total Revenue", ...costSeriesKeys]}
              format="currency"
              height={260}
            />
          </Card>
        )}

        <Card title="Gym Revenue">
          <MultiLineChart title="Gym Private vs Third Party" data={gymData} seriesKeys={["Gym Private", "Gym 3rd Party"]} format="currency" />
        </Card>

        <Card title="Revenue By Payer" action={<span className="text-xs text-muted">Auto-fills from the Activity Report upload</span>}>
          {payerData.length > 0 ? (
            <PieChart title={`Payer Mix — week ending ${formatWeekLabel(week)}`} data={payerData} format="currency" />
          ) : (
            <p className="text-xs text-muted">
              No revenue-by-payer data for this week yet — upload the Activity Report on Weekly Input to populate it.
            </p>
          )}
        </Card>
      </div>
    </>
  );
}
