import { PageHeader } from "@/components/nav/PageHeader";
import { MembersTable } from "@/components/programTracker/MembersTable";
import { createProgramTrackerAdminClient } from "@/lib/programTracker/supabaseAdmin";
import { calcDueStatus, holdEndOf } from "@/lib/programTracker/date";
import { Member } from "@/lib/programTracker/types";

export default async function GymAllMembersPage() {
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
