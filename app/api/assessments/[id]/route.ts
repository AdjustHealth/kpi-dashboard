import { NextRequest, NextResponse } from "next/server";
import { assessmentToolSql } from "@/lib/assessmentTool/db";
import { requireLogin } from "@/lib/requireLogin";
import type { AssessmentSummary } from "@/lib/assessmentTool/types";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireLogin();
  if (unauthorized) return unauthorized;
  const { id } = await params;

  const { formData, summary } = (await request.json()) as {
    formData: Record<string, unknown>;
    summary: AssessmentSummary;
  };

  try {
    const sql = assessmentToolSql();
    await sql`
      update assessments set
        athlete_name = ${summary.athleteName},
        assess_type = ${summary.assessType},
        youth_tier = ${summary.youthTier},
        clinician = ${summary.clinician},
        assessment_date = ${summary.assessmentDate || null},
        overall_score = ${summary.overallScore},
        form_data = ${sql.json(JSON.parse(JSON.stringify(formData)))}
      where id = ${id}
    `;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireLogin();
  if (unauthorized) return unauthorized;
  const { id } = await params;

  try {
    const sql = assessmentToolSql();
    await sql`delete from assessments where id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
