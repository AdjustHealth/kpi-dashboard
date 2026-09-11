import { notFound } from "next/navigation";
import { assessmentToolSql } from "@/lib/assessmentTool/db";
import { AssessmentToolFrame } from "@/components/assessmentTool/AssessmentToolFrame";

export default async function AssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const sql = assessmentToolSql();
  const rows = await sql`select id, form_data from assessments where id = ${id}`;
  if (rows.length === 0) notFound();

  return <AssessmentToolFrame assessmentId={rows[0].id as string} initialFormData={rows[0].form_data as Record<string, unknown>} />;
}
