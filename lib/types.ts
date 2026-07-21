import { ProviderRole } from "@/lib/providerSchema";

export interface SpecialtyMetricDef {
  key: string;
  label: string;
  type: "currency" | "number" | "decimal" | "percent" | "boolean";
  source?: "manual" | "calc";
}

export interface Goal {
  text: string;
  achieved: boolean;
}

export interface Provider {
  id: string;
  name: string;
  role: ProviderRole;
  active: boolean;
  sort_order: number;
  specialty_metrics: SpecialtyMetricDef[];
  targets: Record<string, unknown>;
  /** Persistent — stays exactly as-is week to week until edited, or "achieved" is cleared at the next performance review. Not scoped to a week. */
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
