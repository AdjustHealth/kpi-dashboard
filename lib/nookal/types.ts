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
}

export interface ClientsAndCasesReportResult {
  byProvider: Record<
    string,
    {
      /** All new clients, including corporate Pre-Employment screening cases (Village Road Show, Top Golf, etc.) — feeds the clinic-wide "Total new clients (incl Pre Employments)" figure. */
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
