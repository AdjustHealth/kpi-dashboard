/**
 * PROVIDER SCHEMA — single source of truth for per-provider weekly fields.
 *
 * Mirrors lib/schema.ts's pattern for the clinic-wide data, but scoped to an
 * individual provider (senior physio, physio, massage, EP, or admin staff).
 * Field values live in `provider_weekly.metrics` (jsonb), keyed by `key`
 * below, so new fields don't require a migration.
 *
 * Field set and labels are taken directly from the real "Accountability
 * Meeting" template and the director's own paper notes — see KPI Scorecard
 * section (FBA, Occupancy, New Patient Booking Rate + its two calculation
 * inputs, UCVA/NCVA, DNAs, Cancellations, Not Rebooked, Reschedule Rate).
 * Diary Management and Booked Within 7 Days are clinic/admin-level, not
 * per-physio.
 *
 * A senior physio's specialty metrics (e.g. Sam's Memberships/Programming %,
 * Marcio's Headache Init/Sub) are NOT hardcoded here — they're configured
 * per-provider on `providers.specialty_metrics` (see Settings page) and
 * rendered as extra fields alongside this common set.
 */

export type ProviderRole = "senior_physio" | "physio" | "massage" | "ep" | "admin";

/** "rating" is the 3-tier KPA score: above_and_beyond / demonstrated / not_met. */
export type ProviderFieldType = "currency" | "number" | "decimal" | "percent" | "boolean" | "rating";

export interface ProviderField {
  key: string;
  label: string;
  type: ProviderFieldType;
  decimals?: number;
  /** For conditional red/green formatting against a target — omit for fields with no meaningful direction (e.g. raw counts with no target). */
  betterWhen?: "higher" | "lower";
}

export const KPA_RATINGS = ["not_met", "demonstrated", "above_and_beyond"] as const;
export type KpaRating = (typeof KPA_RATINGS)[number];

export const KPA_RATING_LABELS: Record<KpaRating, string> = {
  not_met: "Not Met",
  demonstrated: "Demonstrated",
  above_and_beyond: "Above & Beyond",
};

export interface SpecialtyMetric extends ProviderField {
  /** Provider-defined, stored on providers.specialty_metrics; 'calc' fields (e.g. a total) are computed in providerCalc.ts by key convention `${key}_total`. */
  source?: "manual" | "calc";
}

/**
 * Personal performance KPIs — shown in the Provider/Senior Physio KPI
 * Scorecard. Diary Management and Booked Within 7 Days are clinic-wide/
 * admin-tracked, not per-physio, so they're not here.
 */
export const CLINICIAN_METRIC_FIELDS: ProviderField[] = [
  { key: "turnover", label: "Turnover", type: "currency", betterWhen: "higher" },
  { key: "personal_cva", label: "Personal CVA", type: "decimal", decimals: 2, betterWhen: "higher" },
  { key: "fba", label: "FBA (Forward Booking Average)", type: "decimal", decimals: 2, betterWhen: "higher" },
  { key: "occupancy_pct", label: "Occupancy", type: "percent", betterWhen: "higher" },
  { key: "completed_consults", label: "Completed Consults", type: "number" },
  { key: "new_patients", label: "New Patients (NPBR calc — total new patients)", type: "number" },
  { key: "npbr_recommendations", label: "NPBR calc — total recommendations for new patients", type: "number" },
  { key: "new_pt_booking_rate", label: "New Patient Booking Rate", type: "decimal", decimals: 2, betterWhen: "higher" },
  { key: "ucva", label: "UCVA", type: "decimal", decimals: 2, betterWhen: "higher" },
  { key: "ncva", label: "NCVA", type: "decimal", decimals: 2, betterWhen: "higher" },
  { key: "dnas", label: "Number of DNAs", type: "number", betterWhen: "lower" },
  { key: "cancellations", label: "Number of Cancellations", type: "number", betterWhen: "lower" },
  { key: "not_rebooked", label: "Number Not Rebooked", type: "number", betterWhen: "lower" },
  { key: "reschedule_rate_pct", label: "Reschedule Rate", type: "percent", betterWhen: "higher" },
];

/** Extra KPI Scorecard fields for senior physios only — not regular physio/massage/EP. */
export const SENIOR_ONLY_METRIC_FIELDS: ProviderField[] = [
  { key: "sm_reel", label: "Social Media Reel Posted", type: "boolean" },
  { key: "blog", label: "Blog Posted", type: "boolean" },
];

/**
 * Admin staff use the same page template with this field set instead —
 * taken from the director's actual admin KPI scorecard (Diary Management /
 * Reschedule Rate / Cancellations % of Total Clinic / Cancellations Not
 * Rebooked / Cancellations Booked Within 7 Days / Avg Days to Next Booking /
 * Follow Up Phone Calls / OBV Number Not Sent / Rx Notes Made / Answered
 * Calls), replacing the earlier unconfirmed Communication/Phone placeholders.
 * cancellations_handled, pct_of_total_clinic_cx, not_rebooked,
 * reschedule_rate_pct, cancellations_not_rebooked_pct,
 * booked_within_7_days_pct, and avg_days_to_next_booking auto-fill from the
 * Cancellations report (grouped by "Modified User" — the admin who
 * actioned it). Follow Up Phone Calls, OBV Number Not Sent, Rx Notes Made,
 * and Answered Calls aren't in any Nookal report, so they stay manual.
 */
export const ADMIN_METRIC_FIELDS: ProviderField[] = [
  { key: "diary_management_pct", label: "Diary Management", type: "percent", betterWhen: "higher" },
  { key: "cancellations_handled", label: "Cancellations Handled", type: "number" },
  { key: "pct_of_total_clinic_cx", label: "Cancellations % of Total Clinic", type: "percent" },
  { key: "not_rebooked", label: "Number Not Rebooked", type: "number", betterWhen: "lower" },
  { key: "cancellations_not_rebooked_pct", label: "Cancellations Not Rebooked %", type: "percent", betterWhen: "lower" },
  { key: "reschedule_rate_pct", label: "Reschedule Rate", type: "percent", betterWhen: "higher" },
  { key: "booked_within_7_days_pct", label: "Cancellations Booked Within 7 Days", type: "percent", betterWhen: "higher" },
  { key: "avg_days_to_next_booking", label: "Average Days to Next Booking", type: "decimal", decimals: 1, betterWhen: "lower" },
  { key: "follow_up_phone_calls_pct", label: "Follow Up Phone Calls", type: "percent", betterWhen: "higher" },
  { key: "obv_not_sent", label: "OBV Number Not Sent", type: "number", betterWhen: "lower" },
  { key: "rx_notes_made_pct", label: "Rx Notes Made in Therapist Diary", type: "percent", betterWhen: "higher" },
  { key: "answered_calls_pct", label: "Answered Calls", type: "percent", betterWhen: "higher" },
];

export function metricFieldsForRole(role: ProviderRole): ProviderField[] {
  if (role === "admin") return ADMIN_METRIC_FIELDS;
  if (role === "senior_physio") return [...CLINICIAN_METRIC_FIELDS, ...SENIOR_ONLY_METRIC_FIELDS];
  return CLINICIAN_METRIC_FIELDS;
}

/**
 * Weekly compliance checklist — same set for every provider role, written
 * from Weekly Input or the provider page. Voxers Completed lives here as a
 * percentage (sometimes over 100% on the real sheet), not a Y/N checkbox —
 * ChecklistCard and WeeklyScorecardTable both render fields by their
 * declared `type`, so a percent field works fine alongside the booleans.
 */
export const COMPLIANCE_FIELDS: ProviderField[] = [
  { key: "voxers_completed_pct", label: "Voxers Completed", type: "percent", betterWhen: "higher" },
  { key: "cancellation_management", label: "Cancellation Management", type: "boolean" },
  { key: "clinical_notes_completed", label: "Clinical Notes Completed", type: "boolean" },
  { key: "clinical_correspondence", label: "Clinical Correspondence Completed", type: "boolean" },
  { key: "third_party_approvals", label: "Third Party Approvals Completed", type: "boolean" },
  { key: "pd_fund_utilised", label: "PD Fund Utilised", type: "boolean" },
  { key: "meeting_prep_completed", label: "Meeting Prep Completed", type: "boolean" },
  { key: "cx_report_completed", label: "CX Report Completed", type: "boolean" },
];

/**
 * Weekly KPA (Key Performance Area) scorecard. Scored on a 3-tier rating,
 * not Y/N: Above & Beyond (green) / Demonstrated (yellow) / Not Met (red).
 * Senior physios use this shorter, higher-level set (confirmed from the
 * senior meeting sheet's own "REGULAR SYSTEMS KPA'S" section).
 */
export const SENIOR_KPA_FIELDS: ProviderField[] = [
  { key: "core_values", label: "Core Values", type: "rating" },
  { key: "speciality_service_growth", label: "Speciality Service Growth", type: "rating" },
  { key: "lead_junior_staff", label: "Lead Junior Staff", type: "rating" },
  { key: "clinical_training", label: "Clinical Training", type: "rating" },
  { key: "marketing_internal", label: "Marketing — Internal", type: "rating" },
  { key: "marketing_external", label: "Marketing — External", type: "rating" },
];

/**
 * Regular (non-senior) providers use this longer, more granular KPA set —
 * 7 core values plus 12 specific behavioural standards, taken directly
 * from the real KPA Scorecard screenshot.
 */
export const PROVIDER_KPA_FIELDS: ProviderField[] = [
  { key: "courage", label: "Courage", type: "rating" },
  { key: "teamwork", label: "Teamwork", type: "rating" },
  { key: "accountability", label: "Accountability", type: "rating" },
  { key: "joy", label: "Joy", type: "rating" },
  { key: "compassion", label: "Compassion", type: "rating" },
  { key: "integrity", label: "Integrity", type: "rating" },
  { key: "excellence", label: "Excellence", type: "rating" },
  { key: "greet_walk_client", label: "Greeting and walking client to and from front desk", type: "rating" },
  { key: "adjust_consultation", label: "Utilisation of the Adjust Client-Centered Consultation for all new clients", type: "rating" },
  { key: "treatment_plan", label: "Develop & carry out a detailed treatment plan for all clients", type: "rating" },
  {
    key: "communication_treatment_plan",
    label: "Ensure high quality communication to client & admin around treatment plan, bookings & plan for next session",
    type: "rating",
  },
  {
    key: "voxer_new_clients",
    label: "Send Voxer messages to all new clients within 4-6hrs of initial appointment covering all required points at a high quality",
    type: "rating",
  },
  { key: "follow_up_cancellations_dnas", label: "Following up on all cancellations, DNA's and last attendances weekly", type: "rating" },
  { key: "external_marketing_events", label: "Attend and participate in all external marketing events as requested by management", type: "rating" },
  { key: "staff_meetings_participation", label: "Positive contribution & participation in all staff meetings and in-services", type: "rating" },
  { key: "adjust_procedures_training", label: "Implement training by following all Adjust procedures & protocols", type: "rating" },
  {
    key: "third_party_client_monitoring",
    label: "Monitor all third party clients to ensure that they remain within approved guidelines for both treatment and medical certificates",
    type: "rating",
  },
  { key: "unbooked_time_work", label: "Any un-booked time is to be spent completing work-related activities", type: "rating" },
  {
    key: "meeting_tasks_goals_actions",
    label: "Complete and prepare all meeting tasks, goals and action steps as delegated by your supervisor at a high quality",
    type: "rating",
  },
];

export function kpaFieldsForRole(role: ProviderRole): ProviderField[] {
  return role === "senior_physio" ? SENIOR_KPA_FIELDS : PROVIDER_KPA_FIELDS;
}

/**
 * Performance Review Goals for regular (non-senior) providers — 3 fixed
 * short-term goal slots, scored per week as achieved / not achieved (a
 * goal either was hit or it wasn't — not a 3-tier KPA rating). Senior
 * physios instead get a free-text goals section at the bottom of their
 * page (ActionStepsCard) — different structure, not this.
 */
export const PROVIDER_GOAL_FIELDS: ProviderField[] = [
  { key: "short_term_1", label: "Short Term 1 — Achieved?", type: "boolean" },
  { key: "short_term_2", label: "Short Term 2 — Achieved?", type: "boolean" },
  { key: "short_term_3", label: "Short Term 3 — Achieved?", type: "boolean" },
];

export const ROLE_LABELS: Record<ProviderRole, string> = {
  senior_physio: "Senior Physio",
  physio: "Physio",
  massage: "Massage Therapist",
  ep: "Exercise Physiologist",
  admin: "Admin",
};

/** Hydro / EP+Massage / Remedial Massage / Gym — per the paper's Multi-D Team Utilisation row. */
export interface MultiDiscUtilisation {
  hydro?: number;
  ep_ms?: number;
  rmt?: number;
  gym?: number;
}

export const MULTI_DISC_LABELS: Record<keyof MultiDiscUtilisation, string> = {
  hydro: "Hydro",
  ep_ms: "EP/MS",
  rmt: "RMT",
  gym: "Gym",
};

/** Senior physio "Action Plan" categories — from the real Senior Physio Worksheet's Action Plan tab. */
export const ACTION_PLAN_CATEGORIES: { key: string; label: string }[] = [
  { key: "turnover", label: "Turnover" },
  { key: "gym_memberships", label: "Gym / Memberships" },
  { key: "junior_team_performance", label: "Junior Team Performance" },
  { key: "marketing", label: "Marketing" },
  { key: "culture", label: "Culture" },
];

export interface ProviderMeetingNotes {
  agenda_items?: string;
  review_previous_actions?: string;
  wins?: string[];
  things_to_work_on?: string[];
  multi_disc_utilisation?: MultiDiscUtilisation;
  /** Up to 4 numbered action steps/agreements for this week — standard/admin providers. */
  action_steps?: string[];
  /** Senior physio only: one note per ACTION_PLAN_CATEGORIES key, matching the real worksheet's Action Plan tab. */
  action_plan?: Record<string, string>;
  performance_review_goals?: string;
}
