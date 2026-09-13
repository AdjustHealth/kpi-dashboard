import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext, Section } from "@/lib/auth/access";

/**
 * Shared by route handlers that bridge into another Adjust Health tool's own
 * database (Program Tracker, Assessment Tool) — route handlers aren't wrapped
 * by (app)/layout.tsx's login check the way pages are, and these bridged
 * data sources have no RLS of their own to fall back on, so each such route
 * checks this itself. The bar is just "logged into kpi-dashboard".
 */
export async function requireLogin(): Promise<NextResponse | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  return null;
}

/**
 * Same bridged-tool reasoning as requireLogin(), plus the business-area
 * check — Adjust Gym and Assessment Tool now each need their own section
 * grant (see migration 0039_section_level_access.sql), and since these
 * routes talk to a database with no RLS of its own, this is the only place
 * that's enforced for them.
 */
export async function requireSection(section: Section): Promise<NextResponse | null> {
  const unauthorized = await requireLogin();
  if (unauthorized) return unauthorized;
  const { isDirector, allowedSections } = await getAccessContext();
  if (!isDirector && !allowedSections.includes(section)) {
    return NextResponse.json({ error: "Not authorized for this section" }, { status: 403 });
  }
  return null;
}
