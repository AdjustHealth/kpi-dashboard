import Link from "next/link";
import { Card } from "@/components/ui/Card";

/**
 * Compact "how am I tracking" summary for My Dashboard — same progress ring
 * as the top of /training/me, just without the full topic-by-topic list
 * underneath (that stays on its own page, linked below). No section gate:
 * this is each practitioner's own progress, same self-service reasoning as
 * /training/me itself (see lib/trainingGroup.ts's isExcludedFromTraining —
 * the only reason this card wouldn't show is the caller passing no group,
 * e.g. for Michael or an admin).
 */
export function MyClinicalTrainingCard({
  groupLabel,
  complete,
  total,
}: {
  groupLabel: string;
  complete: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((complete / total) * 100) : null;

  return (
    <Card title="Clinical Training">
      <div className="flex flex-wrap items-center gap-5">
        <div
          className="relative h-16 w-16 flex-none rounded-full"
          style={{
            background: `conic-gradient(var(--color-accent) 0deg ${(pct ?? 0) * 3.6}deg, var(--color-surface-raised) ${(pct ?? 0) * 3.6}deg 360deg)`,
          }}
        >
          <div className="absolute inset-1.5 flex flex-col items-center justify-center rounded-full bg-surface">
            <div className="text-sm font-bold text-foreground">{pct === null ? "—" : `${pct}%`}</div>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-foreground">
            {complete} of {total} {groupLabel} topics complete
          </div>
          <Link href="/training/me" className="mt-1 inline-block text-xs font-medium text-accent hover:underline">
            View full progress →
          </Link>
        </div>
      </div>
    </Card>
  );
}
