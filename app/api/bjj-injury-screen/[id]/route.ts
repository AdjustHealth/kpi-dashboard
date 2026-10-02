import { NextRequest, NextResponse } from "next/server";
import { assessmentToolSql } from "@/lib/assessmentTool/db";
import { requireSection } from "@/lib/requireLogin";
import type { BjjScreenFormData } from "@/lib/bjjInjuryScreen/types";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireSection("assessment_tool");
  if (unauthorized) return unauthorized;
  const { id } = await params;

  const data = (await request.json()) as BjjScreenFormData;

  try {
    const sql = assessmentToolSql();
    await sql`
      update assessments set
        athlete_name = ${data.athleteName},
        clinician = ${data.clinician || null},
        assessment_date = ${data.assessmentDate || null},
        form_data = ${sql.json(JSON.parse(JSON.stringify(data)))}
      where id = ${id} and assess_type = 'bjj_injury_screen'
    `;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}

// DELETE is handled by the shared /api/assessments/[id] route (used by
// DeleteAssessmentButton on the Assessments page) — it deletes by id with
// no assess_type restriction, so it already covers this type too.
