import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { myProvider, getMyWeekCancellations, getMyWeekFollowUps } from "@/lib/providerIdentity";
import { defaultWeekEnding } from "@/lib/week";

/**
 * Fetched client-side by MyCancellationsSection instead of awaited inline in
 * app/(app)/me/page.tsx's server render — kept off that page's critical
 * path so a slow/failing cancellations lookup can never take down the rest
 * of My Dashboard (stats, goals, coaching load) along with it, and so this
 * one extra pair of admin-client queries doesn't add to the concurrent load
 * on the same request that's already fetching provider history/targets.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { provider, error: providerError } = await myProvider(user.email);
  if (providerError) return NextResponse.json({ error: providerError }, { status: 500 });
  if (!provider) return NextResponse.json({ cancellations: [], followUps: [] });

  const weekParam = request.nextUrl.searchParams.get("week");
  const week = weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam) ? weekParam : defaultWeekEnding();
  const [cancellationsResult, followUpsResult] = await Promise.all([
    getMyWeekCancellations(provider.name, week),
    getMyWeekFollowUps(provider.name, week),
  ]);
  if (cancellationsResult.error) return NextResponse.json({ error: cancellationsResult.error }, { status: 500 });
  if (followUpsResult.error) return NextResponse.json({ error: followUpsResult.error }, { status: 500 });

  return NextResponse.json({ cancellations: cancellationsResult.rows, followUps: followUpsResult.rows });
}

/**
 * Lets a practitioner tick their own cancellation/follow-up rows as dealt
 * with on My Dashboard — a separate, narrower endpoint from
 * /api/cancellation-events (which the director's Cancellations/Unretained
 * pages use) because cancellation_events read/update access is scoped to
 * Meetings provider-role access (migration 0029_scoped_staff_access.sql),
 * which a practitioner with only Adjust Gym/Assessment Tool grants doesn't
 * have — even for their own rows. Uses the admin client, same as
 * lib/providerIdentity.ts, but narrowly: only ever updates a row this
 * logged-in user's own resolved provider name actually owns.
 */
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { kind, id, dealt_with } = body as {
    kind?: "cancellation" | "followup";
    id?: string;
    dealt_with?: boolean;
  };

  if (!kind || !id || dealt_with === undefined) {
    return NextResponse.json({ error: "kind, id and dealt_with are required" }, { status: 400 });
  }
  if (kind !== "cancellation" && kind !== "followup") {
    return NextResponse.json({ error: "kind must be 'cancellation' or 'followup'" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { provider, error: providerError } = await myProvider(user.email);
  if (providerError) return NextResponse.json({ error: providerError }, { status: 500 });
  if (!provider) return NextResponse.json({ error: "Could not match your login to a provider" }, { status: 403 });

  const table = kind === "cancellation" ? "cancellation_events" : "no_future_booking_events";
  const admin = createAdminClient();

  // Ownership check — a practitioner can only tick their own rows, never an
  // arbitrary row id belonging to a colleague.
  const { data: existing, error: fetchError } = await admin.from(table).select("provider").eq("id", id).maybeSingle();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!existing || existing.provider !== provider.name) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { error } = await admin.from(table).update({ dealt_with }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
