import { PageHeader } from "@/components/nav/PageHeader";
import { QuarterSelector } from "@/components/nav/QuarterSelector";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { MultiLineChart } from "@/components/charts/MultiLineChart";
import { QuarterlyProviderTable } from "@/components/clinic/QuarterlyProviderTable";
import {
  getAvailableQuarters,
  getQuarterlyClinicStats,
  getQuarterlyProviderBreakdown,
  QuarterlyClinicStats,
} from "@/lib/quarterlyData";
import { getClinicTargets } from "@/lib/clinicData";
import { quarterLabel, adjacentQuarter } from "@/lib/quarter";
import { formatValue } from "@/lib/format";

/** Same relative-percent-change convention as periodOverPeriodChange() (lib/calc.ts), used by every other StatTile in the app. */
function deltaPct(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/** A quarter total isn't comparable to a prior quarter's total once the two cover different week counts (e.g. this quarter is still in progress) — compare the per-week rate instead. */
function perWeek(total: number | null, weeks: number): number | null {
  if (total === null || weeks === 0) return null;
  return total / weeks;
}

export default async function QuarterlyReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ quarter?: string }>;
}) {
  const { quarter: quarterParam } = await searchParams;
  const quarters = await getAvailableQuarters();

  if (quarters.length === 0) {
    return (
      <>
        <PageHeader title="Quarterly Review" subtitle="Compare quarters." showWeekSelector={false} />
        <div className="p-8">
          <Card>
            <p className="text-sm text-muted">No data yet — upload at least one week on Weekly Input first.</p>
          </Card>
        </div>
      </>
    );
  }

  const quarter = quarterParam && quarters.includes(quarterParam) ? quarterParam : quarters[quarters.length - 1];
  const previousQuarter = adjacentQuarter(quarter, -1);

  const [stats, previousStats, providerBreakdown, clinicTargets, allQuarterStats] = await Promise.all([
    getQuarterlyClinicStats(quarter),
    quarters.includes(previousQuarter) ? getQuarterlyClinicStats(previousQuarter) : Promise.resolve(null),
    getQuarterlyProviderBreakdown(quarter),
    getClinicTargets(),
    Promise.all(quarters.map((q) => getQuarterlyClinicStats(q))),
  ]);

  const weeklyRevenueTarget = typeof clinicTargets.weekly_revenue_target === "number" ? clinicTargets.weekly_revenue_target : null;
  const quarterlyRevenueTarget = weeklyRevenueTarget !== null ? weeklyRevenueTarget * stats.weeksCount : null;
  const clinicOccTarget = typeof clinicTargets.clinic_occ_target === "number" ? clinicTargets.clinic_occ_target : 0.85;
  const cxPctTarget = typeof clinicTargets.cx_pct_target === "number" ? clinicTargets.cx_pct_target : null;
  const rsxTarget = 0.3;
  const retentionTarget = 0.7;

  const trendData = allQuarterStats.map((s: QuarterlyClinicStats) => ({
    label: quarterLabel(s.quarter),
    "Total Revenue": s.totalRevenue,
    Occupancy: s.occupancy,
    "Retention Rate": s.retentionRate,
    "Reschedule Rate": s.rescheduleRate,
    "Cancellation %": s.cancellationPct,
  }));

  return (
    <>
      <PageHeader
        title="Quarterly Review"
        subtitle="Compare quarters — clinic-wide totals and the per-provider/tier breakdown."
        showWeekSelector={false}
        actions={<QuarterSelector quarters={quarters} current={quarter} />}
      />
      <div className="flex flex-col gap-6 p-8">
        <div>
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            {quarterLabel(quarter)}
            <span className="ml-2 text-xs font-normal text-muted">
              {stats.weeksCount} week{stats.weeksCount === 1 ? "" : "s"} of data
              {previousStats && ` — vs ${quarterLabel(previousQuarter)}`}
            </span>
          </h2>
          {previousStats && stats.weeksCount !== previousStats.weeksCount && (
            <p className="mb-3 text-[11px] text-muted">
              {quarterLabel(quarter)} has {stats.weeksCount} week{stats.weeksCount === 1 ? "" : "s"} of data so far
              vs {previousStats.weeksCount} for {quarterLabel(previousQuarter)} — Total Revenue/New Patients/Appointments
              deltas compare the per-week average, not the raw totals, so a still-in-progress quarter isn&apos;t
              penalised for having fewer weeks.
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatTile
              label="Total Revenue"
              value={formatValue(stats.totalRevenue, "currency")}
              rawValue={stats.totalRevenue}
              target={quarterlyRevenueTarget}
              betterWhen="higher"
              deltaPct={deltaPct(perWeek(stats.totalRevenue, stats.weeksCount), perWeek(previousStats?.totalRevenue ?? null, previousStats?.weeksCount ?? 0))}
              sublabel={quarterlyRevenueTarget !== null ? `target ${formatValue(quarterlyRevenueTarget, "currency")}` : undefined}
            />
            <StatTile
              label="Total New Patients"
              value={formatValue(stats.totalNewPatients, "number")}
              deltaPct={deltaPct(
                perWeek(stats.totalNewPatients, stats.weeksCount),
                perWeek(previousStats?.totalNewPatients ?? null, previousStats?.weeksCount ?? 0)
              )}
            />
            <StatTile
              label="Total Completed Appointments"
              value={formatValue(stats.totalConsults, "number")}
              deltaPct={deltaPct(
                perWeek(stats.totalConsults, stats.weeksCount),
                perWeek(previousStats?.totalConsults ?? null, previousStats?.weeksCount ?? 0)
              )}
            />
            <StatTile
              label="Occupancy (avg/wk)"
              value={formatValue(stats.occupancy, "percent")}
              rawValue={stats.occupancy}
              target={clinicOccTarget}
              betterWhen="higher"
              deltaPct={deltaPct(stats.occupancy, previousStats?.occupancy ?? null)}
            />
            <StatTile
              label="Retention Rate (avg/wk)"
              value={formatValue(stats.retentionRate, "percent")}
              rawValue={stats.retentionRate}
              target={retentionTarget}
              betterWhen="higher"
              deltaPct={deltaPct(stats.retentionRate, previousStats?.retentionRate ?? null)}
            />
            <StatTile
              label="Reschedule Rate (avg/wk)"
              value={formatValue(stats.rescheduleRate, "percent")}
              rawValue={stats.rescheduleRate}
              target={rsxTarget}
              betterWhen="higher"
              deltaPct={deltaPct(stats.rescheduleRate, previousStats?.rescheduleRate ?? null)}
            />
            <StatTile
              label="Cancellation % (avg/wk)"
              value={formatValue(stats.cancellationPct, "percent")}
              rawValue={stats.cancellationPct}
              target={cxPctTarget}
              betterWhen="lower"
              goodDirection="down"
              deltaPct={deltaPct(stats.cancellationPct, previousStats?.cancellationPct ?? null)}
            />
            <StatTile
              label="Diary Management (avg/wk)"
              value={formatValue(stats.diaryMgmtPct, "percent")}
              deltaPct={deltaPct(stats.diaryMgmtPct, previousStats?.diaryMgmtPct ?? null)}
            />
            <StatTile
              label="Online Booking %"
              value={formatValue(stats.onlineBookingPct, "percent")}
              deltaPct={deltaPct(stats.onlineBookingPct, previousStats?.onlineBookingPct ?? null)}
            />
          </div>
        </div>

        {quarters.length > 1 && (
          <div>
            <h2 className="mb-3 text-sm font-semibold text-foreground">Quarter over Quarter</h2>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card title="Total Revenue by Quarter">
                <MultiLineChart title="Total Revenue" data={trendData} seriesKeys={["Total Revenue"]} format="currency" />
              </Card>
              <Card title="Occupancy, Retention &amp; Reschedule Rate by Quarter">
                <MultiLineChart
                  title="Occupancy vs Retention vs Reschedule Rate"
                  data={trendData}
                  seriesKeys={["Occupancy", "Retention Rate", "Reschedule Rate"]}
                  format="percent"
                />
              </Card>
            </div>
          </div>
        )}

        <div>
          <h2 className="mb-3 text-sm font-semibold text-foreground">By Provider &amp; Tier — {quarterLabel(quarter)}</h2>
          <p className="mb-3 text-xs text-muted">
            Quarterly average of each week&apos;s figure — same convention as the old tracking sheet. Providers with no
            data for this quarter (e.g. before they joined, or before the July 2026 tracking rollout) show as —.
          </p>
          <Card>
            <QuarterlyProviderTable data={providerBreakdown} />
          </Card>
        </div>
      </div>
    </>
  );
}
