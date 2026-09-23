import Link from "next/link";
import { PageHeader } from "@/components/nav/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { assessmentToolSql } from "@/lib/assessmentTool/db";
import { DeleteConsultButton } from "@/components/consultationTemplates/DeleteConsultButton";
import { requireSection } from "@/lib/auth/access";

type Row = {
  id: string;
  athlete_name: string;
  clinician: string | null;
  assessment_date: string | null;
  form_data: { report?: { generatedAt?: string } | null };
};

/**
 * Consultation Templates — its own area from Assessment Tool, sharing the
 * assessment_tool section grant and the same underlying `assessments` table
 * (assess_type = 'initial_consult'), but never shown in the scored-
 * assessments list (see app/(app)/assessments/page.tsx's exclusion).
 */
export default async function ConsultationTemplatesPage() {
  await requireSection("assessment_tool");

  let rows: Row[] = [];
  let error: string | null = null;
  try {
    const sql = assessmentToolSql();
    rows = (await sql`
      select id, athlete_name, clinician, assessment_date::text as assessment_date, form_data
      from assessments
      where assess_type = 'initial_consult'
      order by created_at desc
    `) as unknown as Row[];
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error";
  }

  return (
    <>
      <PageHeader title="Consultation Templates" showWeekSelector={false} />
      <div className="flex flex-col gap-6 p-8">
        <Link
          href="/consultation-templates/new"
          className="group flex flex-col gap-3 rounded-xl border border-border bg-surface-raised/60 p-4 transition-colors hover:border-accent/40 sm:max-w-xs"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M12 5v14m-7-7h14" />
            </svg>
          </div>
          <div>
            <div className="font-display text-lg font-bold uppercase tracking-wide text-foreground">Initial Consultation</div>
            <span className="text-xs text-muted">Client-Centred Consult</span>
            <div className="mt-1 text-xs font-semibold text-accent">Start →</div>
          </div>
        </Link>

        {error ? (
          <p className="text-sm text-danger">Could not load consultations: {error}</p>
        ) : rows.length === 0 ? (
          <EmptyState message="No consultations saved yet." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-raised text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Clinician</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Report</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-raised/60">
                    <td className="px-4 py-3 font-medium text-foreground">
                      <a href={`/consultation-templates/${r.id}`} className="hover:text-accent">
                        {r.athlete_name || "(unnamed)"}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-muted">{r.clinician || "—"}</td>
                    <td className="px-4 py-3 text-muted">{r.assessment_date || "—"}</td>
                    <td className="px-4 py-3 text-muted">{r.form_data?.report ? "Generated" : "Not yet generated"}</td>
                    <td className="px-4 py-3">
                      <DeleteConsultButton id={r.id} patientName={r.athlete_name || "this client"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
