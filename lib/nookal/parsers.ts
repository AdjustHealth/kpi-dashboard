import {
  extractSection,
  extractSectionTotalRow,
  parseCsvRows,
  parseNookalDate,
  parseNumber,
  parsePercent,
  rowToRecord,
} from "@/lib/nookal/csv";
import { categorizePayer, PayerCategory } from "@/lib/nookal/payerCategories";
import {
  ActivityReportResult,
  CancellationsReportResult,
  ClientsAndCasesReportResult,
  OccupancyReportResult,
  ProvidersAndPracticeReportResult,
} from "@/lib/nookal/types";

const EMPTY_PAYER_TOTALS: Record<PayerCategory, number> = {
  private: 0,
  medicare: 0,
  dva: 0,
  workcover: 0,
  ndis: 0,
  other: 0,
};

const JBV_PATTERN = /jbv/i;
const JBV_SUB_PATTERN = /sub/i;
const JBV_INIT_PATTERN = /init/i;

/**
 * Activity Report — revenue detail, one row per invoiced line item.
 *
 * Quirk: the Details section only lists "Service" line items — Classes,
 * Inventory, Passes and Redemptions revenue is excluded even though the
 * file's own Summary table (Type/Subtotal/Tax/Total) includes them. So
 * `totalRevenue` is read from the Summary's "Total" row (always accurate,
 * matches Nookal exactly) while the per-provider/per-payer breakdowns come
 * from Details and will slightly undercount if the practice has meaningful
 * Classes/Inventory/Pass revenue outside of services.
 *
 * `keywordPatterns` lets the caller count rows matching a per-provider
 * specialty keyword (e.g. Marcio's Headache Init/Sub) without hardcoding
 * any specialty name here — same "Case"/"Item" text used for JBV detection.
 */
export function parseActivityReport(
  text: string,
  keywordPatterns: Record<string, RegExp> = {}
): ActivityReportResult {
  const rows = parseCsvRows(text);

  const totalRow = extractSectionTotalRow(rows, "Summary");
  const totalRevenue = totalRow ? parseNumber(totalRow[totalRow.length - 1]) : null;

  const empty: ActivityReportResult = {
    totalRevenue,
    revenueByProvider: {},
    revenueByPayerCategory: { ...EMPTY_PAYER_TOTALS },
    jbvInitialCount: 0,
    jbvSubCount: 0,
    keywordCountsByProvider: {},
  };
  const section = extractSection(rows, "Details");
  if (!section) return empty;

  const revenueByProvider: Record<string, number> = {};
  const revenueByPayerCategory: Record<PayerCategory, number> = { ...EMPTY_PAYER_TOTALS };
  let jbvInitialCount = 0;
  let jbvSubCount = 0;
  const keywordCountsByProvider: Record<string, Record<string, number>> = {};
  for (const name of Object.keys(keywordPatterns)) keywordCountsByProvider[name] = {};

  for (const row of section.rows) {
    const r = rowToRecord(section.header, row);
    const amount = parseNumber(r["Amount"]);
    const provider = r["Staff"];
    const itemText = `${r["Case"] ?? ""} ${r["Item"] ?? ""}`;

    if (amount !== null) {
      if (provider) revenueByProvider[provider] = (revenueByProvider[provider] ?? 0) + amount;
      revenueByPayerCategory[categorizePayer(r["Invoice Type"])] += amount;
    }

    if (JBV_PATTERN.test(itemText)) {
      if (JBV_SUB_PATTERN.test(itemText)) jbvSubCount += 1;
      else if (JBV_INIT_PATTERN.test(itemText)) jbvInitialCount += 1;
    }

    if (provider) {
      for (const [name, pattern] of Object.entries(keywordPatterns)) {
        if (pattern.test(itemText)) {
          keywordCountsByProvider[name][provider] = (keywordCountsByProvider[name][provider] ?? 0) + 1;
        }
      }
    }
  }

  return { totalRevenue, revenueByProvider, revenueByPayerCategory, jbvInitialCount, jbvSubCount, keywordCountsByProvider };
}

/** Occupancy Report — per-provider scheduled vs. occupied minutes. */
export function parseOccupancyReport(text: string): OccupancyReportResult {
  const rows = parseCsvRows(text);
  const section = extractSection(rows, "Summary");
  const byProvider: OccupancyReportResult["byProvider"] = {};
  if (!section) return { byProvider };

  for (const row of section.rows) {
    const r = rowToRecord(section.header, row);
    const provider = r["Provider"];
    if (!provider) continue;
    byProvider[provider] = {
      occupancyPct: parsePercent(r["Occupancy"]),
      scheduledMinutes: parseNumber(r["Scheduled Minutes"]),
      occupiedMinutes: parseNumber(r["Occupied"]),
      services: parseNumber(r["Services"]),
    };
  }
  return { byProvider };
}

/**
 * Cancellations Report — the Summary gives per-provider counts/percentages
 * directly from Nookal. The Details rows (one per cancelled/DNA event) are
 * used to compute "Not Rebooked" and "Reschedule Rate", per the business's
 * own definition: a cancellation counts as rescheduled if it has a Next
 * Booking date. "Booked within 7 Days" is the share of all cancellations
 * (rescheduled or not) that were rebooked within 7 days of the original
 * appointment date — confirm this matches intent if the number looks off.
 */
export function parseCancellationsReport(text: string): CancellationsReportResult {
  const rows = parseCsvRows(text);
  const byProvider: CancellationsReportResult["byProvider"] = {};
  const byAdmin: CancellationsReportResult["byAdmin"] = {};

  const summary = extractSection(rows, "Summary");
  if (summary) {
    for (const row of summary.rows) {
      const r = rowToRecord(summary.header, row);
      const provider = r["Provider"];
      if (!provider) continue;
      byProvider[provider] = {
        cancellations: parseNumber(r["Cancellations"]) ?? 0,
        dnas: parseNumber(r["DNAs"]) ?? 0,
        completed: parseNumber(r["Completed"]),
        cancellationPct: parsePercent(r["Cancellation %"]),
        dnaPct: parsePercent(r["DNA %"]),
        notRebooked: 0,
        rescheduledCount: 0,
        rescheduleRatePct: null,
        bookedWithin7DaysPct: null,
      };
    }
  }

  const details = extractSection(rows, "Details");
  if (details) {
    const rebookedWithin7: Record<string, number> = {};
    const total: Record<string, number> = {};
    // Admin-side bucketing: same rows, grouped by "Modified User" — the
    // admin staff member who actioned the cancellation, not the clinician
    // it happened to.
    const adminRescheduled: Record<string, number> = {};
    const adminNotRebooked: Record<string, number> = {};
    const adminTotal: Record<string, number> = {};
    const adminDaysToNextSum: Record<string, number> = {};
    const adminDaysToNextCount: Record<string, number> = {};
    const adminRebookedWithin7: Record<string, number> = {};
    let totalHandledByAnyAdmin = 0;

    for (const row of details.rows) {
      const r = rowToRecord(details.header, row);
      const provider = r["Provider"];
      const nextBooking = r["Next Booking"];
      const apptDate = parseNookalDate(r["Appointment Date"]);
      const nextDate = nextBooking ? parseNookalDate(nextBooking) : null;
      const daysBetween = apptDate && nextDate ? (nextDate.getTime() - apptDate.getTime()) / (1000 * 60 * 60 * 24) : null;

      if (provider) {
        if (!byProvider[provider]) {
          byProvider[provider] = {
            cancellations: 0,
            dnas: 0,
            completed: null,
            cancellationPct: null,
            dnaPct: null,
            notRebooked: 0,
            rescheduledCount: 0,
            rescheduleRatePct: null,
            bookedWithin7DaysPct: null,
          };
        }
        total[provider] = (total[provider] ?? 0) + 1;
        if (nextBooking) {
          byProvider[provider].rescheduledCount += 1;
          if (daysBetween !== null && daysBetween <= 7) {
            rebookedWithin7[provider] = (rebookedWithin7[provider] ?? 0) + 1;
          }
        } else {
          byProvider[provider].notRebooked += 1;
        }
      }

      const admin = r["Modified User"];
      if (admin) {
        adminTotal[admin] = (adminTotal[admin] ?? 0) + 1;
        totalHandledByAnyAdmin += 1;
        if (nextBooking) {
          adminRescheduled[admin] = (adminRescheduled[admin] ?? 0) + 1;
          if (daysBetween !== null) {
            adminDaysToNextSum[admin] = (adminDaysToNextSum[admin] ?? 0) + daysBetween;
            adminDaysToNextCount[admin] = (adminDaysToNextCount[admin] ?? 0) + 1;
            if (daysBetween <= 7) adminRebookedWithin7[admin] = (adminRebookedWithin7[admin] ?? 0) + 1;
          }
        } else {
          adminNotRebooked[admin] = (adminNotRebooked[admin] ?? 0) + 1;
        }
      }
    }

    for (const provider of Object.keys(byProvider)) {
      const t = total[provider];
      if (!t) continue;
      byProvider[provider].rescheduleRatePct = byProvider[provider].rescheduledCount / t;
      byProvider[provider].bookedWithin7DaysPct = (rebookedWithin7[provider] ?? 0) / t;
    }

    for (const admin of Object.keys(adminTotal)) {
      const t = adminTotal[admin];
      const daysCount = adminDaysToNextCount[admin] ?? 0;
      byAdmin[admin] = {
        cancellationsHandled: t,
        notRebooked: adminNotRebooked[admin] ?? 0,
        rescheduledCount: adminRescheduled[admin] ?? 0,
        rescheduleRatePct: t > 0 ? (adminRescheduled[admin] ?? 0) / t : null,
        notRebookedPct: t > 0 ? (adminNotRebooked[admin] ?? 0) / t : null,
        bookedWithin7DaysPct: t > 0 ? (adminRebookedWithin7[admin] ?? 0) / t : null,
        pctOfTotalClinicCx: totalHandledByAnyAdmin > 0 ? t / totalHandledByAnyAdmin : null,
        avgDaysToNextBooking: daysCount > 0 ? adminDaysToNextSum[admin] / daysCount : null,
      };
    }
  }

  return { byProvider, byAdmin };
}

/** Clients and Cases Report — new client / new case counts per provider. */
export function parseClientsAndCasesReport(text: string): ClientsAndCasesReportResult {
  const rows = parseCsvRows(text);
  const section = extractSection(rows, "Details");
  const byProvider: ClientsAndCasesReportResult["byProvider"] = {};
  if (!section) return { byProvider };

  for (const row of section.rows) {
    const r = rowToRecord(section.header, row);
    const provider = r["Provider"];
    if (!provider) continue;
    if (!byProvider[provider]) byProvider[provider] = { newClients: 0, newCases: 0 };
    if (r["New Client"]?.toLowerCase() === "yes") byProvider[provider].newClients += 1;
    if (r["New Case"]?.toLowerCase() === "yes") byProvider[provider].newCases += 1;
  }
  return { byProvider };
}

/**
 * Providers and Practice Report — three stacked tables. We only pull
 * fields with an unambiguous, Nookal-documented meaning (Completed
 * Consults, Unique Clients, Client/Case Visit Average, Forward Booking
 * "Booking Average", Total Sales). We deliberately do NOT attempt to
 * derive the Business Performance Report's BPC/NCVA/UCVA/AVV/TPR/UR/$/h/
 * ARR/CRR columns — their formulas aren't documented in the export and
 * guessing would risk silently wrong KPIs.
 */
export function parseProvidersAndPracticeReport(text: string): ProvidersAndPracticeReportResult {
  const rows = parseCsvRows(text);
  const byProvider: ProvidersAndPracticeReportResult["byProvider"] = {};

  const ensure = (provider: string) => {
    if (!byProvider[provider]) {
      byProvider[provider] = {
        completedConsults: null,
        uniqueClients: null,
        cva: null,
        caseVA: null,
        forwardBookingAverage: null,
        totalSales: null,
      };
    }
    return byProvider[provider];
  };

  const financial = extractSection(rows, "Financial Stats");
  if (financial) {
    // Quirk: Nookal's export includes a "Redemptions" header in this table
    // but omits that value from every data row (only the Total row keeps
    // full alignment), shifting later columns left by one. "Total Sales"
    // is always the last cell, so read positionally from the end rather
    // than by header name for this one field.
    for (const row of financial.rows) {
      const provider = row[0]?.trim();
      if (!provider) continue;
      ensure(provider).totalSales = parseNumber(row[row.length - 1]);
    }
  }

  const providerStats = extractSection(rows, "Provider Stats");
  if (providerStats) {
    for (const row of providerStats.rows) {
      const r = rowToRecord(providerStats.header, row);
      const provider = r["Provider"];
      if (!provider) continue;
      const entry = ensure(provider);
      entry.completedConsults = parseNumber(r["Completed Consults"]);
      entry.uniqueClients = parseNumber(r["Unique Clients"]);
      entry.cva = parseNumber(r["Client Visit Average"]);
      entry.caseVA = parseNumber(r["Case Visit Average"]);
    }
  }

  const forwardBooking = extractSection(rows, "Forward Booking Averages");
  if (forwardBooking) {
    for (const row of forwardBooking.rows) {
      const r = rowToRecord(forwardBooking.header, row);
      const provider = r["Provider"];
      if (!provider) continue;
      ensure(provider).forwardBookingAverage = parseNumber(r["Booking Average"]);
    }
  }

  return { byProvider };
}
