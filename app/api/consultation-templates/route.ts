import { NextRequest, NextResponse } from "next/server";
import { assessmentToolSql } from "@/lib/assessmentTool/db";
import { requireSection } from "@/lib/requireLogin";
import type { ConsultNote, ConsultFormData } from "@/lib/consultationTemplates/types";

export async function POST(request: NextRequest) {
  const unauthorized = await requireSection("assessment_tool");
  if (unauthorized) return unauthorized;

  const { note } = (await request.json()) as { note: ConsultNote };
  const formData: ConsultFormData = { note, report: null };

  try {
    const sql = assessmentToolSql();
    const rows = await sql`
      insert into assessments
        (athlete_name, assess_type, youth_tier, clinician, assessment_date, overall_score, form_data)
      values (
        ${note.patientName},
        'initial_consult',
        null,
        ${note.clinician || null},
        ${note.consultDate || null},
        null,
        ${sql.json(JSON.parse(JSON.stringify(formData)))}
      )
      returning id
    `;
    return NextResponse.json({ id: rows[0].id as string });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
