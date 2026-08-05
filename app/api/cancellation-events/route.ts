import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id, flagged_for_discussion, discussion_note, not_rebooked_resolved } = body as {
    id?: string;
    flagged_for_discussion?: boolean;
    discussion_note?: string | null;
    not_rebooked_resolved?: boolean;
  };

  if (
    !id ||
    (flagged_for_discussion === undefined && discussion_note === undefined && not_rebooked_resolved === undefined)
  ) {
    return NextResponse.json(
      {
        error:
          "id and at least one of flagged_for_discussion/discussion_note/not_rebooked_resolved are required",
      },
      { status: 400 }
    );
  }

  const patch: Record<string, unknown> = {};
  if (flagged_for_discussion !== undefined) patch.flagged_for_discussion = flagged_for_discussion;
  if (discussion_note !== undefined) patch.discussion_note = discussion_note;
  if (not_rebooked_resolved !== undefined) patch.not_rebooked_resolved = not_rebooked_resolved;

  const supabase = await createClient();
  const { error } = await supabase.from("cancellation_events").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
