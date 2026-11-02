import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireDirector } from "@/lib/auth/access";
import { previewOnlineBookingsWeek } from "@/lib/nookal/applyReport";

/**
 * Read-only companion to /api/nookal-reprocess, scoped to just the Online
 * Bookings Report split — lets a past week be checked (current stored
 * numbers vs what today's cross-reference logic would produce) before
 * committing via the full reprocess, which overwrites immediately.
 */
export async function POST(request: NextRequest) {
  await requireDirector();
  const body = await request.json();
  const { weeks } = body as { weeks?: string[] };
  if (!weeks || weeks.length === 0) return NextResponse.json({ error: "weeks is required" }, { status: 400 });

  const supabase = await createClient();
  const results = await Promise.all(weeks.map((w) => previewOnlineBookingsWeek(supabase, w)));
  return NextResponse.json({ results });
}
