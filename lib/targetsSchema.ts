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
  { key: "personal_cva", label: "Personal CVA Target", type: "decimal" },
  { key: "annual_turnover_target", label: "Annual Turnover Target", type: "currency" },
  { key: "working_weeks", label: "Working Weeks in Year", type: "number" },
];

export const BONUS_TIER_FIELDS: { key: "t1" | "t2" | "t3" | "t4"; label: string }[] = [
  { key: "t1", label: "Tier 1" },
  { key: "t2", label: "Tier 2" },
  { key: "t3", label: "Tier 3" },
  { key: "t4", label: "Tier 4" },
];
