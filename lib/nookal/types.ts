import { PayerCategory } from "@/lib/nookal/payerCategories";

export interface ActivityReportResult {
  totalRevenue: number | null;
  revenueByProvider: Record<string, number>;
  revenueByPayerCategory: Record<PayerCategory, number>;
  /** Rows whose Case/Item text contains "JBV" — split by "init(ial)" vs "sub(sequent)" in that same text. */
  jbvInitialCount: number;
  jbvSubCount: number;
  /** Rows matching a keyword, grouped by provider — e.g. Marcio's headache_init/headache_sub specialty counts. Keyed by the keyword passed to parseActivityReport. */
  keywordCountsByProvider: Record<string, Record<string, number>>;
  /**
   * Clinic-wide specialty consult counts — vestibular/headaches/paeds are
   * whole-clinic totals (not tied to any one provider), matching the
   * director's own "SPECIALTY SERVICES CONSULTATIONS" tracker. Keyed by
   * SPECIALTY_CATEGORY_PATTERNS' keys in parsers.ts.
   */
  specialtyCounts: Record<string, { total: number; initial: number; sub: number }>;
  /** Every distinct client with at least one line item this week — used to compute New Patient Retention (were this week's new patients still showing up N weeks later) without a full per-client attendance ledger. */
  clientsSeenNames: string[];
  /**
   * Sum of Amount for rows whose Item matches one of the director's fixed
   * list of 3rd-party-funded gym/group-exercise service items (WC/DVA/NDIS
   * gym memberships and group classes, invoiced through Nookal rather than
   * Glofox's private direct-debit billing) — replaces the old manual
   * weekly figure. See GYM_3RD_PARTY_ITEM_PATTERNS in parsers.ts.
   */
  gym3pRevenue: number;
  /**
   * Per-provider Services (Details rows, already excluding Classes/
   * Inventory/Passes/Redemptions) and distinct Client names — both the raw
   * "all" totals and a second cut excluding rows whose Case/Item text
   * matches the corporate-screening/pre-employment pattern (Village/Move
   * OT/Biosym/Pre-Employment), the same population Nookal's own UCVA
   * already excludes via the Business Performance Report's Payers filter.
   * Captured every week so Services/Unique-Patients (Patient Visit Average)
   * can eventually be computed as a true rolling 12-month figure on the
   * same footing as UCVA, both with and without that exclusion, without
   * needing Nookal to re-run any export with a Payers filter applied.
   */
  pvaByProvider: Record<
    string,
    { servicesAll: number; clientNamesAll: string[]; servicesExclPreEmployment: number; clientNamesExclPreEmployment: string[] }
  >;
}

export interface OccupancyReportResult {
  byProvider: Record<
    string,
    {
      occupancyPct: number | null;
      scheduledMinutes: number | null;
      occupiedMinutes: number | null;
      services: number | null;
    }
  >;
}

export interface CancellationsReportResult {
  byProvider: Record<
    string,
    {
      cancellations: number;
      dnas: number;
      completed: number | null;
      cancellationPct: number | null;
      dnaPct: number | null;
      notRebooked: number;
      notRebookedPct: number | null;
      rescheduledCount: number;
      rescheduleRatePct: number | null;
      bookedWithin7DaysPct: number | null;
      /** Real (non-DNA, non-bulk-cancelled) Details rows for this provider — the denominator behind notRebookedPct/rescheduleRatePct/bookedWithin7DaysPct. Sum across providers for a consistent clinic-wide denominator. */
      eventsCount: number;
    }
  >;
  /** Same Details rows, grouped by the "Modified User" column — the admin staff member who handled the cancellation. */
  byAdmin: Record<
    string,
    {
      cancellationsHandled: number;
      notRebooked: number;
      rescheduledCount: number;
      rescheduleRatePct: number | null;
      notRebookedPct: number | null;
      bookedWithin7DaysPct: number | null;
      pctOfTotalClinicCx: number | null;
      avgDaysToNextBooking: number | null;
    }
  >;
  /**
   * Every raw Cancelled/Did Not Arrive row from Details, unfiltered — for
   * the Cancellations tab where the director scrolls through each one with
   * the admin team, the same way the old spreadsheet's tab worked. Unlike
   * byProvider/byAdmin, this is NOT deduped or exclusion-filtered — every
   * line item Nookal reports is its own row here.
   */
  detailRows: {
    appointmentDate: string | null;
    client: string;
    provider: string | null;
    caseName: string | null;
    status: "Cancelled" | "Did Not Arrive";
    note: string | null;
    nextBooking: string | null;
    modifiedUser: string | null;
    modifiedAt: string | null;
  }[];
}

export interface ClientsAndCasesReportResult {
  byProvider: Record<
    string,
    {
      /** All new clients, including corporate Pre-Employment screening cases (Village Road Show, Top Golf, etc.) — the raw Nookal count before Pre-Employment is excluded. Not used to feed any KPI figure directly; kept for visibility/debugging. */
      newClients: number;
      /** New clients excluding Pre-Employment screening cases — the real per-provider "# New Clients" figure the director's sheet tracks (confirmed: a Pre-Employment case inflates the raw count but isn't counted per-provider). */
      newClientsExclPreEmployment: number;
      newCases: number;
      /**
       * Sum, across this provider's new clients (excl. Pre-Employment), of the
       * "Total" half of each client's "Bookings" cell (e.g. "2 Complete / 7
       * Total" contributes 7) — the KPI Scorecard's "NPBR calc — total
       * recommendations for new patients". Divide by newClientsExclPreEmployment
       * for New Patient Booking Rate, matching the real Accountability Meeting
       * template (a new client's own total recommended booking count, averaged
       * across all of a provider's new clients that week).
       */
      npbrRecommendationsTotal: number;
      /** Names of this provider's new clients that week (excl. Pre-Employment), in report order — for the "new clients this week" review list. */
      newClientNames: string[];
    }
  >;
}

export interface ProvidersAndPracticeReportResult {
  byProvider: Record<
    string,
    {
      completedConsults: number | null;
      uniqueClients: number | null;
      cva: number | null;
      caseVA: number | null;
      forwardBookingAverage: number | null;
      totalSales: number | null;
    }
  >;
}

/**
 * Business Performance Report — the real source of UCVA/NCVA/TPR (confirmed
 * against the director's own "where the data comes from" sheet and a real
 * export: Nookal's own payer-exclusion filter is already applied when the
 * report is generated in Nookal, based on the Parameters section's Payers
 * list — nothing further to exclude here).
 */
export interface BusinessPerformanceReportResult {
  byProvider: Record<
    string,
    {
      ncva: number | null;
      ucva: number | null;
      tpr: number | null;
    }
  >;
}

/**
 * Aged Debtors Report — one row per payer (not per client), "All Locations"
 * combined. Bucketed with the same categorizePayer() used on the Revenue
 * page, so it inherits that function's known blind spots: a plan-manager-
 * style payer whose name doesn't contain "plan manag"/"disability"/"NDIS"
 * (e.g. an individual coordinator's name) reads as "other" and folds into
 * 3rd Party here rather than NDIS. Can't split Adjust from Podiatry (no
 * location column in this report) — Podiatry ageing debt isn't tracked at
 * all, and the director confirmed the true-private-vs-NDIS-invoiced-as-
 * Private distinction doesn't need manual tracking either.
 */
export interface AgedDebtorsReportResult {
  adTotalPrivate: number | null;
  adNdis: number | null;
  ad3rdParty6190: number | null;
  ad3rdParty90: number | null;
  adMedicareDva31: number | null;
  /** The report's own Details "Total" row — its Amount column, unfiltered. */
  adTotal: number | null;
}
