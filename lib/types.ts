import { ProviderRole } from "@/lib/providerSchema";

export interface SpecialtyMetricDef {
  key: string;
  label: string;
  type: "currency" | "number" | "decimal" | "percent" | "boolean";
  source?: "manual" | "calc";
}

export type GoalStatus = "not_started" | "in_progress" | "complete";
export type GoalKind = "short_term" | "long_term";

export interface Goal {
  text: string;
  status: GoalStatus;
  kind: GoalKind;
  /** Legacy field from before the 3-state status existed — read defensively (true meant "complete") when hydrating old data, never written going forward. */
  achieved?: boolean;
}

export interface Provider {
  id: string;
  name: string;
  role: ProviderRole;
  active: boolean;
  sort_order: number;
  specialty_metrics: SpecialtyMetricDef[];
  targets: Record<string, unknown>;
  /** Persistent — stays exactly as-is week to week until edited; not scoped to a week. 3 short_term + 3 long_term goals. */
  goals: Goal[];
  created_at: string;
  updated_at: string;
}

export interface ProviderWeekly {
  provider_id: string;
  week_ending: string;
  metrics: Record<string, unknown>;
  kpas: Record<string, unknown>;
  meeting_notes: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface WeeklyKpis {
  week_ending: string;
  [key: string]: unknown;
}
