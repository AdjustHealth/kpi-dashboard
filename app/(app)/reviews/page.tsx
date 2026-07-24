import Link from "next/link";
import { PageHeader } from "@/components/nav/PageHeader";
import { Card } from "@/components/ui/Card";
import { PrepReviewButton } from "@/components/reviews/PrepReviewButton";
import { getReviewsOverview } from "@/lib/reviewsData";
import { ROLE_LABELS } from "@/lib/providerSchema";
import { formatWeekLabel } from "@/lib/week";
import { STATUS } from "@/components/charts/palette";

function DueBadge({ overdue, hasDraft }: { overdue: boolean; hasDraft: boolean }) {
  if (hasDraft) {
    return (
      <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ color: STATUS.warning, backgroundColor: "color-mix(in srgb, var(--color-warning) 15%, transparent)" }}>
        In Progress
      </span>
    );
  }
  if (overdue) {
    return (
      <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ color: STATUS.critical, backgroundColor: "color-mix(in srgb, var(--color-danger) 15%, transparent)" }}>
        Due
      </span>
    );
  }
  return (
    <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted">Not due yet</span>
  );
}

export default async function ReviewsPage() {
  const overview = await getReviewsOverview();
  const sorted = [...overview].sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    return (a.nextDue ?? "").localeCompare(b.nextDue ?? "");
  });

  return (
    <>
      <PageHeader title="Performance Reviews" subtitle="Annual for most staff, 6-monthly for new grads." showWeekSelector={false} />
      <div className="flex flex-col gap-6 p-8">
        <Card title="Team">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="py-2 pr-3 font-medium">Name</th>
                  <th className="py-2 px-3 font-medium">Role</th>
                  <th className="py-2 px-3 font-medium">Cadence</th>
                  <th className="py-2 px-3 font-medium">Last Review</th>
                  <th className="py-2 px-3 font-medium">Next Due</th>
                  <th className="py-2 px-3 font-medium">Status</th>
                  <th className="py-2 px-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => (
                  <tr key={row.provider.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 pr-3 font-medium text-foreground whitespace-nowrap">{row.provider.name}</td>
                    <td className="py-2.5 px-3 text-muted whitespace-nowrap">{ROLE_LABELS[row.provider.role]}</td>
                    <td className="py-2.5 px-3 text-muted whitespace-nowrap">{row.cadenceMonths === 6 ? "6-monthly" : "Annual"}</td>
                    <td className="py-2.5 px-3 text-muted whitespace-nowrap">
                      {row.lastReviewDate && row.latestCompletedReviewId ? (
                        <Link href={`/reviews/${row.latestCompletedReviewId}`} className="text-accent hover:underline">
                          {formatWeekLabel(row.lastReviewDate)}
                        </Link>
                      ) : (
                        "Never"
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-muted whitespace-nowrap">{row.nextDue ? formatWeekLabel(row.nextDue) : "Now"}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <DueBadge overdue={row.overdue} hasDraft={Boolean(row.draftReviewId)} />
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      {row.draftReviewId ? (
                        <Link
                          href={`/reviews/${row.draftReviewId}`}
                          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-accent hover:text-accent"
                        >
                          Continue
                        </Link>
                      ) : (
                        <PrepReviewButton providerId={row.provider.id} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
