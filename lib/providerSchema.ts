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
 * section (FBA, Occupancy, Diary Management, New Patient Booking Rate +
 * its two calculation inputs, UCVA/NCVA, DNAs, Cancellations, Not
 * Rebooked, Reschedule Rate, Booked Within 7 Days).
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

/** Personal performance KPIs — shown in the Provider/Senior Physio KPI Scorecard. */
export const CLINICIAN_METRIC_FIELDS: ProviderField[] = [
  { key: "turnover", label: "Turnover", type: "currency" },
  { key: "personal_cva", label: "Personal CVA", type: "decimal", decimals: 2 },
  { key: "fba", label: "FBA (Forward Booking Average)", type: "decimal", decimals: 2 },
  { key: "occupancy_pct", label: "Occupancy", type: "percent" },
  { key: "diary_management_pct", label: "Diary Management", type: "percent" },
  { key: "completed_consults", label: "Completed Consults", type: "number" },
  { key: "new_patients", label: "New Patients (NPBR calc — total new patients)", type: "number" },
  { key: "npbr_recommendations", label: "NPBR calc — total recommendations for new patients", type: "number" },
  { key: "new_pt_booking_rate", label: "New Patient Booking Rate", type: "decimal", decimals: 2 },
  { key: "voxers_completed_pct", label: "Voxers Completed", type: "percent" },
  { key: "ucva", label: "UCVA", type: "decimal", decimals: 2 },
  { key: "ncva", label: "NCVA", type: "decimal", decimals: 2 },
  { key: "dnas", label: "Number of DNAs", type: "number" },
  { key: "cancellations", label: "Number of Cancellations", type: "number" },
  { key: "not_rebooked", label: "Number Not Rebooked", type: "number" },
  { key: "reschedule_rate_pct", label: "Reschedule Rate", type: "percent" },
  { key: "booked_within_7_days_pct", label: "Booked Within 7 Days", type: "percent" },
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
  { key: "diary_management_pct", label: "Diary Management", type: "percent" },
  { key: "cancellations_handled", label: "Cancellations Handled", type: "number" },
  { key: "pct_of_total_clinic_cx", label: "Cancellations % of Total Clinic", type: "percent" },
  { key: "not_rebooked", label: "Number Not Rebooked", type: "number" },
  { key: "cancellations_not_rebooked_pct", label: "Cancellations Not Rebooked %", type: "percent" },
  { key: "reschedule_rate_pct", label: "Reschedule Rate", type: "percent" },
  { key: "booked_within_7_days_pct", label: "Cancellations Booked Within 7 Days", type: "percent" },
  { key: "avg_days_to_next_booking", label: "Average Days to Next Booking", type: "decimal", decimals: 1 },
  { key: "follow_up_phone_calls_pct", label: "Follow Up Phone Calls", type: "percent" },
  { key: "obv_not_sent", label: "OBV Number Not Sent", type: "number" },
  { key: "rx_notes_made_pct", label: "Rx Notes Made in Therapist Diary", type: "percent" },
  { key: "answered_calls_pct", label: "Answered Calls", type: "percent" },
];

export function metricFieldsForRole(role: ProviderRole): ProviderField[] {
  return role === "admin" ? ADMIN_METRIC_FIELDS : CLINICIAN_METRIC_FIELDS;
}

/**
 * Weekly compliance checklist — same set for every provider role, written
 * from Weekly Input or the provider page. Voxers Completed is NOT here —
 * despite the name it's tracked as a completion percentage on the sheet
 * (sometimes over 100%), not a Y/N checkbox, so it lives in
 * CLINICIAN_METRIC_FIELDS as voxers_completed_pct instead.
 */
export const COMPLIANCE_FIELDS: ProviderField[] = [
  { key: "cancellation_management", label: "Cancellation Management", type: "boolean" },
  { key: "clinical_notes_completed", label: "Clinical Notes Completed", type: "boolean" },
  { key: "clinical_correspondence", label: "Clinical Correspondence Completed", type: "boolean" },
  { key: "third_party_approvals", label: "Third Party Approvals Completed", type: "boolean" },
  { key: "pd_fund_utilised", label: "PD Fund Utilised", type: "boolean" },
  { key: "meeting_prep_completed", label: "Meeting Prep Completed", type: "boolean" },
  { key: "cx_report_completed", label: "CX Report Completed", type: "boolean" },
];

/** Weekly KPA (Key Performance Area) scorecard — clinician roles only. */
export const SYSTEMS_KPA_FIELDS: ProviderField[] = [
  { key: "core_values", label: "Core Values", type: "boolean" },
  { key: "speciality_service_growth", label: "Speciality Service Growth", type: "boolean" },
  { key: "lead_junior_staff", label: "Lead Junior Staff", type: "boolean" },
  { key: "clinical_training", label: "Clinical Training", type: "boolean" },
  { key: "marketing_internal", label: "Marketing — Internal", type: "boolean" },
  { key: "marketing_external", label: "Marketing — External", type: "boolean" },
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

export interface ProviderMeetingNotes {
  agenda_items?: string;
  review_previous_actions?: string;
  wins?: string[];
  things_to_work_on?: string[];
  multi_disc_utilisation?: MultiDiscUtilisation;
  /** Up to 4 numbered action steps/agreements for this week. */
  action_steps?: string[];
  performance_review_goals?: string;
}
