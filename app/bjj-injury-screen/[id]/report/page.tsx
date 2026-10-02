import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireSection } from "@/lib/auth/access";
import { assessmentToolSql } from "@/lib/assessmentTool/db";
import { BjjReportDocument } from "@/components/bjjInjuryScreen/BjjReportDocument";
import { mergeBjjScreen, type BjjScreenFormData } from "@/lib/bjjInjuryScreen/types";

/**
 * Deliberately outside the (app) route group — this is the printable
 * assessment report itself, not a page of the hub's own UI, so it must not
 * inherit (app)/layout.tsx's dark theme and Sidebar chrome. requireSection()
 * alone doesn't enforce login (it trusts the layout it's normally called
 * under for that), so this checks auth directly first, same as
 * app/consultation-templates/[id]/report/page.tsx.
 */
export default async function BjjScreenReportPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await requireSection("assessment_tool");
  const { id } = await params;

  const sql = assessmentToolSql();
  const rows = await sql`select athlete_name, form_data from assessments where id = ${id} and assess_type = 'bjj_injury_screen'`;
  if (rows.length === 0) notFound();

  const formData = rows[0].form_data as BjjScreenFormData;

  return <BjjReportDocument data={mergeBjjScreen(formData)} athleteName={rows[0].athlete_name as string} />;
}
