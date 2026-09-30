import { NextResponse } from "next/server";
import { requireLogin } from "@/lib/requireLogin";
import { getAccessContext } from "@/lib/auth/access";
import { assessmentToolSql } from "@/lib/assessmentTool/db";

/**
 * One-time fix, visited directly in the browser by a director (no Neon
 * console access needed — this runs through the same working connection
 * the rest of the app already uses). The assessments table's assess_type
 * check constraint predates BJJ Injury Screen and only allows the existing
 * types, so every save/generate call fails with "violates check constraint
 * assessments_assess_type_check" until this runs once. Safe to delete this
 * route once that's confirmed fixed.
 */
export async function GET() {
  const unauthorized = await requireLogin();
  if (unauthorized) return unauthorized;
  const { isDirector } = await getAccessContext();
  if (!isDirector) {
    return NextResponse.json({ error: "Directors only" }, { status: 403 });
  }

  try {
    const sql = assessmentToolSql();
    await sql`alter table assessments drop constraint if exists assessments_assess_type_check`;
    await sql`
      alter table assessments add constraint assessments_assess_type_check
      check (assess_type in ('performance', 'youth', 'movestrong', 'initial_consult', 'bjj_injury_screen'))
    `;
    return NextResponse.json({
      ok: true,
      message: "Fixed — BJJ Injury Screens can now be saved.",
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
