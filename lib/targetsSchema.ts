import { ProviderRole } from "@/lib/providerSchema";

/** Clinic-wide target fields shown on the Targets page — compared against on the clinic dashboards. */

export interface TargetField {
  key: string;
  label: string;
  type: "currency" | "number" | "decimal" | "percent";
}

export const CLINIC_TARGET_FIELDS: TargetField[] = [
  { key: "annual_revenue_target", label: "Annual Revenue Target", type: "currency" },
  { key: "weekly_revenue_target", label: "Weekly Revenue Target", type: "currency" },
  { key: "weekly_breakeven_target", label: "Weekly Break-Even", type: "currency" },
  { key: "weekly_gym_revenue_target", label: "Weekly Gym Revenue Target", type: "currency" },
  { key: "clinic_occ_target", label: "Clinic Occupancy Target", type: "percent" },
  { key: "physio_occ_target", label: "Physio Occupancy Target", type: "percent" },
  { key: "massage_occ_target", label: "Massage Occupancy Target", type: "percent" },
  { key: "ep_occ_target", label: "EP Occupancy Target", type: "percent" },
  { key: "cx_pct_target", label: "Max Cancellation % Target", type: "percent" },
  // Weekly cost-line benchmarks, plotted as reference lines on the Revenue page
  { key: "cost_staff", label: "Staff Costs (weekly)", type: "currency" },
  { key: "cost_staff_rent_glofox", label: "Staff + Rent + Glofox (weekly)", type: "currency" },
  { key: "cost_staff_rent_glofox_loan", label: "Staff + Rent + Glofox + Loan (weekly)", type: "currency" },
];

/** Fixed provider target fields, on top of any per-provider specialty_metrics targets. */
export const PROVIDER_TARGET_FIELDS: TargetField[] = [
  { key: "personal_cva", label: "Personal UCVA Target", type: "decimal" },
  { key: "annual_turnover_target", label: "Annual Turnover Target", type: "currency" },
  { key: "working_weeks", label: "Working Weeks in Year", type: "number" },
];

export const BONUS_TIER_FIELDS: { key: "t1" | "t2" | "t3" | "t4"; label: string }[] = [
  { key: "t1", label: "Tier 1" },
  { key: "t2", label: "Tier 2" },
  { key: "t3", label: "Tier 3" },
  { key: "t4", label: "Tier 4" },
];

export type RoleTargetGroupId = "providers" | "senior" | "admin";

export interface RoleTargetGroup {
  id: RoleTargetGroupId;
  label: string;
  description: string;
  /** Flat KPI Scorecard target fields shared by every provider in this group — set once here instead of per-person. */
  fields: TargetField[];
  /** Set only on "providers"/"senior" — the CVA-by-tier target(s) this group owns, shown as their own mini-row. */
  cvaTierFields?: { key: string; label: string }[];
}

const SHARED_CLINICIAN_TARGET_FIELDS: TargetField[] = [
  { key: "fba", label: "FBA (Forward Booking Average)", type: "decimal" },
  { key: "occupancy_pct", label: "Occupancy", type: "percent" },
  { key: "completed_consults", label: "Completed Consults", type: "number" },
  { key: "new_pt_booking_rate", label: "New Patient Booking Rate", type: "decimal" },
  { key: "ncva", label: "NCVA", type: "decimal" },
  { key: "tpr", label: "TPR (Total Patient Revenue)", type: "currency" },
  { key: "dnas", label: "Number of DNAs", type: "number" },
  { key: "cancellations", label: "Number of Cancellations", type: "number" },
  { key: "not_rebooked_pct", label: "Not Rebooked %", type: "percent" },
  { key: "retention_pct", label: "Retention Rate", type: "percent" },
  { key: "reschedule_rate_pct", label: "Reschedule Rate", type: "percent" },
];

/**
 * Role-level target groups shown on the Targets page — one editable set per
 * group instead of one per individual provider, so changing (say) the FBA
 * target doesn't mean opening every physio's card. CVA still varies by
 * experience tier, so "Providers" owns the New Grad / 2-5yr targets and
 * "Senior" owns the Senior (6+yr) target — looked up by tier (lib/cvaTier.ts),
 * independent of which group a given provider's other targets come from.
 * Genuinely individual things — bonus tier thresholds, specialty metric
 * targets, annual turnover/working weeks — stay on the provider's own card.
 */
export const ROLE_TARGET_GROUPS: RoleTargetGroup[] = [
  {
    id: "providers",
    label: "Providers",
    description: "Physio, Massage, EP — every regular clinician shares these targets.",
    fields: SHARED_CLINICIAN_TARGET_FIELDS,
    cvaTierFields: [
      { key: "cva_target_new_grad", label: "UCVA Target — New Grad" },
      { key: "cva_target_2_5yr", label: "UCVA Target — 2-5yr" },
    ],
  },
  {
    id: "senior",
    label: "Senior Physio",
    description: "Shared KPI Scorecard targets for every senior physio — bonus tiers and specialty targets stay individual below.",
    fields: SHARED_CLINICIAN_TARGET_FIELDS,
    cvaTierFields: [{ key: "cva_target_senior", label: "UCVA Target — Senior (6+yr)" }],
  },
  {
    id: "admin",
    label: "Admin",
    description: "Every admin staff member shares these targets.",
    fields: [
      { key: "cancellations_handled", label: "Cancellations Handled", type: "number" },
      { key: "pct_of_total_clinic_cx", label: "Cancellations % of Total Clinic", type: "percent" },
      { key: "not_rebooked", label: "Number Not Rebooked", type: "number" },
      { key: "cancellations_not_rebooked_pct", label: "Cancellations Not Rebooked %", type: "percent" },
      { key: "retention_pct", label: "Retention Rate", type: "percent" },
      { key: "reschedule_rate_pct", label: "Reschedule Rate", type: "percent" },
      { key: "booked_within_7_days_pct", label: "Cancellations Booked Within 7 Days", type: "percent" },
      { key: "avg_days_to_next_booking", label: "Average Days to Next Booking", type: "decimal" },
      { key: "diary_management_pct", label: "Diary Management", type: "percent" },
      { key: "follow_up_phone_calls_pct", label: "Follow Up Phone Calls", type: "percent" },
      { key: "obv_not_sent", label: "OBV Number Not Sent", type: "number" },
      { key: "rx_notes_made_pct", label: "Rx Notes Made in Therapist Diary", type: "percent" },
      { key: "answered_calls_pct", label: "Answered Calls", type: "percent" },
    ],
  },
];

/** Which shared target group a provider's flat KPI Scorecard targets come from. */
export function roleTargetGroupId(role: ProviderRole): RoleTargetGroupId {
  if (role === "admin") return "admin";
  if (role === "senior_physio") return "senior";
  return "providers";
}

/**
 * Whether this provider has any genuinely individual target to show
 * (role-group cards cover everyone else) — a plain function, not a
 * component, so it must live in a non-"use client" module to be callable
 * directly from the server-rendered Targets page.
 */
export function providerHasIndividualTargets(provider: { role: ProviderRole; specialty_metrics: unknown[] }): boolean {
  if (provider.role === "senior_physio") return true;
  if (provider.role !== "admin") return true; // PROVIDER_TARGET_FIELDS always apply
  return provider.specialty_metrics.length > 0;
}
