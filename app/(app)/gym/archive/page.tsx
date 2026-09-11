import { PageHeader } from "@/components/nav/PageHeader";
import { CoachBadge, TypeBadge } from "@/components/programTracker/badges";
import { createProgramTrackerAdminClient } from "@/lib/programTracker/supabaseAdmin";
import { fmtDate } from "@/lib/programTracker/date";
import { ArchiveRow } from "@/lib/programTracker/types";

/** Completed blocks — one row per "✓ Done" click on the Members table, same as the standalone site's Archive tab. */
export default async function GymArchivePage() {
  const supabase = createProgramTrackerAdminClient();
  const { data, error } = await supabase.from("archive").select("*").eq("archive_type", "block_complete").order("archived_at", { ascending: false });

  return (
    <>
      <PageHeader title="Archive" showWeekSelector={false} />
      <div className="p-8">
        {error ? (
          <p className="text-sm text-danger">Could not load the archive: {error.message}</p>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted">No completed blocks yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-raised text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-medium">Member</th>
                  <th className="px-4 py-3 font-medium">Coach</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Block start</th>
                  <th className="px-4 py-3 font-medium">Wks</th>
                  <th className="px-4 py-3 font-medium">Next due</th>
                  <th className="px-4 py-3 font-medium">Notes</th>
                  <th className="px-4 py-3 font-medium">Archived</th>
                </tr>
              </thead>
              <tbody>
                {(data as ArchiveRow[]).map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium text-foreground">{r.name}</td>
                    <td className="px-4 py-3">
                      <CoachBadge coach={r.coach} />
                    </td>
                    <td className="px-4 py-3">
                      <TypeBadge type={r.type} />
                    </td>
                    <td className="px-4 py-3 text-muted">{fmtDate(r.block_start)}</td>
                    <td className="px-4 py-3 text-muted">{r.block_weeks ?? "—"}</td>
                    <td className="px-4 py-3 text-muted">{fmtDate(r.next_due)}</td>
                    <td className="max-w-[220px] truncate px-4 py-3 text-muted">{r.notes || ""}</td>
                    <td className="px-4 py-3 text-muted">{fmtDate(r.archived_at?.split("T")[0])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
