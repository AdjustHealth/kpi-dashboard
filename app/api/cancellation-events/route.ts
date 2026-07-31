import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id, flagged_for_discussion, discussion_note } = body as {
    id?: string;
    flagged_for_discussion?: boolean;
    discussion_note?: string | null;
  };

  if (!id || (flagged_for_discussion === undefined && discussion_note === undefined)) {
    return NextResponse.json(
      { error: "id and at least one of flagged_for_discussion/discussion_note are required" },
      { status: 400 }
    );
  }

  const patch: Record<string, unknown> = {};
  if (flagged_for_discussion !== undefined) patch.flagged_for_discussion = flagged_for_discussion;
  if (discussion_note !== undefined) patch.discussion_note = discussion_note;

  const supabase = await createClient();
  const { error } = await supabase.from("cancellation_events").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
