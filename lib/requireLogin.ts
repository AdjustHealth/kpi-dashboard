import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Shared by route handlers that bridge into another Adjust Health tool's own
 * database (Program Tracker, Assessment Tool) — route handlers aren't wrapped
 * by (app)/layout.tsx's login check the way pages are, and these bridged
 * data sources have no RLS of their own to fall back on, so each such route
 * checks this itself. The bar is just "logged into kpi-dashboard" — neither
 * bridged tool has ever had its own per-role restriction.
 */
export async function requireLogin(): Promise<NextResponse | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  return null;
}
