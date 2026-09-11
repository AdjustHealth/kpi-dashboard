import { PageHeader } from "@/components/nav/PageHeader";
import { MeetingNotes } from "@/components/programTracker/MeetingNotes";
import { createProgramTrackerAdminClient } from "@/lib/programTracker/supabaseAdmin";
import { Meeting } from "@/lib/programTracker/types";

export default async function MeetingsPage() {
  const supabase = createProgramTrackerAdminClient();
  const { data, error } = await supabase.from("meetings").select("*").order("meeting_date", { ascending: false });

  return (
    <>
      <PageHeader title="Meeting Notes" showWeekSelector={false} />
      <div className="p-8">
        {error ? <p className="text-sm text-danger">Could not load meetings: {error.message}</p> : <MeetingNotes initialMeetings={(data ?? []) as Meeting[]} />}
      </div>
    </>
  );
}
