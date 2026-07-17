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
      rescheduledCount: number;
      rescheduleRatePct: number | null;
      bookedWithin7DaysPct: number | null;
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
  byProvider: Record<string, { newClients: number; newCases: number }>;
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
