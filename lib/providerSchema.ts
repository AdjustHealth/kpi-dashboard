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
 * inputs, UCVA/NCVA, DNAs, Cancellations, Not Rebooked). Reschedule Rate is
 * dropped from CLINICIAN_METRIC_FIELDS (director: redundant alongside Not
 * Rebooked/Retention Rate) — still tracked for admin, where it's genuinely
 * useful. Diary Management and Booked Within 7 Days are clinic/admin-level,
 * not per-physio.
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

/**
 * "not_applicable" ("N/A") is for a KPA that genuinely doesn't apply that
 * week (e.g. a task tied to a specialty this person doesn't have) — it's
 * not a performance signal at all, so rollups (lib/performanceReview.ts)
 * treat it like no rating was given, the same as a blank week.
 */
export const KPA_RATINGS = ["not_met", "demonstrated", "above_and_beyond", "not_applicable"] as const;
export type KpaRating = (typeof KPA_RATINGS)[number];

export const KPA_RATING_LABELS: Record<KpaRating, string> = {
  not_met: "Not Met",
  demonstrated: "Demonstrated",
  above_and_beyond: "Above & Beyond",
  not_applicable: "N/A",
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
  // Key stays "ucva" for backward compatibility (targets, quarterly
  // rollups, tier averages, chart history all key off it) but as of Sept
  // 2026 the director replaced the Business Performance Report's UCVA with
  // a true rolling-12-month Patient Visit Average EXCLUDING pre-employment/
  // corporate-screening patients (Services / Unique Patients, from the
  // Providers & Practice Report, minus a Payers-filtered Activity Report's
  // pre-employment-only counts) — see recomputePvaForProvider in
  // lib/nookal/applyReport.ts. Structurally excludes Classes, unlike the
  // old UCVA, which the director wanted specifically.
  { key: "ucva", label: "PVA", type: "decimal", decimals: 1, betterWhen: "higher" },
  { key: "ncva", label: "NCVA", type: "decimal", decimals: 1, betterWhen: "higher" },
  { key: "tpr", label: "TPR (Total Patient Revenue)", type: "currency", betterWhen: "higher" },
  { key: "dnas", label: "Number of DNAs", type: "number", betterWhen: "lower" },
  { key: "cancellations", label: "Number of Cancellations", type: "number", betterWhen: "lower" },
  { key: "not_rebooked", label: "Not Rebooked", type: "number", betterWhen: "lower" },
  { key: "retention_pct", label: "Retention Rate", type: "percent", betterWhen: "higher", sublabel: "% of cancelled clients rebooked" },
];

// Turnover and TPR stay off the standard physio/massage/EP scorecard —
// director's call, since senior physios already track turnover in depth via
// the Bonus Tier Tracker and these two read as noise on the regular
// providers' meeting sheet.
const CLINICIAN_METRIC_FIELDS_EXCLUDED_FOR_STANDARD = new Set(["turnover", "tpr"]);

/** Extra KPI Scorecard fields for senior physios only — not regular physio/massage/EP. */
export const SENIOR_ONLY_METRIC_FIELDS: ProviderField[] = [
  { key: "sm_reel", label: "Social Media Reel Posted", type: "boolean" },
  { key: "blog", label: "Blog Posted", type: "boolean" },
];

/**
 * Admin staff's KPI Scorecard — the per-admin stats that genuinely differ by
 * person. cancellations_handled through avg_days_to_next_booking auto-fill
 * from the Cancellations report grouped by "Modified User" (the admin who
 * actioned it). rx_notes_made_pct is also each admin's own number but lives
 * in ADMIN_COMPLIANCE_FIELDS below instead — grouped with the clinic-wide
 * compliance figures rather than sitting here, per the director. (OBV
 * briefly lived here as a per-admin manual field — that was a mistake; it's
 * clinic-wide like the others, tracked per-client on the New Client
 * Checklist same as Follow Up Calls/Onboarding Video/Online Booking, and
 * lives in ADMIN_COMPLIANCE_FIELDS too.)
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

export interface AdminComplianceField extends ProviderField {
  /** "clinic": shared across every admin, read from clinic-wide weekly_kpis (edited once on Weekly Input). "own": this admin's own individual number, read from their own provider_weekly.metrics (editable directly on their page). */
  source: "clinic" | "own";
  /** Only for source:"clinic" — the lib/schema.ts CLINIC_SCHEMA field id this reads its value from. */
  clinicFieldId?: string;
}

/**
 * Admin "Compliance" — a mix of clinic-wide figures (entered once on Weekly
 * Input's Admin Meeting Prep section, shown identically on every admin's
 * page, read-only here) and each admin's own individual number (editable
 * directly on their own page) — grouped together per the director, since
 * conceptually they're all "compliance" tracking regardless of who enters
 * them. Answered Calls is itself a weekly average of 6 daily entries
 * (Mon-Sat) — see admin_answered_calls_mon..sat.
 */
export const ADMIN_COMPLIANCE_FIELDS: AdminComplianceField[] = [
  { key: "diary_management_pct", label: "Diary Management", type: "percent", betterWhen: "higher", source: "clinic", clinicFieldId: "diary_mgmt_pct" },
  { key: "follow_up_phone_calls_pct", label: "Follow Up Phone Calls", type: "percent", betterWhen: "higher", source: "clinic", clinicFieldId: "admin_followup_calls" },
  { key: "onboarding_video_pct", label: "Onboarding Videos Sent (OBV)", type: "percent", betterWhen: "higher", source: "clinic", clinicFieldId: "admin_onboarding_video_pct" },
  { key: "email_optin_pct", label: "New Clients Subscribed (Email Opt-In)", type: "percent", betterWhen: "higher", source: "clinic", clinicFieldId: "admin_email_optin_pct" },
  { key: "answered_calls_pct", label: "Answered Calls (week avg)", type: "percent", betterWhen: "higher", source: "clinic", clinicFieldId: "admin_answered_calls_pct" },
  { key: "rx_notes_made_pct", label: "Rx Notes Made in Therapist Diary", type: "percent", betterWhen: "higher", source: "own" },
];

export function metricFieldsForRole(role: ProviderRole): ProviderField[] {
  if (role === "admin") return ADMIN_METRIC_FIELDS;
  if (role === "senior_physio") return [...CLINICIAN_METRIC_FIELDS, ...SENIOR_ONLY_METRIC_FIELDS];
  return CLINICIAN_METRIC_FIELDS.filter((f) => !CLINICIAN_METRIC_FIELDS_EXCLUDED_FOR_STANDARD.has(f.key));
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

// Performance Review Goals — every role (including senior physios) — live
// on providers.goals (lib/types.ts's Goal[]): 3 short_term + 3 long_term,
// each with its own text + status. Persistent, not a per-week scorecard
// field (see components/provider/GoalsCard.tsx).

export const ROLE_LABELS: Record<ProviderRole, string> = {
  senior_physio: "Senior Physio",
  physio: "Physio",
  massage: "Massage Therapist",
  ep: "Exercise Physiologist",
  admin: "Admin",
};

/**
 * Hydro / EP+Massage / Remedial Massage / Gym — per the paper's Multi-D Team
 * Utilisation row. Each is the list of client names referred to that
 * discipline this week, not just a count, so the meeting can talk through
 * who they actually are. "physio" is massage therapists only (see
 * multiDiscKeysForRole below) — they refer clients on to a physio, which
 * isn't a meaningful category for a physio's own page.
 */
export interface MultiDiscUtilisation {
  hydro?: string[];
  ep_ms?: string[];
  rmt?: string[];
  gym?: string[];
  physio?: string[];
}

export const MULTI_DISC_LABELS: Record<keyof MultiDiscUtilisation, string> = {
  hydro: "Hydro",
  ep_ms: "EP/MS",
  rmt: "RMT",
  gym: "Gym",
  physio: "Physio",
};

/**
 * Which Multi-Disciplinary Team Utilisation referral categories a role's
 * meeting page shows — the base 4 for everyone, plus "Physio" for massage
 * therapists (confirmed with the director 23/8/26: they refer clients on
 * to a physio and need that tracked the same way as Hydro/EP-MS/RMT/Gym).
 */
export function multiDiscKeysForRole(role: ProviderRole): (keyof MultiDiscUtilisation)[] {
  const base: (keyof MultiDiscUtilisation)[] = ["hydro", "ep_ms", "rmt", "gym"];
  return role === "massage" ? [...base, "physio"] : base;
}

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
  /** Legacy free-text field, no longer written — superseded by the interactive Action Steps checklist below. Kept typed so old weeks' saved data still round-trips harmlessly. */
  review_previous_actions?: string;
  wins?: string[];
  things_to_work_on?: string[];
  /** Admin meetings only — replaces wins/things_to_work_on with a single Proud Of + Grateful For each, one slot for the admin and one for directors. */
  proud_of_self?: string;
  proud_of_director?: string;
  grateful_for_self?: string;
  grateful_for_director?: string;
  multi_disc_utilisation?: MultiDiscUtilisation;
  /** Growing checklist of action steps/agreements — standard/admin providers. See lib/actionItems.ts; older weeks may still hold the legacy string[] shape, normalized at render time. */
  action_steps?: unknown;
  /** Senior physio only: one checklist per ACTION_PLAN_CATEGORIES key, matching the real worksheet's Action Plan tab. Older weeks may hold the legacy Record<string,string> shape. */
  action_plan?: Record<string, unknown>;
  performance_review_goals?: string;
  /** Sam Johnston only (providers.targets.show_programming_prep) — prep notes for his separate Programming Meeting. */
  programming_prep?: string;
}
