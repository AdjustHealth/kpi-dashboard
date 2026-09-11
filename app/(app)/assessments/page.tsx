import Link from "next/link";
import { PageHeader } from "@/components/nav/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { assessmentToolSql } from "@/lib/assessmentTool/db";
import { createClient } from "@/lib/supabase/server";
import { firstNameFromEmail } from "@/lib/userDisplay";
import { DeleteAssessmentButton } from "@/components/assessmentTool/DeleteAssessmentButton";

const TYPE_LABEL: Record<string, string> = {
  performance: "Performance",
  youth: "Youth Performance",
  movestrong: "MoveStrong",
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "performance", label: "Performance" },
  { key: "youth1", label: "Youth 1" },
  { key: "youth2", label: "Youth 2" },
  { key: "movestrong", label: "MoveStrong" },
];

const ASSESSMENT_TYPES = [
  { key: "performance", type: "performance", tier: null as string | null, name: "Performance" },
  { key: "youth1", type: "youth", tier: "y1", name: "Youth 1", sub: "Ages 8–12" },
  { key: "youth2", type: "youth", tier: "y2", name: "Youth 2", sub: "Ages 13–18" },
  { key: "movestrong", type: "movestrong", tier: null as string | null, name: "MoveStrong" },
];

type Row = {
  id: string;
  athlete_name: string;
  assess_type: string;
  youth_tier: string | null;
  clinician: string | null;
  assessment_date: string | null;
  overall_score: number | null;
};

function filterMatches(a: Row, filterKey: string) {
  if (filterKey === "performance") return a.assess_type === "performance";
  if (filterKey === "movestrong") return a.assess_type === "movestrong";
  if (filterKey === "youth1") return a.assess_type === "youth" && a.youth_tier === "y1";
  if (filterKey === "youth2") return a.assess_type === "youth" && a.youth_tier === "y2";
  return true;
}

function scoreTone(score: number | null): "neutral" | "good" | "warning" | "critical" {
  if (score == null) return "neutral";
  if (score >= 7.5) return "good";
  if (score >= 5) return "warning";
  return "critical";
}

/**
 * The Assessment Tool migrated into this app — reads/writes the same live
 * Neon database its standalone site uses (see lib/assessmentTool/db.ts), no
 * data migration. Starting a new assessment or opening a saved one now
 * launches the actual multi-step clinical form (public/tool.html, embedded
 * via AssessmentToolFrame) right here instead of on the standalone site.
 */
export default async function AssessmentsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { filter } = await searchParams;
  const activeFilter = filter || "all";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const clinician = firstNameFromEmail(user?.email);
  const clinicianParam = clinician ? `&clinician=${encodeURIComponent(clinician)}` : "";

  let assessments: Row[] = [];
  let error: string | null = null;
  try {
    const sql = assessmentToolSql();
    assessments = (await sql`
      select id, athlete_name, assess_type, youth_tier, clinician, assessment_date::text as assessment_date, overall_score::float8 as overall_score
      from assessments
      order by created_at desc
    `) as unknown as Row[];
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error";
  }

  const counts = Object.fromEntries(FILTERS.map((f) => [f.key, f.key === "all" ? assessments.length : assessments.filter((a) => filterMatches(a, f.key)).length]));
  const filtered = activeFilter === "all" ? assessments : assessments.filter((a) => filterMatches(a, activeFilter));

  return (
    <>
      <PageHeader title="Assessments" showWeekSelector={false} />
      <div className="flex flex-col gap-6 p-8">
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">Start an Assessment</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {ASSESSMENT_TYPES.map((t) => (
              <Link
                key={t.key}
                href={`/assessments/new?type=${t.type}${t.tier ? `&tier=${t.tier}` : ""}${clinicianParam}`}
                className="flex flex-col gap-1 rounded-xl border border-border bg-surface-raised/60 p-4 transition-colors hover:border-accent/40"
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold text-foreground">{t.name}</span>
                  {t.sub && <span className="text-xs text-muted">{t.sub}</span>}
                </div>
                <span className="text-xs font-semibold text-accent">Start →</span>
              </Link>
            ))}
          </div>
        </div>

        {error ? (
          <p className="text-sm text-danger">Could not load assessments: {error}</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Saved Assessments</p>
              <div className="flex flex-wrap gap-2">
                {FILTERS.map((f) => (
                  <Link
                    key={f.key}
                    href={f.key === "all" ? "/assessments" : `/assessments?filter=${f.key}`}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      activeFilter === f.key ? "border-accent/40 bg-accent/15 text-accent" : "border-border bg-surface-raised/60 text-muted hover:text-foreground"
                    }`}
                  >
                    {f.label} ({counts[f.key]})
                  </Link>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <p className="text-sm text-muted">No assessments of this type yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-raised text-xs uppercase tracking-wide text-muted">
                      <th className="px-4 py-3 font-medium">Athlete</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Clinician</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Overall</th>
                      <th className="px-4 py-3 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((a) => (
                      <tr key={a.id} className="border-b border-border last:border-0 hover:bg-surface-raised/60">
                        <td className="px-4 py-3 font-medium text-foreground">
                          <a href={`/assessments/${a.id}`} className="hover:text-accent">
                            {a.athlete_name}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {TYPE_LABEL[a.assess_type] ?? a.assess_type}
                          {a.youth_tier && <span> · {a.youth_tier === "y1" ? "Youth 1" : "Youth 2"}</span>}
                        </td>
                        <td className="px-4 py-3 text-muted">{a.clinician || "—"}</td>
                        <td className="px-4 py-3 text-muted">{a.assessment_date || "—"}</td>
                        <td className="px-4 py-3">
                          <Badge tone={scoreTone(a.overall_score)}>{a.overall_score != null ? a.overall_score.toFixed(1) : "—"}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <DeleteAssessmentButton id={a.id} athleteName={a.athlete_name} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
