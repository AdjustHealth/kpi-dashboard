import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireSection } from "@/lib/auth/access";
import { assessmentToolSql } from "@/lib/assessmentTool/db";
import { ReportDocument } from "@/components/consultationTemplates/ReportDocument";
import type { ConsultFormData } from "@/lib/consultationTemplates/types";

/**
 * Deliberately outside the (app) route group — this is the patient-facing
 * document itself (opened to print/"Save as PDF"), not a page of the hub's
 * own UI, so it must not inherit (app)/layout.tsx's dark theme and Sidebar
 * chrome. requireSection() alone doesn't enforce login (it trusts the
 * layout it's normally called under for that), so this checks auth directly
 * first, same as app/login/page.tsx.
 */
export default async function ConsultReportPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await requireSection("assessment_tool");
  const { id } = await params;

  const sql = assessmentToolSql();
  const rows = await sql`select form_data from assessments where id = ${id} and assess_type = 'initial_consult'`;
  if (rows.length === 0) notFound();

  const formData = rows[0].form_data as ConsultFormData;
  if (!formData.report) notFound();

  return <ReportDocument note={formData.note} report={formData.report} />;
}
