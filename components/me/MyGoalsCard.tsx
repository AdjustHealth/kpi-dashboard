import { Card } from "@/components/ui/Card";
import { STATUS } from "@/components/charts/palette";
import { Goal, GoalStatus } from "@/lib/types";

const STATUS_LABEL: Record<GoalStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  complete: "Complete",
};

const STATUS_COLOR: Record<GoalStatus, string> = {
  not_started: "#8b93a5",
  in_progress: STATUS.warning,
  complete: STATUS.good,
};

/** Reads a goal written before the 3-state status existed — same defensive fallback as components/provider/GoalsCard.tsx. */
function resolvedStatus(g: Goal): GoalStatus {
  return g.status ?? (g.achieved ? "complete" : "not_started");
}

function GoalRow({ goal }: { goal: Goal }) {
  const status = resolvedStatus(goal);
  return (
    <div className="flex items-center gap-3">
      <span
        className="flex-none rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide"
        style={{ color: STATUS_COLOR[status], borderColor: `${STATUS_COLOR[status]}80`, backgroundColor: `${STATUS_COLOR[status]}26` }}
      >
        {STATUS_LABEL[status]}
      </span>
      <span className={`text-sm ${status === "complete" ? "text-muted line-through" : "text-foreground"}`}>{goal.text}</span>
    </div>
  );
}

/** Read-only — goals are set by a director at Performance Review time (see
 * components/provider/GoalsCard.tsx, the editable version); this just shows
 * a practitioner their own current goals and status. */
export function MyGoalsCard({ goals }: { goals: Goal[] }) {
  const shortTerm = goals.filter((g) => g.kind !== "long_term" && g.text.trim());
  const longTerm = goals.filter((g) => g.kind === "long_term" && g.text.trim());

  if (shortTerm.length === 0 && longTerm.length === 0) {
    return (
      <Card title="Your Goals">
        <p className="text-sm text-muted">No goals set yet — these get added at your next performance review.</p>
      </Card>
    );
  }

  return (
    <Card title="Your Goals">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">Short Term</h4>
          {shortTerm.length === 0 ? <p className="text-sm text-muted">None set.</p> : shortTerm.map((g, i) => <GoalRow key={i} goal={g} />)}
        </div>
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">Long Term</h4>
          {longTerm.length === 0 ? <p className="text-sm text-muted">None set.</p> : longTerm.map((g, i) => <GoalRow key={i} goal={g} />)}
        </div>
      </div>
    </Card>
  );
}
