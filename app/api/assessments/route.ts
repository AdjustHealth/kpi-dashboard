import { NextRequest, NextResponse } from "next/server";
import { assessmentToolSql } from "@/lib/assessmentTool/db";
import { requireLogin } from "@/lib/requireLogin";
import type { AssessmentSummary } from "@/lib/assessmentTool/types";

export async function POST(request: NextRequest) {
  const unauthorized = await requireLogin();
  if (unauthorized) return unauthorized;

  const { formData, summary } = (await request.json()) as {
    formData: Record<string, unknown>;
    summary: AssessmentSummary;
  };

  try {
    const sql = assessmentToolSql();
    const rows = await sql`
      insert into assessments
        (athlete_name, assess_type, youth_tier, clinician, assessment_date, overall_score, form_data)
      values (
        ${summary.athleteName},
        ${summary.assessType},
        ${summary.youthTier},
        ${summary.clinician},
        ${summary.assessmentDate || null},
        ${summary.overallScore},
        ${sql.json(JSON.parse(JSON.stringify(formData)))}
      )
      returning id
    `;
    return NextResponse.json({ id: rows[0].id as string });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
