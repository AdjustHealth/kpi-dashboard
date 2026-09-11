import { PageHeader } from "@/components/nav/PageHeader";
import { CoachBadge, TypeBadge } from "@/components/programTracker/badges";
import { EmptyState } from "@/components/ui/EmptyState";
import { createProgramTrackerAdminClient } from "@/lib/programTracker/supabaseAdmin";
import { fmtDate } from "@/lib/programTracker/date";
import { ArchiveRow } from "@/lib/programTracker/types";

const CANCELLED_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <circle cx="12" cy="12" r="9" />
    <path d="m9 9 6 6m0-6-6 6" />
  </svg>
);

/** Members removed from the tracker — one row per "Remove from tracker" click in the member edit modal, same as the standalone site's Cancelled tab. */
export default async function GymCancelledPage() {
  let data: ArchiveRow[] | null = null;
  let error: { message: string } | null = null;
  try {
    const supabase = createProgramTrackerAdminClient();
    const res = await supabase.from("archive").select("*").eq("archive_type", "cancelled").order("archived_at", { ascending: false });
    data = res.data as ArchiveRow[] | null;
    error = res.error;
  } catch (e) {
    // A thrown/rejected fetch (network hiccup, cold-start timeout) isn't caught by
    // the { error } shape above — without this the whole page crashes instead of
    // showing the same "couldn't load" message a normal Postgrest error gets.
    error = { message: e instanceof Error ? e.message : "Unknown error" };
  }

  return (
    <>
      <PageHeader title="Cancelled" showWeekSelector={false} />
      <div className="p-8">
        {error ? (
          <p className="text-sm text-danger">Could not load cancelled members: {error.message}</p>
        ) : !data || data.length === 0 ? (
          <EmptyState icon={CANCELLED_ICON} message="No cancelled members — everyone removed from the tracker will show up here." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="border-b border-border bg-surface-raised px-4 py-2.5 text-sm font-semibold text-foreground">
              {data.length} cancelled {data.length === 1 ? "member" : "members"}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                    <th className="px-4 py-3 font-medium">Member</th>
                    <th className="px-4 py-3 font-medium">Coach</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Last block start</th>
                    <th className="px-4 py-3 font-medium">Notes</th>
                    <th className="px-4 py-3 font-medium">Cancelled</th>
                  </tr>
                </thead>
                <tbody>
                  {(data as ArchiveRow[]).map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-raised/60">
                      <td className="px-4 py-3 font-medium text-foreground">{r.name}</td>
                      <td className="px-4 py-3">
                        <CoachBadge coach={r.coach} />
                      </td>
                      <td className="px-4 py-3">
                        <TypeBadge type={r.type} />
                      </td>
                      <td className="px-4 py-3 text-muted">{fmtDate(r.block_start)}</td>
                      <td className="max-w-[280px] truncate px-4 py-3 text-muted">{r.notes || ""}</td>
                      <td className="px-4 py-3 text-muted">{fmtDate(r.archived_at?.split("T")[0])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
