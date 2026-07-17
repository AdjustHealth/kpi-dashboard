import { PageHeader } from "@/components/nav/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { MultiLineChart } from "@/components/charts/MultiLineChart";
import { NotTrackedPanel } from "@/components/dashboard/NotTrackedPanel";
import { getClinicHistory } from "@/lib/clinicData";
import { clinicStatTile } from "@/components/dashboard/statHelpers";
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
    "New Grads": h.cva_new_grads ?? null,
    "2-5yr": h.cva_2_5yr ?? null,
    EP: h.cva_ep ?? null,
    Massage: h.cva_massage ?? null,
  }));

  const cancellationData = history.map((h) => ({
    label: formatWeekLabel(h.week_ending),
    "Cancellation %": h.cx_pct ?? null,
    "Reschedule Rate": h.cx_rsx_pct ?? null,
    "Not Rebooked %": h.cx_nr_pct ?? null,
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
            <StatTile {...clinicStatTile(history, "online_bookings_total")} label="Online Bookings" />
          </div>
        </div>

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
          <h2 className="mb-3 text-sm font-semibold text-foreground">Retention</h2>
          <NotTrackedPanel title="Clinic UCVA / NCVA / TPR" items={["clinic-wide rollups of provider UCVA, NCVA, and TPR"]} />
          <div className="mt-4">
            <Card title="CVA by Provider Tier">
              <p className="mb-3 text-xs text-muted">
                Break down of client visit average by Senior Physio / New Graduate / Massage / EP.
              </p>
              <MultiLineChart
                title="CVA by Tier"
                data={cvaData}
                seriesKeys={["New Grads", "2-5yr", "EP", "Massage"]}
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
            <StatTile {...clinicStatTile(history, "cx_rsx_pct", "down")} label="Reschedule Rate" />
          </div>
          <p className="mt-2 text-[11px] text-muted">
            &ldquo;Save Rate&rdquo; from the spec isn&rsquo;t tracked yet — add a Weekly Input field for it to bring this to life.
          </p>
          <div className="mt-4">
            <Card title="Cancellations Trend">
              <MultiLineChart
                title="Cancellation % / Reschedule Rate / Not Rebooked %"
                data={cancellationData}
                seriesKeys={["Cancellation %", "Reschedule Rate", "Not Rebooked %"]}
                format="percent"
              />
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
