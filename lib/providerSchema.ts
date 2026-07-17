/**
 * PROVIDER SCHEMA — single source of truth for per-provider weekly fields.
 *
 * Mirrors lib/schema.ts's pattern for the clinic-wide data, but scoped to an
 * individual provider (senior physio, physio, massage, EP, or admin staff).
 * Field values live in `provider_weekly.metrics` (jsonb), keyed by `key`
 * below, so new fields don't require a migration.
 *
 * A senior physio's specialty metrics (e.g. Sam's Memberships/Programming %,
 * Marcio's Headache Init/Sub) are NOT hardcoded here — they're configured
 * per-provider on `providers.specialty_metrics` (see Settings page) and
 * rendered as extra fields alongside this common set.
 */

export type ProviderRole = "senior_physio" | "physio" | "massage" | "ep" | "admin";

export type ProviderFieldType = "currency" | "number" | "decimal" | "percent" | "boolean";

export interface ProviderField {
  key: string;
  label: string;
  type: ProviderFieldType;
  decimals?: number;
}

export interface SpecialtyMetric extends ProviderField {
  /** Provider-defined, stored on providers.specialty_metrics; 'calc' fields (e.g. a total) are computed in providerCalc.ts by key convention `${key}_total`. */
  source?: "manual" | "calc";
}

/** Personal performance KPIs — shown in the Provider/Senior Physio performance table. */
export const CLINICIAN_METRIC_FIELDS: ProviderField[] = [
  { key: "turnover", label: "Turnover", type: "currency" },
  { key: "personal_cva", label: "Personal CVA", type: "decimal", decimals: 2 },
  { key: "forward_booking_avg", label: "Forward Booking Avg", type: "decimal", decimals: 2 },
  { key: "occupancy_pct", label: "Occupancy", type: "percent" },
  { key: "diary_management_pct", label: "Diary Management", type: "percent" },
  { key: "completed_consults", label: "Completed Consults", type: "number" },
  { key: "new_patients", label: "New Patients", type: "number" },
  { key: "new_pt_booking_rate_pct", label: "New Patient Booking Rate", type: "percent" },
  { key: "npbr_np_sessions", label: "NPBR — NP Sessions", type: "number" },
  { key: "npbr_np", label: "NPBR — NP", type: "number" },
  { key: "ucva", label: "UCVA", type: "decimal", decimals: 2 },
  { key: "ncva", label: "NCVA", type: "decimal", decimals: 2 },
  { key: "dnas", label: "Number of DNAs", type: "number" },
  { key: "cancellations", label: "Cancellations", type: "number" },
  { key: "not_rebooked", label: "Not Rebooked", type: "number" },
  { key: "reschedule_rate_pct", label: "Reschedule Rate", type: "percent" },
  { key: "sm_reel", label: "Social Media Reel Posted", type: "boolean" },
  { key: "blog", label: "Blog Posted", type: "boolean" },
];

/** Admin staff use the same page template with this field set instead. */
export const ADMIN_METRIC_FIELDS: ProviderField[] = [
  { key: "diary_management_pct", label: "Clinic Diary Management %", type: "percent" },
  { key: "cancellations_managed", label: "Cancellations Managed", type: "number" },
  { key: "not_rebooked", label: "Patients Not Rebooked", type: "number" },
  { key: "reschedule_rate_pct", label: "Reschedule Rate", type: "percent" },
  { key: "avg_days_to_next_booking", label: "Average Days to Next Booking", type: "decimal", decimals: 1 },
  { key: "followup_calls_completed", label: "Follow-up Calls Completed", type: "number" },
  { key: "onboarding_video_pct", label: "Onboarding Videos Sent %", type: "percent" },
  { key: "email_optin_pct", label: "Email Opt-In %", type: "percent" },
  { key: "phone_calls_answered", label: "Phone Calls Answered", type: "number" },
  { key: "phone_call_answer_rate_pct", label: "Phone Call Answer Rate", type: "percent" },
];

export function metricFieldsForRole(role: ProviderRole): ProviderField[] {
  return role === "admin" ? ADMIN_METRIC_FIELDS : CLINICIAN_METRIC_FIELDS;
}

/** Weekly compliance checklist — same set for every provider role, written from Weekly Input or the provider page. */
export const COMPLIANCE_FIELDS: ProviderField[] = [
  { key: "voxers_completed", label: "Voxers Completed", type: "boolean" },
  { key: "cancellation_management", label: "Cancellation Management", type: "boolean" },
  { key: "clinical_notes_completed", label: "Clinical Notes Completed", type: "boolean" },
  { key: "clinical_correspondence", label: "Clinical Correspondence", type: "boolean" },
  { key: "third_party_approvals", label: "Third Party Approvals", type: "boolean" },
  { key: "pd_fund_utilised", label: "PD Fund Utilised", type: "boolean" },
  { key: "meeting_prep_completed", label: "Meeting Prep Completed", type: "boolean" },
];

/** Weekly systems/KPA review — clinician roles only. */
export const SYSTEMS_KPA_FIELDS: ProviderField[] = [
  { key: "core_values", label: "Core Values", type: "boolean" },
  { key: "speciality_service_growth", label: "Speciality Service Growth", type: "boolean" },
  { key: "lead_junior_staff", label: "Lead Junior Staff", type: "boolean" },
  { key: "clinical_training", label: "Clinical Training", type: "boolean" },
  { key: "marketing_internal", label: "Marketing — Internal", type: "boolean" },
  { key: "marketing_external", label: "Marketing — External", type: "boolean" },
  { key: "cx_report_done", label: "CX Report Done", type: "boolean" },
];

export const ROLE_LABELS: Record<ProviderRole, string> = {
  senior_physio: "Senior Physio",
  physio: "Physio",
  massage: "Massage Therapist",
  ep: "Exercise Physiologist",
  admin: "Admin",
};

export interface MultiDiscUtilisation {
  hydro?: number;
  massage?: number;
  ep?: number;
  gym?: number;
}

export interface ProviderMeetingNotes {
  agenda_items?: string;
  review_previous_actions?: string;
  wins?: string[];
  improvements?: string[];
  multi_disc_utilisation?: MultiDiscUtilisation;
}
