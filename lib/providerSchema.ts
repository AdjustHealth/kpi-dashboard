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
  /** Small supporting text shown under `label` (e.g. a KPA's full behavioural description) — label stays the bold, obvious heading. */
  sublabel?: string;
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
  { key: "fba", label: "FBA (Forward Booking Average)", type: "decimal", decimals: 1, betterWhen: "higher" },
  { key: "occupancy_pct", label: "Occupancy", type: "percent", betterWhen: "higher" },
  { key: "completed_consults", label: "Completed Consults", type: "number", betterWhen: "higher" },
  { key: "new_patients", label: "New Patients (NPBR calc — total new patients)", type: "number" },
  { key: "npbr_recommendations", label: "NPBR calc — total recommendations for new patients", type: "number" },
  { key: "new_pt_booking_rate", label: "New Patient Booking Rate", type: "decimal", decimals: 1, betterWhen: "higher" },
  // Labelled "CVA" (not "UCVA") per the director — this Business Performance
  // Report figure IS the client-visit-average metric she tracks; there's no
  // separate lower-value "weekly ratio" CVA in her real methodology, and
  // showing one (as this app briefly did, sourced from the Providers &
  // Practice Report's very different "Client Visit Average" column) read as
  // a second, much-lower, wrong number next to this one.
  { key: "ucva", label: "CVA", type: "decimal", decimals: 1, betterWhen: "higher" },
  { key: "ncva", label: "NCVA", type: "decimal", decimals: 1, betterWhen: "higher" },
  { key: "tpr", label: "TPR (Total Patient Revenue)", type: "currency", betterWhen: "higher" },
  { key: "dnas", label: "Number of DNAs", type: "number", betterWhen: "lower" },
  { key: "cancellations", label: "Number of Cancellations", type: "number", betterWhen: "lower" },
  { key: "not_rebooked_pct", label: "Not Rebooked %", type: "percent", betterWhen: "lower" },
  { key: "retention_pct", label: "Retention Rate", type: "percent", betterWhen: "higher", sublabel: "% of cancelled clients rebooked (100% − Not Rebooked %)" },
  { key: "reschedule_rate_pct", label: "Reschedule Rate", type: "percent", betterWhen: "higher" },
];

/** Extra KPI Scorecard fields for senior physios only — not regular physio/massage/EP. */
export const SENIOR_ONLY_METRIC_FIELDS: ProviderField[] = [
  { key: "sm_reel", label: "Social Media Reel Posted", type: "boolean" },
  { key: "blog", label: "Blog Posted", type: "boolean" },
];

/**
 * Admin staff's KPI Scorecard — just the per-admin cancellation-handling
 * stats that genuinely differ by person, auto-filled from the Cancellations
 * report grouped by "Modified User" (the admin who actioned it). The
 * clinic-wide admin fields every admin shares identically (Diary
 * Management, Follow Up Phone Calls, OBV Number Not Sent, Rx Notes Made,
 * Answered Calls) live in ADMIN_SHARED_COMPLIANCE_FIELDS instead — typed
 * once on Weekly Input, not tracked per-person.
 */
export const ADMIN_METRIC_FIELDS: ProviderField[] = [
  { key: "cancellations_handled", label: "Cancellations Handled", type: "number" },
  { key: "pct_of_total_clinic_cx", label: "Cancellations % of Total Clinic", type: "percent" },
  { key: "not_rebooked", label: "Number Not Rebooked", type: "number", betterWhen: "lower" },
  { key: "cancellations_not_rebooked_pct", label: "Cancellations Not Rebooked %", type: "percent", betterWhen: "lower" },
  { key: "retention_pct", label: "Retention Rate", type: "percent", betterWhen: "higher", sublabel: "% of cancelled clients rebooked (100% − Cancellations Not Rebooked %)" },
  { key: "reschedule_rate_pct", label: "Reschedule Rate", type: "percent", betterWhen: "higher" },
  { key: "booked_within_7_days_pct", label: "Cancellations Booked Within 7 Days", type: "percent", betterWhen: "higher" },
  { key: "avg_days_to_next_booking", label: "Average Days to Next Booking", type: "decimal", decimals: 1, betterWhen: "lower" },
];

export interface AdminSharedField extends ProviderField {
  /** The lib/schema.ts CLINIC_SCHEMA field id this reads its (shared, clinic-wide) value from. */
  clinicFieldId: string;
}

/**
 * Admin "Compliance" — entered once on Weekly Input's Admin Meeting Prep
 * section and shown identically on every admin staff member's page (they're
 * clinic/admin-team-level numbers, not each person's own individual figure).
 * Read-only here; edit on Weekly Input.
 */
export const ADMIN_SHARED_COMPLIANCE_FIELDS: AdminSharedField[] = [
  { key: "diary_management_pct", label: "Diary Management", type: "percent", betterWhen: "higher", clinicFieldId: "diary_mgmt_pct" },
  { key: "follow_up_phone_calls_pct", label: "Follow Up Phone Calls", type: "percent", betterWhen: "higher", clinicFieldId: "admin_followup_calls" },
  { key: "obv_not_sent", label: "OBV Number Not Sent", type: "number", betterWhen: "lower", clinicFieldId: "admin_obv_not_sent" },
  { key: "rx_notes_made_pct", label: "Rx Notes Made in Therapist Diary", type: "percent", betterWhen: "higher", clinicFieldId: "admin_rx_notes_pct" },
  { key: "answered_calls_pct", label: "Answered Calls", type: "percent", betterWhen: "higher", clinicFieldId: "admin_answered_calls_pct" },
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
 * The 7 Adjust core values — kept as their own group, visually separate
 * from task-style KPAs (per the director), and shared by both regular
 * providers and admin staff.
 */
export const CORE_VALUES_KPA_FIELDS: ProviderField[] = [
  { key: "courage", label: "Courage", type: "rating" },
  { key: "teamwork", label: "Teamwork", type: "rating" },
  { key: "accountability", label: "Accountability", type: "rating" },
  { key: "joy", label: "Joy", type: "rating" },
  { key: "compassion", label: "Compassion", type: "rating" },
  { key: "integrity", label: "Integrity", type: "rating" },
  { key: "excellence", label: "Excellence", type: "rating" },
];

/**
 * Regular (non-senior, non-admin) providers' 12 specific behavioural
 * standards, taken directly from the real KPA Scorecard screenshot — shown
 * as its own group, separate from Core Values.
 */
export const PROVIDER_TASK_KPA_FIELDS: ProviderField[] = [
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

/**
 * Admin staff's Customer Service KPA group, from the director's own
 * Customer Service KPA sheet — 3 categories, each covering several
 * behaviours scored together as one rating.
 */
export const CUSTOMER_SERVICE_KPA_FIELDS: ProviderField[] = [
  {
    key: "set_the_stage",
    label: "Set the Stage",
    sublabel:
      "7 seconds to make a first impression / acknowledge and greet client when they enter / introduce yourself to new clients / no bitching, moaning or negative personal talk on the front desk / positive body language, posture & tone / be mindful of how the waiting room looks",
    type: "rating",
  },
  {
    key: "interaction_connection",
    label: "Interaction & Connection",
    sublabel:
      "Power of familiarity: introduce, use client names where possible, say \"thank you\" / Embracing Vulnerability: being who you are, giving yourself permission to be you / creating a safe space for others to be who they are, letting your wall or guard down",
    type: "rating",
  },
  {
    key: "solutions_focused",
    label: "Solutions Focused",
    sublabel:
      "Being solutions focused / using your initiative / understanding what people are going through / following things right through to the end",
    type: "rating",
  },
];

export interface KpaGroup {
  title: string;
  fields: ProviderField[];
}

/**
 * KPA sections for a role, in display order — always split Core Values out
 * as its own titled group rather than one long merged list.
 */
export function kpaGroupsForRole(role: ProviderRole): KpaGroup[] {
  if (role === "senior_physio") return [{ title: "KPA Scorecard", fields: SENIOR_KPA_FIELDS }];
  if (role === "admin") {
    return [
      { title: "Customer Service", fields: CUSTOMER_SERVICE_KPA_FIELDS },
      { title: "Culture / Core Values", fields: CORE_VALUES_KPA_FIELDS },
    ];
  }
  return [
    { title: "Core Values", fields: CORE_VALUES_KPA_FIELDS },
    { title: "KPA Scorecard", fields: PROVIDER_TASK_KPA_FIELDS },
  ];
}

// Performance Review Goals for regular (non-senior) providers now live on
// providers.goals (lib/types.ts's Goal[]) — persistent text + achieved flag,
// not a per-week scorecard field (see components/provider/GoalsCard.tsx).
// Senior physios still get a free-text goals section at the bottom of their
// page (ActionStepsCard) — different structure, unrelated to this.

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
