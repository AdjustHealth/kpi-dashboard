import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAccessContext } from "@/lib/auth/access";
import { myProvider } from "@/lib/providerIdentity";

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

  // A director, or anyone with ANY provider-role access to cancellation_events
  // — a full Meetings section grant (widens allowedProviderRoles to every
  // role) OR the narrower per-role Meetings grant (e.g. Marcio: physio/
  // massage/ep) — edits any row through the ordinary RLS-scoped client, same
  // as always: can_access_provider_role() in the RLS policy itself (see
  // migrations 0029/0039) already enforces the correct per-role scoping,
  // including on a row that belongs to someone else's meeting they're
  // running, not just their own. This used to check allowedSections.includes
  // ("meetings") alone, missing Marcio's granular grant entirely — so every
  // "Dealt with" click on a standard provider's Unretained list (e.g.
  // Dean's, on Marcio's own provider-meeting page) fell through to the
  // ownProviderName branch below, which only ever matches the CALLER's own
  // name, 404'd, and bounced the optimistic UI update straight back.
  //
  // Everyone else — a practitioner with no provider-role access at all (e.g.
  // only Adjust Gym/Assessment Tool grants) acting on their own Unretained
  // section on My Dashboard — couldn't read these tables through the
  // RLS-scoped client even for their own rows, so gets the admin client
  // instead, but only ever to touch rows that are actually theirs, verified
  // below (same ownership-check pattern as /api/my-week-events).
  const { isDirector, allowedProviderRoles } = await getAccessContext();
  const hasProviderRoleAccess = isDirector || allowedProviderRoles.length > 0;

  let ownProviderName: string | null = null;
  if (!hasProviderRoleAccess) {
    const authedSupabase = await createClient();
    const {
      data: { user },
    } = await authedSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    const { provider: myOwnProvider, error: providerError } = await myProvider(user.email);
    if (providerError) return NextResponse.json({ error: providerError }, { status: 500 });
    if (!myOwnProvider) return NextResponse.json({ error: "Could not match your login to a provider" }, { status: 403 });
    ownProviderName = myOwnProvider.name;
  }

  const supabase = hasProviderRoleAccess ? await createClient() : createAdminClient();

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
    if (ownProviderName && provider !== ownProviderName) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
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

  if (ownProviderName) {
    const { data: existing, error: fetchError } = await supabase.from(table).select("provider").eq("id", id).maybeSingle();
    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
    if (!existing || existing.provider !== ownProviderName) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  const patch: Record<string, unknown> = {};
  if (flagged_for_discussion !== undefined) patch.flagged_for_discussion = flagged_for_discussion;
  if (discussion_note !== undefined) patch.discussion_note = discussion_note;
  if (not_rebooked_resolved !== undefined) patch.not_rebooked_resolved = not_rebooked_resolved;

  const { error } = await supabase.from(table).update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
