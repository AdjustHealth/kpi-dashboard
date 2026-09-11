import { normType } from "@/lib/programTracker/types";

export const PROGRAM_TRACKER_COACH_COLORS: Record<string, string> = {
  Dean: "#9c27b0",
  Sam: "#d9690a",
  Wilson: "#00897b",
  Michael: "#1565c0",
  Lachlan: "#558b2f",
};

export function dueStatusTone(status: string | null): "neutral" | "good" | "warning" | "critical" {
  if (status === "OVERDUE" || status === "Hold overdue") return "critical";
  if (status === "Due this week" || status === "Hold ending soon") return "warning";
  if (status === "Upcoming") return "good";
  return "neutral";
}

export function CoachBadge({ coach }: { coach: string | null }) {
  if (!coach) return <span className="text-xs text-muted">—</span>;
  const color = PROGRAM_TRACKER_COACH_COLORS[coach];
  return (
    <span className="rounded-full border px-2 py-0.5 text-[11px] font-medium" style={{ color, borderColor: `${color}55`, backgroundColor: `${color}1a` }}>
      {coach}
    </span>
  );
}

/** Youth and Move Strong get the same glow treatment as the standalone site — everything else is plain text. */
export function TypeBadge({ type }: { type: string | null }) {
  const n = normType(type);
  if (n === "youth")
    return (
      <span className="rounded-full border px-2 py-0.5 text-[11px] font-semibold" style={{ color: "#a6e22e", borderColor: "#a6e22e88", backgroundColor: "#a6e22e26", boxShadow: "0 0 8px #a6e22e40" }}>
        Youth
      </span>
    );
  if (n === "movestrong")
    return (
      <span className="rounded-full border px-2 py-0.5 text-[11px] font-semibold" style={{ color: "#34d399", borderColor: "#34d39988", backgroundColor: "#34d39926", boxShadow: "0 0 8px #34d39940" }}>
        Move Strong
      </span>
    );
  return <span className="text-xs text-muted">{type || "—"}</span>;
}
