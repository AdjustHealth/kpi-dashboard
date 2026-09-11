export const PROGRAM_TRACKER_COACHES = ["Dean", "Sam", "Wilson", "Michael", "Lachlan"] as const;
export const PROGRAM_TRACKER_TYPES = ["Rehab", "Performance", "Online", "Third Party", "Sponsored", "Youth", "Move Strong"] as const;
export const PROGRAM_TRACKER_STATUSES = ["Active", "Hold"] as const;

/** Membership types that count toward "Total paid" on the dashboard — matches the standalone site's own paidTypes list (normalised: lowercase, spaces/hyphens stripped). */
export const PROGRAM_TRACKER_PAID_TYPES = ["rehab", "performance", "thirdparty", "movestrong", "youth"];

/** Same normalisation as the standalone site's norm() — "Move Strong" -> "movestrong" — for comparing a stored type against PROGRAM_TRACKER_PAID_TYPES or another type name. */
export function normType(t: string | null | undefined): string {
  return (t ?? "").toLowerCase().replace(/[\s-]/g, "");
}

export interface Member {
  id: string;
  name: string;
  coach: string | null;
  type: string | null;
  status: string | null;
  block_start: string | null;
  block_weeks: number | null;
  next_due: string | null;
  due_status: string | null;
  notes: string | null;
  hold_start: string | null;
  hold_weeks: number | null;
  created_at: string;
  updated_at: string;
}

export type MemberInput = {
  name: string;
  coach: string | null;
  type: string | null;
  status: string;
  block_start: string | null;
  block_weeks: number;
  hold_start: string | null;
  hold_weeks: number | null;
  notes: string | null;
};
