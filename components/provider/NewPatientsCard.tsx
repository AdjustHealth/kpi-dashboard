import { Card } from "@/components/ui/Card";
import { formatWeekLabel } from "@/lib/week";

function NameList({ names }: { names: string[] }) {
  return (
    <ul className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm text-foreground sm:grid-cols-2 lg:grid-cols-3">
      {names.map((name, i) => (
        <li key={`${name}-${i}`}>{name}</li>
      ))}
    </ul>
  );
}

/**
 * This clinician's own new patients, by name — sourced from the Clients &
 * Cases upload (provider_weekly.metrics.new_patient_names). Also surfaces
 * whoever became a new patient exactly 6 weeks ago as a "6 Week Review Due"
 * list — the director's clinical check-in cadence for tracking how a new
 * client has progressed since starting treatment.
 */
export function NewPatientsCard({
  names,
  sixWeekReviewNames = [],
  sixWeekReviewWeek,
}: {
  names: string[];
  sixWeekReviewNames?: string[];
  sixWeekReviewWeek?: string;
}) {
  const hasSixWeekReview = sixWeekReviewNames.length > 0;
  if (names.length === 0 && !hasSixWeekReview) return null;

  return (
    <Card title="New Patients">
      {names.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            New This Week ({names.length})
          </h4>
          <NameList names={names} />
        </div>
      )}
      {hasSixWeekReview && (
        <div className={names.length > 0 ? "mt-5 border-t border-border pt-4" : undefined}>
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-accent">
            6 Week Review Due ({sixWeekReviewNames.length})
          </h4>
          <p className="mb-2 text-xs text-muted">
            New patient{sixWeekReviewNames.length > 1 ? "s" : ""} from{" "}
            {sixWeekReviewWeek ? formatWeekLabel(sixWeekReviewWeek) : "6 weeks ago"} — check in on how they&apos;ve
            progressed.
          </p>
          <NameList names={sixWeekReviewNames} />
        </div>
      )}
    </Card>
  );
}
