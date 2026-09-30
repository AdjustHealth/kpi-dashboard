import { NextRequest, NextResponse } from "next/server";
import { assessmentToolSql } from "@/lib/assessmentTool/db";
import { requireSection } from "@/lib/requireLogin";
import type { BjjScreenFormData } from "@/lib/bjjInjuryScreen/types";

export async function POST(request: NextRequest) {
  const unauthorized = await requireSection("assessment_tool");
  if (unauthorized) return unauthorized;

  const data = (await request.json()) as BjjScreenFormData;

  try {
    const sql = assessmentToolSql();
    const rows = await sql`
      insert into assessments
        (athlete_name, assess_type, youth_tier, clinician, assessment_date, overall_score, form_data)
      values (
        ${data.athleteName},
        'bjj_injury_screen',
        null,
        ${data.clinician || null},
        ${data.assessmentDate || null},
        null,
        ${sql.json(JSON.parse(JSON.stringify(data)))}
      )
      returning id
    `;
    return NextResponse.json({ id: rows[0].id as string });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
