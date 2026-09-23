import { NextRequest, NextResponse } from "next/server";
import { assessmentToolSql } from "@/lib/assessmentTool/db";
import { requireSection } from "@/lib/requireLogin";
import type { ConsultFormData } from "@/lib/consultationTemplates/types";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireSection("assessment_tool");
  if (unauthorized) return unauthorized;
  const { id } = await params;

  const formData = (await request.json()) as ConsultFormData;
  const { note } = formData;

  try {
    const sql = assessmentToolSql();
    await sql`
      update assessments set
        athlete_name = ${note.patientName},
        clinician = ${note.clinician || null},
        assessment_date = ${note.consultDate || null},
        form_data = ${sql.json(JSON.parse(JSON.stringify(formData)))}
      where id = ${id} and assess_type = 'initial_consult'
    `;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireSection("assessment_tool");
  if (unauthorized) return unauthorized;
  const { id } = await params;

  try {
    const sql = assessmentToolSql();
    await sql`delete from assessments where id = ${id} and assess_type = 'initial_consult'`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
