export const PROGRAM_TRACKER_COACHES = ["Dean", "Sam", "Wilson", "Michael", "Lachlan"] as const;
export const PROGRAM_TRACKER_TYPES = ["Rehab", "Performance", "Online", "Third Party", "Sponsored", "Youth", "Move Strong"] as const;
export const PROGRAM_TRACKER_STATUSES = ["Active", "Hold"] as const;

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
