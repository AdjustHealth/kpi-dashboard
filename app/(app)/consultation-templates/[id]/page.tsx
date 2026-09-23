import { notFound } from "next/navigation";
import { PageHeader } from "@/components/nav/PageHeader";
import { assessmentToolSql } from "@/lib/assessmentTool/db";
import { ConsultWorkspace } from "@/components/consultationTemplates/ConsultWorkspace";
import type { ConsultFormData } from "@/lib/consultationTemplates/types";
import { requireSection } from "@/lib/auth/access";

export default async function ConsultationPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSection("assessment_tool");
  const { id } = await params;

  const sql = assessmentToolSql();
  const rows = await sql`select id, form_data from assessments where id = ${id} and assess_type = 'initial_consult'`;
  if (rows.length === 0) notFound();

  const formData = rows[0].form_data as ConsultFormData;

  return (
    <>
      <PageHeader title="Initial Consultation" subtitle="Client-Centred Consult" showWeekSelector={false} />
      <ConsultWorkspace consultId={rows[0].id as string} initialNote={formData.note} initialReport={formData.report} />
    </>
  );
}
