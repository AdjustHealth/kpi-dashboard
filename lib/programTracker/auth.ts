import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * The Program Tracker's own Supabase project has no per-role restriction
 * (every logged-in Program Tracker user has always had full member access),
 * so the bar here is just "logged into kpi-dashboard" — same as the rest of
 * this app's API routes get for free via (app)/layout.tsx, except route
 * handlers aren't wrapped by that layout, and this data source has no RLS
 * of its own to fall back on (service_role bypasses it entirely).
 */
export async function requireLogin(): Promise<NextResponse | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  return null;
}
