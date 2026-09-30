import Link from "next/link";
import { PageHeader } from "@/components/nav/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { assessmentToolSql } from "@/lib/assessmentTool/db";
import { DeleteBjjScreenButton } from "@/components/bjjInjuryScreen/DeleteBjjScreenButton";
import { requireSection } from "@/lib/auth/access";

type Row = {
  id: string;
  athlete_name: string;
  clinician: string | null;
  assessment_date: string | null;
};

/**
 * BJJ Injury Screen — its own area from Assessment Tool, sharing the
 * assessment_tool section grant and the same underlying `assessments` table
 * (assess_type = 'bjj_injury_screen'), same pattern as Consultation
 * Templates — never shown in the scored-assessments list (see
 * app/(app)/assessments/page.tsx's exclusion).
 */
export default async function BjjInjuryScreenPage() {
  await requireSection("assessment_tool");

  let rows: Row[] = [];
  let error: string | null = null;
  try {
    const sql = assessmentToolSql();
    rows = (await sql`
      select id, athlete_name, clinician, assessment_date::text as assessment_date
      from assessments
      where assess_type = 'bjj_injury_screen'
      order by created_at desc
    `) as unknown as Row[];
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error";
  }

  return (
    <>
      <PageHeader title="BJJ Injury Screen" showWeekSelector={false} />
      <div className="flex flex-col gap-6 p-8">
        <Link
          href="/bjj-injury-screen/new"
          className="group flex flex-col gap-3 rounded-xl border border-border bg-surface-raised/60 p-4 transition-colors hover:border-accent/40 sm:max-w-xs"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M12 5v14m-7-7h14" />
            </svg>
          </div>
          <div>
            <div className="font-display text-lg font-bold uppercase tracking-wide text-foreground">Injury Screen</div>
            <span className="text-xs text-muted">Mobility, Strength &amp; Power — 5 minutes</span>
            <div className="mt-1 text-xs font-semibold text-accent">Start →</div>
          </div>
        </Link>

        {error ? (
          <p className="text-sm text-danger">Could not load screens: {error}</p>
        ) : rows.length === 0 ? (
          <EmptyState message="No injury screens saved yet." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-raised text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-medium">Athlete</th>
                  <th className="px-4 py-3 font-medium">Clinician</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-raised/60">
                    <td className="px-4 py-3 font-medium text-foreground">
                      <a href={`/bjj-injury-screen/${r.id}`} className="hover:text-accent">
                        {r.athlete_name || "(unnamed)"}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-muted">{r.clinician || "—"}</td>
                    <td className="px-4 py-3 text-muted">{r.assessment_date || "—"}</td>
                    <td className="px-4 py-3">
                      <DeleteBjjScreenButton id={r.id} athleteName={r.athlete_name || "this athlete"} />
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
