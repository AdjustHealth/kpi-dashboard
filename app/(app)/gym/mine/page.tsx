import { PageHeader } from "@/components/nav/PageHeader";
import { MembersTable } from "@/components/programTracker/MembersTable";
import { createProgramTrackerAdminClient } from "@/lib/programTracker/supabaseAdmin";
import { createClient } from "@/lib/supabase/server";
import { calcDueStatus, holdEndOf } from "@/lib/programTracker/date";
import { coachNameForUser } from "@/lib/programTracker/coach";
import { Member } from "@/lib/programTracker/types";

export default async function MyListPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const coach = coachNameForUser(user?.email);

  let data: Member[] | null = [];
  let error: { message: string } | null = null;
  if (coach) {
    try {
      const trackerSupabase = createProgramTrackerAdminClient();
      const res = await trackerSupabase.from("members").select("*").eq("coach", coach);
      data = res.data as Member[] | null;
      error = res.error;
    } catch (e) {
      error = { message: e instanceof Error ? e.message : "Unknown error" };
    }
  }

  const members: Member[] = ((data ?? []) as Member[]).map((m) => ({ ...m, due_status: calcDueStatus(m.next_due, m.status, holdEndOf(m)) }));

  return (
    <>
      <PageHeader title="My List" subtitle={coach ? `Members assigned to ${coach}.` : undefined} showWeekSelector={false} />
      <div className="p-8">
        {!coach ? (
          <p className="text-sm text-muted">
            Couldn&apos;t match your login to a coach name on the Program Tracker. If you are a coach, let Michael know so this can be pointed at the
            right name.
          </p>
        ) : error ? (
          <p className="text-sm text-danger">Could not load members: {error.message}</p>
        ) : (
          <MembersTable initialMembers={members} coach={coach} />
        )}
      </div>
    </>
  );
}
