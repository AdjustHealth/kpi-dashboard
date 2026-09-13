import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { myProvider } from "@/lib/providerIdentity";

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
