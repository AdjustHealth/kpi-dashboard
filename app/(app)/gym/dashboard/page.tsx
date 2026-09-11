import { PageHeader } from "@/components/nav/PageHeader";
import { CoachBadge } from "@/components/programTracker/badges";
import { createProgramTrackerAdminClient } from "@/lib/programTracker/supabaseAdmin";
import { calcDueStatus, holdEndOf } from "@/lib/programTracker/date";
import { Member, PROGRAM_TRACKER_COACHES, PROGRAM_TRACKER_PAID_TYPES, PROGRAM_TRACKER_TYPES, normType } from "@/lib/programTracker/types";

/** Mirrors the standalone Program Tracker's own dashboard tab: headline counts, members per coach, workload by coach, and members by type. */
export default async function GymDashboardPage() {
  let data: Member[] | null = null;
  let error: { message: string } | null = null;
  try {
    const supabase = createProgramTrackerAdminClient();
    const res = await supabase.from("members").select("*");
    data = res.data as Member[] | null;
    error = res.error;
  } catch (e) {
    error = { message: e instanceof Error ? e.message : "Unknown error" };
  }
  if (error) {
    return (
      <>
        <PageHeader title="Adjust Gym Dashboard" showWeekSelector={false} />
        <div className="p-8">
          <p className="text-sm text-danger">Could not load members: {error.message}</p>
        </div>
      </>
    );
  }

  const members: Member[] = ((data ?? []) as Member[]).map((m) => ({ ...m, due_status: calcDueStatus(m.next_due, m.status, holdEndOf(m)) }));
  const active = members.filter((m) => m.status === "Active");
  const onHold = members.filter((m) => m.status === "Hold");
  const overdue = members.filter((m) => m.due_status === "OVERDUE" || m.due_status === "Hold overdue");
  const dueWeek = members.filter((m) => m.due_status === "Due this week" || m.due_status === "Hold ending soon");
  const totalPaid = active.filter((m) => PROGRAM_TRACKER_PAID_TYPES.includes(normType(m.type))).length;

  const kpis = [
    { label: "Total members", value: members.length, color: "var(--accent)" },
    { label: "Active", value: active.length, color: "var(--success)" },
    { label: "On hold", value: onHold.length, color: "var(--muted)" },
    { label: "Overdue", value: overdue.length, color: "var(--danger)" },
    { label: "Due this week", value: dueWeek.length, color: "var(--warning)" },
  ];

  return (
    <>
      <PageHeader title="Adjust Gym Dashboard" showWeekSelector={false} />
      <div className="flex flex-col gap-6 p-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-xl border border-border bg-surface p-4">
              <div className="text-2xl font-semibold" style={{ color: k.color }}>
                {k.value}
              </div>
              <div className="mt-1 text-xs text-muted">{k.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <h2 className="mb-3 text-sm font-semibold text-foreground">Members per coach</h2>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                  <th className="py-2 font-medium">Coach</th>
                  <th className="py-2 text-right font-medium">Active</th>
                  <th className="py-2 text-right font-medium">% of total</th>
                </tr>
              </thead>
              <tbody>
                {PROGRAM_TRACKER_COACHES.map((c) => {
                  const n = active.filter((m) => m.coach === c).length;
                  const pct = members.length ? Math.round((n / members.length) * 100) : 0;
                  return (
                    <tr key={c} className="border-b border-border last:border-0">
                      <td className="py-2.5">
                        <CoachBadge coach={c} />
                      </td>
                      <td className="py-2.5 text-right">{n}</td>
                      <td className="py-2.5 text-right font-medium text-accent">{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold text-foreground">Workload by coach</h2>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                  <th className="py-2 font-medium">Coach</th>
                  <th className="py-2 text-right font-medium">Overdue</th>
                  <th className="py-2 text-right font-medium">Due this week</th>
                </tr>
              </thead>
              <tbody>
                {PROGRAM_TRACKER_COACHES.map((c) => {
                  const ov = members.filter((m) => m.coach === c && m.due_status === "OVERDUE").length;
                  const dw = members.filter((m) => m.coach === c && m.due_status === "Due this week").length;
                  return (
                    <tr key={c} className="border-b border-border last:border-0">
                      <td className="py-2.5">
                        <CoachBadge coach={c} />
                      </td>
                      <td className="py-2.5 text-right" style={{ color: ov > 0 ? "var(--danger)" : undefined }}>
                        {ov}
                      </td>
                      <td className="py-2.5 text-right" style={{ color: dw > 0 ? "var(--warning)" : undefined }}>
                        {dw}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="max-w-md">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Members by type (active)</h2>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                <th className="py-2 font-medium">Type</th>
                <th className="py-2 text-right font-medium">Active</th>
              </tr>
            </thead>
            <tbody>
              {PROGRAM_TRACKER_TYPES.map((t) => {
                const n = active.filter((m) => normType(m.type) === normType(t)).length;
                return (
                  <tr key={t} className="border-b border-border last:border-0">
                    <td className="py-2.5">{t}</td>
                    <td className="py-2.5 text-right">{n}</td>
                  </tr>
                );
              })}
              <tr className="font-semibold text-accent">
                <td className="py-2.5">Total paid</td>
                <td className="py-2.5 text-right">{totalPaid}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
