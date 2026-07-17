import { PageHeader } from "@/components/nav/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { MultiLineChart } from "@/components/charts/MultiLineChart";
import { LineTrendChart } from "@/components/charts/LineTrendChart";
import { PieChart } from "@/components/charts/PieChart";
import { getClinicHistory, getClinicTargets } from "@/lib/clinicData";
import { clinicStatTile, toTrendSeries } from "@/components/dashboard/statHelpers";
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

  const gymPrivate = history.map((h) => (typeof h.m_glofox === "number" ? h.m_glofox : 0));

  const gymData = history.map((h, i) => ({
    label: formatWeekLabel(h.week_ending),
    "Gym Private": gymPrivate[i],
    "Gym 3rd Party": h.m_gym3p ?? null,
  }));

  const latest = history[history.length - 1] ?? {};
  const gym3pLatest = typeof latest.m_gym3p === "number" ? latest.m_gym3p : 0;

  const payerData = (["private", "medicare", "dva", "workcover", "ndis", "other"] as const)
    .map((key) => ({
      name: PAYER_CATEGORY_LABELS[key],
      value: (latest[`rev_${key}`] as number | null) ?? 0,
    }))
    .filter((d) => d.value > 0);

  return (
    <>
      <PageHeader title="Revenue" subtitle="Everything displayed chronologically." />
      <div className="flex flex-col gap-8 p-8">
        <div>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Adjust</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatTile {...clinicStatTile(history, "total_rev")} label="Adjust Revenue" />
          </div>
          <div className="mt-4 flex flex-col gap-4">
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
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Gym</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatTile {...clinicStatTile(history, "gym_total")} label="Gym Revenue" />
            <div className="flex flex-col justify-center rounded-xl border border-border bg-surface p-5">
              <span className="text-xs text-muted">of which — 3rd Party</span>
              <span className="mt-1 text-lg font-semibold text-foreground">{formatValue(gym3pLatest, "currency")}</span>
            </div>
          </div>
          <div className="mt-4">
            <Card title="Gym Revenue Trend">
              <MultiLineChart title="Gym Private vs 3rd Party" data={gymData} seriesKeys={["Gym Private", "Gym 3rd Party"]} format="currency" />
            </Card>
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Podiatry</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatTile {...clinicStatTile(history, "m_pod_rev")} label="Podiatry Revenue" />
            <StatTile {...clinicStatTile(history, "m_pod_c")} label="Podiatry Consults" />
          </div>
          <div className="mt-4">
            <Card title="Podiatry Revenue Trend">
              <LineTrendChart title="Podiatry Revenue" data={toTrendSeries(history, "m_pod_rev")} format="currency" colorIndex={5} />
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
