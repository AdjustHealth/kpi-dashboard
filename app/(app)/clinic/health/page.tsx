import { PageHeader } from "@/components/nav/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { MultiLineChart } from "@/components/charts/MultiLineChart";
import { LineTrendChart } from "@/components/charts/LineTrendChart";
import { NotTrackedPanel } from "@/components/dashboard/NotTrackedPanel";
import { getClinicHistory } from "@/lib/clinicData";
import { clinicStatTile, toTrendSeries } from "@/components/dashboard/statHelpers";
import { formatWeekLabel, defaultWeekEnding } from "@/lib/week";

export default async function ClinicHealthPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week: weekParam } = await searchParams;
  const week = weekParam ?? defaultWeekEnding();
  const history = await getClinicHistory(week, 12);

  const occupancyData = history.map((h) => ({
    label: formatWeekLabel(h.week_ending),
    Clinic: h.clinic_occ ?? null,
    Physio: h.physio_occ ?? null,
    Massage: h.massage_occ ?? null,
    EP: h.ep_occ ?? null,
  }));

  const cvaData = history.map((h) => ({
    label: formatWeekLabel(h.week_ending),
    "New Grad": h.cva_new_grads ?? null,
    "2-5yr": h.cva_2_5yr ?? null,
    "Senior (6+yr)": h.cva_senior ?? null,
    Massage: h.cva_massage ?? null,
    EP: h.cva_ep ?? null,
  }));

  const cancellationData = history.map((h) => ({
    label: formatWeekLabel(h.week_ending),
    "Cancellation %": h.cx_pct ?? null,
    "Reschedule Rate (Save Rate)": h.cx_rsx_pct ?? null,
    "Not Rebooked %": h.cx_nr_pct ?? null,
    "Booked Within 7 Days %": h.cx_in7_pct ?? null,
  }));

  return (
    <>
      <PageHeader title="Clinic Health" subtitle="Activity, occupancy, retention, and cancellations." />
      <div className="flex flex-col gap-6 p-8">
        <div>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Clinic Activity</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile {...clinicStatTile(history, "total_consults")} label="Completed Appointments" />
            <StatTile {...clinicStatTile(history, "total_nc")} label="New Patients" />
            <StatTile {...clinicStatTile(history, "clinic_occ")} label="Clinic Occupancy" />
            <StatTile {...clinicStatTile(history, "online_bookings_new")} label="Online Bookings — New" />
          </div>
        </div>

        <Card title="Weekly Activity">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <MultiLineChart
              title="Total Appointments vs New Patients"
              data={history.map((h) => ({
                label: formatWeekLabel(h.week_ending),
                "Completed Appointments": h.total_consults ?? null,
                "New Patients": h.total_nc ?? null,
              }))}
              seriesKeys={["Completed Appointments", "New Patients"]}
              format="number"
            />
            <LineTrendChart
              title="Online Bookings (Total)"
              data={toTrendSeries(history, "online_bookings_total")}
              format="number"
              colorIndex={4}
            />
          </div>
        </Card>

        <Card title="Occupancy by Service Line">
          <MultiLineChart
            title="Clinic / Physio / Massage / EP Occupancy"
            data={occupancyData}
            seriesKeys={["Clinic", "Physio", "Massage", "EP"]}
            format="percent"
            height={260}
          />
        </Card>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Retention / Value</h2>
          <NotTrackedPanel
            title="Clinic-wide UCVA / NCVA / TPR"
            items={["a clinic-level rollup of provider UCVA, NCVA, and TPR — the tier breakdown below is tracked"]}
          />
          <div className="mt-4">
            <Card title="CVA by Provider Tier">
              <p className="mb-3 text-xs text-muted">
                Client visit average by New Grad / 2-5yr / Senior (6+yr) / Massage / EP — this displays efficiency.
              </p>
              <MultiLineChart
                title="CVA by Tier"
                data={cvaData}
                seriesKeys={["New Grad", "2-5yr", "Senior (6+yr)", "Massage", "EP"]}
                format="decimal"
                decimals={2}
              />
            </Card>
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Cancellations</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile {...clinicStatTile(history, "cx_cancels", "down")} label="Total Cancellations" />
            <StatTile {...clinicStatTile(history, "cx_pct", "down")} label="Cancellation %" />
            <StatTile {...clinicStatTile(history, "cx_dnas", "down")} label="DNAs" />
            <StatTile {...clinicStatTile(history, "cx_rsx_pct")} label="Reschedule Rate (Save Rate)" />
          </div>
          <div className="mt-4">
            <Card title="Cancellations Trend">
              <MultiLineChart
                title="Cancellation % / Reschedule (Save) Rate / Not Rebooked % / Booked Within 7 Days %"
                data={cancellationData}
                seriesKeys={["Cancellation %", "Reschedule Rate (Save Rate)", "Not Rebooked %", "Booked Within 7 Days %"]}
                format="percent"
              />
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
