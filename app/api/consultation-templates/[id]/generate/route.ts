import { NextRequest, NextResponse } from "next/server";
import { assessmentToolSql } from "@/lib/assessmentTool/db";
import { requireSection } from "@/lib/requireLogin";
import { generateConsultOutputs } from "@/lib/consultationTemplates/generate";
import {
  mergeConsultNote,
  type ConsultFormData,
  type GeneratedReport,
} from "@/lib/consultationTemplates/types";

/** Runs the AI generation step against the note currently saved for this
 * consult (the client always saves note edits before calling this, so the
 * DB copy is the source of truth) and persists the result — a physio can
 * come back to a saved consult and (re)generate without re-filling anything. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireSection("assessment_tool");
  if (unauthorized) return unauthorized;
  const { id } = await params;

  try {
    const sql = assessmentToolSql();
    const rows =
      await sql`select form_data from assessments where id = ${id} and assess_type = 'initial_consult'`;
    if (rows.length === 0)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const existing = rows[0].form_data as ConsultFormData;
    const note = mergeConsultNote(existing.note);

    const outcome = await generateConsultOutputs(note);
    if (!outcome.ok) {
      return NextResponse.json({ error: outcome.reason }, { status: 502 });
    }
    const result = outcome;

    const report: GeneratedReport = {
      focusArea: result.focusArea,
      keyFindings: result.keyFindings,
      sections: result.sections,
      nookalNotes: result.nookalNotes,
      planCleanup: result.planCleanup,
      generatedAt: new Date().toISOString(),
    };
    const formData: ConsultFormData = { note, report };

    await sql`update assessments set form_data = ${sql.json(JSON.parse(JSON.stringify(formData)))} where id = ${id}`;
    return NextResponse.json({ report });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
