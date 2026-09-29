import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id, flagged_for_discussion, discussion_note, not_rebooked_resolved, client, provider, source } = body as {
    id?: string;
    flagged_for_discussion?: boolean;
    discussion_note?: string | null;
    not_rebooked_resolved?: boolean;
    /** Resolving a whole client instead of one row — see below. */
    client?: string;
    provider?: string;
    /**
     * Which table `id` belongs to. The Unretained list (getNotRebookedClients)
     * merges cancellation_events and no_future_booking_events rows into one
     * UI, and an id only ever exists in its own source table — updating the
     * wrong one silently matches zero rows. Defaults to "cancellation" so
     * existing callers (the general Cancellations tab, which is always
     * cancellation_events) keep working unchanged.
     */
    source?: "cancellation" | "no_future_booking";
  };

  const table = source === "no_future_booking" ? "no_future_booking_events" : "cancellation_events";
  const supabase = await createClient();

  // "Dealt with" on the Unretained list resolves every one of this
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

    // A client can also be on this list via no_future_booking_events (the
    // Last Attendances Report — attended a real appointment, never
    // cancelled anything, just never booked again) rather than a
    // cancellation_events row — resolve that source too so "Dealt With"
    // clears the client regardless of which report surfaced them.
    const { error: nfbError } = await supabase
      .from("no_future_booking_events")
      .update({ not_rebooked_resolved: true })
      .eq("provider", provider)
      .eq("client", client)
      .eq("not_rebooked_resolved", false);
    if (nfbError) return NextResponse.json({ error: nfbError.message }, { status: 500 });
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

  const { error } = await supabase.from(table).update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
