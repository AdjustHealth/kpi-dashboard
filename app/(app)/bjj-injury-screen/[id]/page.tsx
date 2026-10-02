import { notFound } from "next/navigation";
import { PageHeader } from "@/components/nav/PageHeader";
import { assessmentToolSql } from "@/lib/assessmentTool/db";
import { BjjScreenWorkspace } from "@/components/bjjInjuryScreen/BjjScreenWorkspace";
import { mergeBjjScreen, type BjjScreenFormData } from "@/lib/bjjInjuryScreen/types";
import { requireSection } from "@/lib/auth/access";

export default async function BjjInjuryScreenDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSection("assessment_tool");
  const { id } = await params;

  const sql = assessmentToolSql();
  const rows = await sql`select id, form_data from assessments where id = ${id} and assess_type = 'bjj_injury_screen'`;
  if (rows.length === 0) notFound();

  const formData = rows[0].form_data as BjjScreenFormData;

  return (
    <>
      <PageHeader title="BJJ Performance Assessment" subtitle="Mobility, Strength & Power" showWeekSelector={false} />
      <BjjScreenWorkspace screenId={rows[0].id as string} initialData={mergeBjjScreen(formData)} />
    </>
  );
}
