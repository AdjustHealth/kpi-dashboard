import Link from "next/link";
import { PageHeader } from "@/components/nav/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { LineTrendChart } from "@/components/charts/LineTrendChart";
import { getClinicHistory } from "@/lib/clinicData";
import { clinicStatTile, toTrendSeries } from "@/components/dashboard/statHelpers";
import { defaultWeekEnding, clinicHistoryWeeks } from "@/lib/week";

const QUICK_LINKS = [
  { href: "/clinic/revenue", label: "Revenue", desc: "Trend, target, and payer mix" },
  { href: "/clinic/health", label: "Clinic Health", desc: "Activity, occupancy, retention, cancellations" },
  { href: "/clinic/specialty", label: "Specialty Services", desc: "Specialty consults and JBV growth" },
  { href: "/providers", label: "Providers", desc: "Weekly meetings by provider" },
  { href: "/senior", label: "Senior Physio", desc: "Sam & Marcio — KPIs and bonus tracking" },
  { href: "/admin", label: "Admin", desc: "Weekly meetings by admin staff" },
];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week: weekParam } = await searchParams;
  const week = weekParam ?? defaultWeekEnding();
  const history = await getClinicHistory(week, clinicHistoryWeeks(week));

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Adjust Health at a glance." showBack={false} />
      <div className="flex flex-col gap-6 p-8">
        <div>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Revenue</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile {...clinicStatTile(history, "total_rev")} label="Adjust Revenue" />
            <StatTile {...clinicStatTile(history, "gym_total")} label="Gym Revenue" />
            <StatTile {...clinicStatTile(history, "m_pod_rev")} label="Podiatry Revenue" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile {...clinicStatTile(history, "total_consults")} />
          <StatTile {...clinicStatTile(history, "total_nc")} />
          <StatTile {...clinicStatTile(history, "clinic_occ")} />
        </div>

        <Card title="Revenue Trend">
          <LineTrendChart
            title="Total Adjust + Podiatry Revenue"
            data={toTrendSeries(history, "total_adjust_pod_rev")}
            format="currency"
            colorIndex={0}
            height={220}
          />
        </Card>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Jump to</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.href}
                href={`${link.href}?week=${week}`}
                className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent"
              >
                <span className="text-sm font-medium text-foreground">{link.label}</span>
                <span className="text-xs text-muted">{link.desc}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
