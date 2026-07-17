/**
 * CLINIC SCHEMA — single source of truth for weekly, clinic-wide KPI fields.
 *
 * Ports the original EXPORT_SCHEMA.js (fields 1-24) and adds the "shared
 * clinic data" fields discovered in the Adjust Health senior-physio meeting
 * spreadsheet (diary management %, CVA breakdown by provider tier, JBV),
 * plus the Weekly Input fields described in the Adjust Analytics spec
 * (diary management bookings, admin manual fields).
 *
 * Every Weekly Input form field, dashboard chart, and calc function should
 * read this list rather than hardcoding field names.
 */

export type ClinicFieldSource = "date" | "manual" | "calc";
export type ClinicFieldType = "date" | "currency" | "number" | "decimal" | "percent";
export type ClinicFieldCategory =
  | "Meta"
  | "Revenue"
  | "Payer"
  | "Occupancy"
  | "Gym"
  | "Podiatry"
  | "CX"
  | "Diary"
  | "Clinic"
  | "Admin"
  | "AgeingDebt";

export interface ClinicField {
  idx: number;
  id: string;
  label: string;
  source: ClinicFieldSource;
  type: ClinicFieldType;
  category: ClinicFieldCategory;
  decimals?: number;
}

export const CLINIC_SCHEMA: ClinicField[] = [
  { idx: 1, id: "week", label: "Week Ending", source: "date", type: "date", category: "Meta" },
  { idx: 2, id: "total_rev", label: "Total Revenue", source: "calc", type: "currency", category: "Revenue" },
  { idx: 3, id: "total_consults", label: "Completed Consults", source: "calc", type: "number", category: "Revenue" },
  { idx: 4, id: "total_nc", label: "New Clients", source: "calc", type: "number", category: "Revenue" },
  { idx: 5, id: "clinic_occ", label: "Clinic Occupancy %", source: "calc", type: "percent", category: "Occupancy" },
  { idx: 6, id: "physio_occ", label: "Physio Occupancy %", source: "calc", type: "percent", category: "Occupancy" },
  { idx: 7, id: "massage_occ", label: "Massage Occupancy %", source: "calc", type: "percent", category: "Occupancy" },
  { idx: 8, id: "ep_occ", label: "EP Occupancy %", source: "calc", type: "percent", category: "Occupancy" },
  { idx: 9, id: "m_glofox", label: "Glofox Income", source: "manual", type: "currency", category: "Gym" },
  { idx: 10, id: "m_glofox_fees", label: "Glofox Fees", source: "manual", type: "currency", category: "Gym" },
  { idx: 11, id: "m_gym3p", label: "3rd Party Gym Revenue (of which — already included in Glofox Income)", source: "manual", type: "currency", category: "Gym" },
  { idx: 13, id: "gym_total", label: "Total Gym Revenue", source: "calc", type: "currency", category: "Gym" },
  { idx: 14, id: "m_mems", label: "Paid Memberships", source: "manual", type: "number", category: "Gym" },
  { idx: 15, id: "m_pod_rev", label: "Podiatry Revenue (÷2)", source: "manual", type: "currency", category: "Podiatry" },
  { idx: 16, id: "m_pod_c", label: "Podiatry Consults", source: "manual", type: "number", category: "Podiatry" },
  { idx: 17, id: "m_pod_ytd", label: "Podiatry YTD Revenue", source: "manual", type: "currency", category: "Podiatry" },
  { idx: 18, id: "total_adjust_pod_rev", label: "Total Adjust + Podiatry Revenue", source: "calc", type: "currency", category: "Revenue" },
  { idx: 19, id: "cx_cancels", label: "Cancellations (count)", source: "calc", type: "number", category: "CX" },
  { idx: 20, id: "cx_pct", label: "Cancellation %", source: "calc", type: "percent", category: "CX" },
  { idx: 21, id: "cx_dnas", label: "Did Not Arrive (count)", source: "calc", type: "number", category: "CX" },
  { idx: 22, id: "cx_nr", label: "Not Rebooked (count)", source: "calc", type: "number", category: "CX" },
  { idx: 23, id: "cx_nr_pct", label: "Not Rebooked %", source: "calc", type: "percent", category: "CX" },
  { idx: 24, id: "cx_rsx_pct", label: "Reschedule %", source: "calc", type: "percent", category: "CX" },
  { idx: 25, id: "cx_in7_pct", label: "Booked Within 7 Days %", source: "calc", type: "percent", category: "CX" },

  // Diary management (Weekly Input spec)
  { idx: 26, id: "bookings_start_week", label: "Bookings at Start of Week", source: "manual", type: "number", category: "Diary" },
  { idx: 27, id: "bookings_following_week", label: "Total Bookings for Following Week", source: "manual", type: "number", category: "Diary" },
  { idx: 28, id: "diary_mgmt_pct", label: "Diary Management %", source: "calc", type: "percent", category: "Diary" },
  { idx: 29, id: "online_bookings_total", label: "Online Bookings Total", source: "manual", type: "number", category: "Diary" },
  { idx: 30, id: "online_bookings_new", label: "Online Bookings New", source: "manual", type: "number", category: "Diary" },

  // Shared clinic data (from the senior-physio meeting spreadsheet — entered once, feeds every provider page)
  { idx: 31, id: "cva_new_grads", label: "CVA — New Grads", source: "manual", type: "decimal", decimals: 2, category: "Clinic" },
  { idx: 32, id: "cva_2_5yr", label: "CVA — 2-5yr", source: "manual", type: "decimal", decimals: 2, category: "Clinic" },
  { idx: 33, id: "cva_ep", label: "CVA — EP", source: "manual", type: "decimal", decimals: 2, category: "Clinic" },
  { idx: 34, id: "cva_massage", label: "CVA — Massage", source: "manual", type: "decimal", decimals: 2, category: "Clinic" },
  { idx: 35, id: "jbv_initial", label: "JBV Initial Consults", source: "calc", type: "number", category: "Clinic" },
  { idx: 36, id: "jbv_sub", label: "JBV Subsequent Consults", source: "calc", type: "number", category: "Clinic" },
  { idx: 37, id: "jbv_total", label: "JBV Total", source: "calc", type: "number", category: "Clinic" },

  // Admin manual fields (Weekly Input spec)
  { idx: 38, id: "admin_followup_calls", label: "Follow-up Calls Completed", source: "manual", type: "number", category: "Admin" },
  { idx: 39, id: "admin_onboarding_video_pct", label: "Onboarding Videos Sent %", source: "manual", type: "percent", category: "Admin" },
  { idx: 40, id: "admin_email_optin_pct", label: "Email Opt-In %", source: "manual", type: "percent", category: "Admin" },
  { idx: 41, id: "admin_website_optin_pct", label: "Website Opt-In %", source: "manual", type: "percent", category: "Admin" },
  { idx: 42, id: "admin_new_client_emails", label: "New Client Emails Collected", source: "manual", type: "number", category: "Admin" },

  // Revenue by payer (auto-populated from the Nookal Activity Report; see lib/nookal/payerCategories.ts)
  { idx: 43, id: "rev_private", label: "Revenue — Private", source: "calc", type: "currency", category: "Payer" },
  { idx: 44, id: "rev_medicare", label: "Revenue — Medicare", source: "calc", type: "currency", category: "Payer" },
  { idx: 45, id: "rev_dva", label: "Revenue — DVA", source: "calc", type: "currency", category: "Payer" },
  { idx: 46, id: "rev_workcover", label: "Revenue — WorkCover", source: "calc", type: "currency", category: "Payer" },
  { idx: 47, id: "rev_ndis", label: "Revenue — NDIS", source: "calc", type: "currency", category: "Payer" },
  { idx: 48, id: "rev_other", label: "Revenue — Other", source: "calc", type: "currency", category: "Payer" },

  { idx: 49, id: "cva_senior", label: "CVA — Senior (6+ yrs)", source: "manual", type: "decimal", decimals: 2, category: "Clinic" },

  // Clinic-wide specialty consult counts (from the director's "SPECIALTY SERVICES CONSULTATIONS" tracker).
  // Vestibular/Headaches/Paeds auto-fill from the Activity Report the same way JBV does; Women's Health has
  // no CSV source on the director's own sheet, so it stays manual.
  { idx: 50, id: "specialty_vestibular_initial", label: "Vestibular Initial Consults", source: "calc", type: "number", category: "Clinic" },
  { idx: 51, id: "specialty_vestibular_sub", label: "Vestibular Subsequent Consults", source: "calc", type: "number", category: "Clinic" },
  { idx: 52, id: "specialty_vestibular_total", label: "Vestibular Total Consults", source: "calc", type: "number", category: "Clinic" },
  { idx: 53, id: "specialty_headaches_initial", label: "Headaches Initial Consults", source: "calc", type: "number", category: "Clinic" },
  { idx: 54, id: "specialty_headaches_sub", label: "Headaches Subsequent Consults", source: "calc", type: "number", category: "Clinic" },
  { idx: 55, id: "specialty_headaches_total", label: "Headaches Total Consults", source: "calc", type: "number", category: "Clinic" },
  { idx: 56, id: "specialty_paeds_initial", label: "Paeds Initial Consults", source: "calc", type: "number", category: "Clinic" },
  { idx: 57, id: "specialty_paeds_sub", label: "Paeds Subsequent Consults", source: "calc", type: "number", category: "Clinic" },
  { idx: 58, id: "specialty_paeds_total", label: "Paeds Total Consults", source: "calc", type: "number", category: "Clinic" },
  { idx: 59, id: "specialty_womens_health_total", label: "Women's Health Total Consults", source: "manual", type: "number", category: "Clinic" },

  // Ageing Debts — from the director's "C. Ageing Debts" / "AGEING DEBT PODIATRY" sheet sections.
  // The Nookal Aged Debtors report only exports "All Locations" combined and groups by payer
  // type, not by individual client — it can't tell us which of a "[Private]" balance belongs to
  // a true private-pay client vs. an NDIS self-managed client invoiced as Private, and it can't
  // split Adjust Physiotherapy from Podiatry. Rather than guess at a split on numbers this
  // sensitive, every field here stays manual (typed straight off the report), same as Gym/Podiatry
  // revenue today.
  { idx: 60, id: "ad_total_private", label: "Ageing Debt — Total Private", source: "manual", type: "currency", category: "AgeingDebt" },
  { idx: 61, id: "ad_actual_private", label: "Ageing Debt — Actual Private", source: "manual", type: "currency", category: "AgeingDebt" },
  { idx: 62, id: "ad_ndis", label: "Ageing Debt — NDIS", source: "manual", type: "currency", category: "AgeingDebt" },
  { idx: 63, id: "ad_3rd_party_61_90", label: "Ageing Debt — 3rd Party 61-90 Days", source: "manual", type: "currency", category: "AgeingDebt" },
  { idx: 64, id: "ad_3rd_party_90", label: "Ageing Debt — 3rd Party >90 Days", source: "manual", type: "currency", category: "AgeingDebt" },
  { idx: 65, id: "ad_medicare_dva_31", label: "Ageing Debt — Medicare/DVA over 31 Days", source: "manual", type: "currency", category: "AgeingDebt" },
  { idx: 66, id: "ad_total", label: "Total Ageing Debt — Adjust Only", source: "manual", type: "currency", category: "AgeingDebt" },

  { idx: 67, id: "ad_pod_total_private", label: "Podiatry Ageing Debt — Total Private", source: "manual", type: "currency", category: "AgeingDebt" },
  { idx: 68, id: "ad_pod_actual_private", label: "Podiatry Ageing Debt — Actual Private", source: "manual", type: "currency", category: "AgeingDebt" },
  { idx: 69, id: "ad_pod_ndis", label: "Podiatry Ageing Debt — NDIS", source: "manual", type: "currency", category: "AgeingDebt" },
  { idx: 70, id: "ad_pod_3rd_party_61_90", label: "Podiatry Ageing Debt — 3rd Party 61-90 Days", source: "manual", type: "currency", category: "AgeingDebt" },
  { idx: 71, id: "ad_pod_3rd_party_90", label: "Podiatry Ageing Debt — 3rd Party >90 Days", source: "manual", type: "currency", category: "AgeingDebt" },
  { idx: 72, id: "ad_pod_medicare_dva_31", label: "Podiatry Ageing Debt — Medicare/DVA over 31 Days", source: "manual", type: "currency", category: "AgeingDebt" },
  { idx: 73, id: "ad_pod_total", label: "Total Ageing Debt — Podiatry Only", source: "manual", type: "currency", category: "AgeingDebt" },
];

export function getClinicHeaders(): string[] {
  return CLINIC_SCHEMA.map((f) => f.label);
}

export function getClinicField(id: string): ClinicField | undefined {
  return CLINIC_SCHEMA.find((f) => f.id === id);
}

export function getClinicFieldsByCategory(category: ClinicFieldCategory): ClinicField[] {
  return CLINIC_SCHEMA.filter((f) => f.category === category);
}

export function getManualClinicFields(): ClinicField[] {
  return CLINIC_SCHEMA.filter((f) => f.source === "manual");
}

/**
 * Fields computed as pure Postgres generated columns (see
 * supabase/migrations/0001_init.sql) — never directly editable.
 */
export const GENERATED_CLINIC_FIELD_IDS = [
  "gym_total",
  "total_adjust_pod_rev",
  "diary_mgmt_pct",
  "jbv_total",
  "specialty_vestibular_total",
  "specialty_headaches_total",
  "specialty_paeds_total",
] as const;

/**
 * Every field the Weekly Input form should render as an editable input.
 * Includes fields marked source:"calc" that aren't yet auto-populated from
 * Nookal report parsing (total_rev, occupancy %, cx_* fields, etc.) — until
 * that ships, staff enter them manually here, same as they do today reading
 * the numbers off Nookal reports.
 */
export function getEditableClinicFields(): ClinicField[] {
  return CLINIC_SCHEMA.filter(
    (f) => f.source !== "date" && !(GENERATED_CLINIC_FIELD_IDS as readonly string[]).includes(f.id)
  );
}

export const NOOKAL_REPORT_TYPES = [
  "activity",
  "business_performance",
  "occupancy",
  "clients_and_cases",
  "providers_and_practice",
  "cancellations",
  "aged_debtors",
] as const;

export type NookalReportType = (typeof NOOKAL_REPORT_TYPES)[number];

export const NOOKAL_REPORT_LABELS: Record<NookalReportType, string> = {
  activity: "Activity",
  business_performance: "Business Performance",
  occupancy: "Occupancy",
  clients_and_cases: "Clients & Cases",
  providers_and_practice: "Providers & Practice",
  cancellations: "Cancellations",
  aged_debtors: "Aged Debtors",
};
