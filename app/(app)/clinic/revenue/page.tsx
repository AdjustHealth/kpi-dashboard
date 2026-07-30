import { PageHeader } from "@/components/nav/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { MultiLineChart } from "@/components/charts/MultiLineChart";
import { LineTrendChart } from "@/components/charts/LineTrendChart";
import { StackedBarChart } from "@/components/charts/StackedBarChart";
import { getClinicHistory, getClinicTargets } from "@/lib/clinicData";
import { clinicStatTile, toTrendSeries } from "@/components/dashboard/statHelpers";
import { formatValue } from "@/lib/format";
import { PAYER_CATEGORY_LABELS } from "@/lib/nookal/payerCategories";
import { formatWeekLabel, defaultWeekEnding, clinicHistoryWeeks } from "@/lib/week";

export default async function RevenuePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week: weekParam } = await searchParams;
  const week = weekParam ?? defaultWeekEnding();
  // Revenue trends read as noise over just 4 weeks — a trailing quarter (13
  // weeks) gives enough points to actually see seasonality/direction, while
  // still staying a fixed window rather than growing wider every week.
  const [history, targets] = await Promise.all([getClinicHistory(week, clinicHistoryWeeks(week, 13)), getClinicTargets()]);

  const weeklyTarget = typeof targets.weekly_revenue_target === "number" ? targets.weekly_revenue_target : null;
  const breakeven = typeof targets.weekly_breakeven_target === "number" ? targets.weekly_breakeven_target : null;
  const costStaff = typeof targets.cost_staff === "number" ? targets.cost_staff : null;
  const costStaffRentGlofox = typeof targets.cost_staff_rent_glofox === "number" ? targets.cost_staff_rent_glofox : null;
  const costFull = typeof targets.cost_staff_rent_glofox_loan === "number" ? targets.cost_staff_rent_glofox_loan : null;
  const gymTarget = typeof targets.weekly_gym_revenue_target === "number" ? targets.weekly_gym_revenue_target : null;

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

  // Total Gym Income = Glofox Income + 3rd Party Gym Income — both manual
  // entries on Weekly Input, summed (not a subset of one another).
  const gymSeriesKeys = ["Gym Total", "Glofox Income", "3rd Party"];
  if (gymTarget !== null) gymSeriesKeys.push("Target");

  const gymData = history.map((h) => ({
    label: formatWeekLabel(h.week_ending),
    "Gym Total": h.gym_total ?? null,
    "Glofox Income": h.m_glofox ?? null,
    "3rd Party": h.m_gym3p ?? null,
    ...(gymTarget !== null ? { Target: gymTarget } : {}),
  }));

  const latest = history[history.length - 1] ?? {};
  const gym3pLatest = typeof latest.m_gym3p === "number" ? latest.m_gym3p : 0;
  const glofoxLatest = typeof latest.m_glofox === "number" ? latest.m_glofox : 0;

  // Only include payer categories with at least one real week of revenue —
  // an all-zero series just adds legend noise for categories this clinic
  // doesn't bill (e.g. no NDIS clients).
  const payerKeys = (["private", "medicare", "dva", "workcover", "ndis", "other"] as const).filter((key) =>
    history.some((h) => typeof h[`rev_${key}`] === "number" && (h[`rev_${key}`] as number) > 0)
  );
  const payerSeriesKeys = payerKeys.map((key) => PAYER_CATEGORY_LABELS[key]);
  const payerTrendData = history.map((h) => ({
    label: formatWeekLabel(h.week_ending),
    ...Object.fromEntries(payerKeys.map((key) => [PAYER_CATEGORY_LABELS[key], (h[`rev_${key}`] as number | null) ?? 0])),
  }));

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
              {payerSeriesKeys.length > 0 ? (
                <StackedBarChart title="Payer Mix Over Time" data={payerTrendData} seriesKeys={payerSeriesKeys} format="currency" />
              ) : (
                <p className="text-xs text-muted">
                  No revenue-by-payer data yet — upload the Activity Report on Weekly Input to populate it.
                </p>
              )}
            </Card>
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Gym</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile {...clinicStatTile(history, "gym_total")} label="Total Gym Income" />
            <div className="flex flex-col justify-center rounded-xl border border-border bg-surface p-5">
              <span className="text-xs text-muted">Glofox Income</span>
              <span className="mt-1 text-lg font-semibold text-foreground">{formatValue(glofoxLatest, "currency")}</span>
            </div>
            <div className="flex flex-col justify-center rounded-xl border border-border bg-surface p-5">
              <span className="text-xs text-muted">3rd Party Gym Income</span>
              <span className="mt-1 text-lg font-semibold text-foreground">{formatValue(gym3pLatest, "currency")}</span>
            </div>
          </div>
          <div className="mt-4">
            <Card title="Gym Income Trend vs Target">
              <MultiLineChart title="Gym Total = Glofox Income + 3rd Party vs Target" data={gymData} seriesKeys={gymSeriesKeys} format="currency" />
              {gymTarget === null && (
                <p className="mt-2 text-[11px] text-muted">
                  Set a Weekly Gym Revenue Target on the Targets page to show it here.
                </p>
              )}
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
