import { PageHeader } from "@/components/nav/PageHeader";
import { MeetingNotes } from "@/components/programTracker/MeetingNotes";
import { createProgramTrackerAdminClient } from "@/lib/programTracker/supabaseAdmin";
import { Meeting } from "@/lib/programTracker/types";

export default async function MeetingsPage() {
  let data: Meeting[] | null = null;
  let error: { message: string } | null = null;
  try {
    const supabase = createProgramTrackerAdminClient();
    const res = await supabase.from("meetings").select("*").order("meeting_date", { ascending: false });
    data = res.data as Meeting[] | null;
    error = res.error;
  } catch (e) {
    error = { message: e instanceof Error ? e.message : "Unknown error" };
  }

  return (
    <>
      <PageHeader title="Meeting Notes" showWeekSelector={false} />
      <div className="p-8">
        {error ? <p className="text-sm text-danger">Could not load meetings: {error.message}</p> : <MeetingNotes initialMeetings={(data ?? []) as Meeting[]} />}
      </div>
    </>
  );
}
