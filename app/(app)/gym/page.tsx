import { PageHeader } from "@/components/nav/PageHeader";
import { MembersTable } from "@/components/programTracker/MembersTable";
import { createProgramTrackerAdminClient } from "@/lib/programTracker/supabaseAdmin";
import { calcDueStatus, holdEndOf } from "@/lib/programTracker/date";
import { Member } from "@/lib/programTracker/types";

export default async function GymAllMembersPage() {
  const supabase = createProgramTrackerAdminClient();
  const { data, error } = await supabase.from("members").select("*");

  const members: Member[] = ((data ?? []) as Member[]).map((m) => ({ ...m, due_status: calcDueStatus(m.next_due, m.status, holdEndOf(m)) }));

  return (
    <>
      <PageHeader title="All Members" showWeekSelector={false} />
      <div className="p-8">
        {error ? <p className="text-sm text-danger">Could not load members: {error.message}</p> : <MembersTable initialMembers={members} />}
      </div>
    </>
  );
}
