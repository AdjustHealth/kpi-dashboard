import { PageHeader } from "@/components/nav/PageHeader";
import { MembersTable } from "@/components/programTracker/MembersTable";
import { createProgramTrackerAdminClient } from "@/lib/programTracker/supabaseAdmin";
import { calcDueStatus, holdEndOf } from "@/lib/programTracker/date";
import { Member } from "@/lib/programTracker/types";

export default async function TrackerPage() {
  const supabase = createProgramTrackerAdminClient();
  const { data, error } = await supabase.from("members").select("*");

  const members: Member[] = ((data ?? []) as Member[])
    .map((m) => ({ ...m, due_status: calcDueStatus(m.next_due, m.status, holdEndOf(m)) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <PageHeader title="Program Tracker" subtitle="Client blocks and due dates — same live data as adjust-programming.netlify.app." showWeekSelector={false} />
      <div className="p-8">
        {error ? (
          <p className="text-sm text-danger">Could not load members: {error.message}</p>
        ) : (
          <MembersTable initialMembers={members} />
        )}
      </div>
    </>
  );
}
