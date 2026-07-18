import { PageHeader } from "@/components/nav/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { LineTrendChart } from "@/components/charts/LineTrendChart";
import { MultiLineChart } from "@/components/charts/MultiLineChart";
import { OccupancyBars } from "@/components/charts/OccupancyBars";
import {
  getClinicHistory,
  getClinicTargets,
  getClinicWideCvaRollup,
  getNewClientsByProvider,
  getProviderMetricHistory,
} from "@/lib/clinicData";
import { clinicStatTile, toTrendSeries, providerSeriesToWideRows } from "@/components/dashboard/statHelpers";
import { formatWeekLabel, defaultWeekEnding, trackingHistoryWeeks, clinicHistoryWeeks } from "@/lib/week";
import { formatValue } from "@/lib/format";

function pctPointDelta(current: unknown, previous: unknown): number | null {
  if (typeof current !== "number" || typeof previous !== "number") return null;
  return (current - previous) * 100;
}

export default async function ClinicHealthPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week: weekParam } = await searchParams;
  const week = weekParam ?? defaultWeekEnding();
  // weekly_kpis has real backfilled history back to January 2026 — much
  // further than provider_weekly, which only starts at the July rollout —
  // so the clinic-wide history and the per-provider CVA history intentionally
  // use two different windows.
  const historyWeeks = clinicHistoryWeeks(week);
  const providerHistoryWeeks = Math.min(trackingHistoryWeeks(week), 8);
  const [history, clinicTargets, cvaRollup, newClientsByProvider, providerCvaHistory, providerNcvaHistory] = await Promise.all([
    getClinicHistory(week, historyWeeks),
    getClinicTargets(),
    getClinicWideCvaRollup(week),
    getNewClientsByProvider(week),
    getProviderMetricHistory(week, providerHistoryWeeks, "ucva"),
    getProviderMetricHistory(week, providerHistoryWeeks, "ncva"),
  ]);
  const providerCvaWide = providerSeriesToWideRows(providerCvaHistory);
  const providerNcvaWide = providerSeriesToWideRows(providerNcvaHistory);

  const latest = history[history.length - 1];
  const prior = history[history.length - 2];
  const cxPctTarget = typeof clinicTargets.cx_pct_target === "number" ? clinicTargets.cx_pct_target : null;

  const occupancyRows = [
    {
      label: "Clinic",
      value: typeof latest?.clinic_occ === "number" ? (latest.clinic_occ as number) : null,
      deltaPts: pctPointDelta(latest?.clinic_occ, prior?.clinic_occ),
    },
    {
      label: "Physio",
      value: typeof latest?.physio_occ === "number" ? (latest.physio_occ as number) : null,
      deltaPts: pctPointDelta(latest?.physio_occ, prior?.physio_occ),
    },
    {
      label: "Massage",
      value: typeof latest?.massage_occ === "number" ? (latest.massage_occ as number) : null,
      deltaPts: pctPointDelta(latest?.massage_occ, prior?.massage_occ),
    },
    {
      label: "EP",
      value: typeof latest?.ep_occ === "number" ? (latest.ep_occ as number) : null,
      deltaPts: pctPointDelta(latest?.ep_occ, prior?.ep_occ),
    },
  ];

  const newClientsOnlineData = history.map((h) => {
    const total = typeof h.online_bookings_total === "number" ? h.online_bookings_total : null;
    const online = typeof h.online_bookings_new === "number" ? h.online_bookings_new : null;
    return {
      label: formatWeekLabel(h.week_ending),
      Online: online,
      "Phone / In-Person": total !== null && online !== null ? Math.max(0, total - online) : null,
    };
  });

  return (
    <>
      <PageHeader title="Clinic Health" subtitle="Activity, occupancy, retention, and cancellations." />
      <div className="flex flex-col gap-6 p-8">
        <div>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Clinic Activity</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile {...clinicStatTile(history, "total_consults")} label="Completed Appointments" />
            <StatTile {...clinicStatTile(history, "total_nc")} label="New Patients" />
            <StatTile {...clinicStatTile(history, "clinic_occ", "up", { target: 0.85, betterWhen: "higher" })} label="Clinic Occupancy" />
          </div>
        </div>

        <Card title="Weekly Activity">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <LineTrendChart
              title="Completed Appointments"
              data={toTrendSeries(history, "total_consults")}
              format="number"
              colorIndex={0}
            />
            <LineTrendChart
              title="New Patients"
              data={toTrendSeries(history, "total_nc")}
              format="number"
              colorIndex={1}
            />
            <MultiLineChart
              title="New Clients — Online vs. Phone / In-Person"
              data={newClientsOnlineData}
              seriesKeys={["Online", "Phone / In-Person"]}
              format="number"
            />
          </div>
        </Card>

        <Card title="Occupancy by Service Line — this week">
          <OccupancyBars rows={occupancyRows} target={0.85} />
        </Card>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Retention / Value</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile
              label="Clinic-wide CVA"
              value={formatValue(cvaRollup.avgCva, "decimal", 1)}
              sublabel={`avg across ${cvaRollup.providerCount} clinicians`}
            />
            <StatTile label="Clinic-wide NCVA" value={formatValue(cvaRollup.avgNcva, "decimal", 1)} sublabel="avg across clinicians" />
            <StatTile
              label="Clinic-wide TPR"
              value={formatValue(cvaRollup.avgTpr, "currency")}
              sublabel="avg per provider — each provider's TPR is already a total (e.g. 5 consults x $100 = $500)"
            />
          </div>
          <div className="mt-4">
            <Card title="CVA by Provider Tier">
              <p className="mb-3 text-xs text-muted">
                Client visit average by New Grad / 2-5yr / Senior (6+yr) / Massage / EP — this displays efficiency.
              </p>
              <MultiLineChart
                title="CVA by Tier"
                data={history.map((h) => ({
                  label: formatWeekLabel(h.week_ending),
                  "New Grad": h.cva_new_grads ?? null,
                  "2-5yr": h.cva_2_5yr ?? null,
                  "Senior (6+yr)": h.cva_senior ?? null,
                  Massage: h.cva_massage ?? null,
                  EP: h.cva_ep ?? null,
                }))}
                seriesKeys={["New Grad", "2-5yr", "Senior (6+yr)", "Massage", "EP"]}
                format="decimal"
                decimals={1}
              />
            </Card>
          </div>
          {providerCvaWide.rows.length > 0 && (
            <div className="mt-4">
              <Card title="CVA by Individual Provider">
                <p className="mb-3 text-xs text-muted">
                  Every clinician&apos;s CVA on one chart, coloured by tier (New Grad / 2-5yr / Senior / Massage / EP) so
                  same-tier providers share a colour.
                </p>
                <MultiLineChart
                  title="CVA by Provider"
                  data={providerCvaWide.rows}
                  seriesKeys={providerCvaWide.keys}
                  colors={providerCvaWide.colors}
                  format="decimal"
                  decimals={1}
                  height={280}
                />
              </Card>
            </div>
          )}
          {providerNcvaWide.rows.length > 0 && (
            <div className="mt-4">
              <Card title="NCVA by Individual Provider">
                <p className="mb-3 text-xs text-muted">
                  Every clinician&apos;s NCVA on one chart, coloured by tier the same way as the CVA chart above.
                </p>
                <MultiLineChart
                  title="NCVA by Provider"
                  data={providerNcvaWide.rows}
                  seriesKeys={providerNcvaWide.keys}
                  colors={providerNcvaWide.colors}
                  format="decimal"
                  decimals={1}
                  height={280}
                />
              </Card>
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Ageing Debts — Adjust</h2>
          <p className="mb-3 text-xs text-muted">
            Numbers only — Podiatry ageing debt isn&apos;t tracked here (see Weekly Input).
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile {...clinicStatTile(history, "ad_total", "down")} label="Total Ageing Debt" />
            <StatTile {...clinicStatTile(history, "ad_total_private", "down")} label="Total Private" />
            <StatTile {...clinicStatTile(history, "ad_ndis", "down")} label="NDIS" />
            <StatTile {...clinicStatTile(history, "ad_medicare_dva_31", "down")} label="Medicare/DVA over 31 Days" />
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Cancellations</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile {...clinicStatTile(history, "cx_cancels", "down")} label="Total Cancellations" />
            <StatTile
              {...clinicStatTile(history, "cx_pct", "down", cxPctTarget !== null ? { target: cxPctTarget, betterWhen: "lower" } : undefined)}
              label="Cancellation %"
            />
            <StatTile {...clinicStatTile(history, "cx_dnas", "down")} label="DNAs" />
            <StatTile {...clinicStatTile(history, "cx_rsx_pct", "up", { target: 0.3, betterWhen: "higher" })} label="Reschedule Rate" />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card title="Cancellations Trend">
              <MultiLineChart
                title="Number of Cancellations"
                data={history.map((h) => ({ label: formatWeekLabel(h.week_ending), Cancellations: h.cx_cancels ?? null }))}
                seriesKeys={["Cancellations"]}
                format="number"
              />
            </Card>
            <Card title="Reschedule Rate Trend">
              <MultiLineChart
                title="Reschedule Rate"
                data={history.map((h) => ({ label: formatWeekLabel(h.week_ending), "Reschedule Rate": h.cx_rsx_pct ?? null }))}
                seriesKeys={["Reschedule Rate"]}
                format="percent"
              />
            </Card>
          </div>
        </div>

        {newClientsByProvider.length > 0 && (
          <div>
            <h2 className="mb-3 text-sm font-semibold text-foreground">New Clients This Week — by Provider</h2>
            <Card>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {newClientsByProvider.map((p) => (
                  <div key={p.providerName}>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                      {p.providerName} ({p.names.length})
                    </div>
                    <ul className="text-sm text-foreground">
                      {p.names.map((name, i) => (
                        <li key={`${name}-${i}`}>{name}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
