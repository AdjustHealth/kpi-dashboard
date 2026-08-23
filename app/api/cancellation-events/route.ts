import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id, flagged_for_discussion, discussion_note, not_rebooked_resolved, client, provider } = body as {
    id?: string;
    flagged_for_discussion?: boolean;
    discussion_note?: string | null;
    not_rebooked_resolved?: boolean;
    /** Resolving a whole client instead of one row — see below. */
    client?: string;
    provider?: string;
  };

  const supabase = await createClient();

  // "Dealt with" on the Not Rebooked list resolves every one of this
  // client's currently-unresolved not-rebooked rows for this provider, not
  // just the single row shown — a client who's cancelled repeatedly
  // without rebooking (e.g. moving away, a chronic no-show) can have
  // several separate cancellation_events rows across different weeks, and
  // the whole point of dismissing them is that the client shouldn't
  // resurface via one of the others a moment later. A genuinely new
  // cancellation created by a later Nookal upload still gets its own fresh
  // row and shows up again untouched, same as before.
  if (not_rebooked_resolved === true && client && provider) {
    const { error } = await supabase
      .from("cancellation_events")
      .update({ not_rebooked_resolved: true })
      .eq("provider", provider)
      .eq("client", client)
      .eq("status", "Cancelled")
      .is("next_booking", null)
      .eq("not_rebooked_resolved", false);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

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

  const { error } = await supabase.from("cancellation_events").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
