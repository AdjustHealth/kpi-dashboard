import Link from "next/link";
import { PageHeader } from "@/components/nav/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { assessmentToolSql } from "@/lib/assessmentTool/db";

const ASSESSMENT_TOOL_URL = "https://adjust-health-performance-report.vercel.app";

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
 * Read-only first slice of the Assessment Tool inside the hub — mirrors its
 * own home page list. Each athlete name still links out to the standalone
 * site to view or edit the full multi-step assessment (that form itself
 * isn't ported here yet); this just means you don't have to log into a
 * second app to see what's been done.
 */
export default async function AssessmentsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { filter } = await searchParams;
  const activeFilter = filter || "all";

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
      <div className="flex flex-col gap-4 p-8">
        {error ? (
          <p className="text-sm text-danger">Could not load assessments: {error}</p>
        ) : (
          <>
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
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((a) => (
                      <tr key={a.id} className="border-b border-border last:border-0 hover:bg-surface-raised/60">
                        <td className="px-4 py-3 font-medium text-foreground">
                          <a href={`${ASSESSMENT_TOOL_URL}/assessment/${a.id}`} target="_blank" rel="noopener noreferrer" className="hover:text-accent">
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
