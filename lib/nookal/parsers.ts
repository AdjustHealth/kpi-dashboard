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
  BusinessPerformanceReportResult,
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
 * Clinic-wide specialty consult categories from the director's own
 * "SPECIALTY SERVICES CONSULTATIONS" tracker — matched against the same
 * Case/Item text as JBV, independent of which provider saw the client.
 * Women's Health has no CSV source on the director's sheet (tracked
 * manually), so it isn't here.
 */
const SPECIALTY_CATEGORY_PATTERNS: Record<string, RegExp> = {
  vestibular: /vestib/i,
  headaches: /headache|tmj/i,
  paeds: /paed|pediatric/i,
};

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
    specialtyCounts: Object.fromEntries(
      Object.keys(SPECIALTY_CATEGORY_PATTERNS).map((key) => [key, { total: 0, initial: 0, sub: 0 }])
    ),
  };
  const section = extractSection(rows, "Details");
  if (!section) return empty;

  const revenueByProvider: Record<string, number> = {};
  const revenueByPayerCategory: Record<PayerCategory, number> = { ...EMPTY_PAYER_TOTALS };
  let jbvInitialCount = 0;
  let jbvSubCount = 0;
  const keywordCountsByProvider: Record<string, Record<string, number>> = {};
  for (const name of Object.keys(keywordPatterns)) keywordCountsByProvider[name] = {};
  const specialtyCounts: Record<string, { total: number; initial: number; sub: number }> = Object.fromEntries(
    Object.keys(SPECIALTY_CATEGORY_PATTERNS).map((key) => [key, { total: 0, initial: 0, sub: 0 }])
  );

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

    for (const [key, pattern] of Object.entries(SPECIALTY_CATEGORY_PATTERNS)) {
      if (!pattern.test(itemText)) continue;
      specialtyCounts[key].total += 1;
      if (JBV_SUB_PATTERN.test(itemText)) specialtyCounts[key].sub += 1;
      else if (JBV_INIT_PATTERN.test(itemText)) specialtyCounts[key].initial += 1;
    }

    if (provider) {
      for (const [name, pattern] of Object.entries(keywordPatterns)) {
        if (pattern.test(itemText)) {
          keywordCountsByProvider[name][provider] = (keywordCountsByProvider[name][provider] ?? 0) + 1;
        }
      }
    }
  }

  return {
    totalRevenue,
    revenueByProvider,
    revenueByPayerCategory,
    jbvInitialCount,
    jbvSubCount,
    keywordCountsByProvider,
    specialtyCounts,
  };
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

// A cancellation's Note field starting with "RSX"/"RX" is staff explicitly
// tagging it as a rescheduled/"saved" cancellation — the real business
// definition of "Reschedule Rate (Save Rate)", confirmed against a working
// reference tool built directly off the director's own note conventions.
// Just having a future Next Booking date is NOT the same thing (a client
// can have a future appointment already on the books without this specific
// cancellation having been "saved" by staff intervention).
const RSX_NOTE_PATTERN = /^rs[x]?\b|^rx\b/i;

// Notes matching these patterns mean the whole booking plan was cancelled
// in bulk (e.g. a client leaving, or an admin bulk action) — Nookal can
// produce one Details row per future appointment in that plan, which would
// wildly overcount "this week's cancellations" if each row were counted as
// a real, individual cancellation event.
const BULK_CANCEL_NOTE_PATTERNS = [
  /plan\s*cancel/i,
  /plan\s*cx/i,
  /bulk\s*cancel/i,
  /bulk\s*cx/i,
  /cnx\s*all\b/i,
  /cancel\s*all\b/i,
  /(cnx|cx|cancel)\s*all\s*apps?\s*up\s*to/i,
  /take\s*out\s*all\s*(remaining|future)/i,
];

function isBulkCancelNote(note: string | undefined): boolean {
  const n = (note ?? "").trim();
  if (!n) return false;
  return BULK_CANCEL_NOTE_PATTERNS.some((re) => re.test(n));
}

/**
 * Cancellations Report — the Summary gives per-provider counts/percentages
 * directly from Nookal. The Details rows (one per cancelled/DNA event) are
 * used to compute "Not Rebooked" and "Reschedule Rate": a cancellation
 * counts toward the reschedule rate ("saved") only when staff tagged its
 * Note "RSX"/"RX"; it counts as Not Rebooked only when it has no future
 * Next Booking at all. Rows whose Note indicates a bulk/whole-plan
 * cancellation are excluded entirely (see BULK_CANCEL_NOTE_PATTERNS) so
 * they don't inflate this week's real cancellation count. "Booked within 7
 * Days" is the share of all (non-excluded) cancellations that were
 * rebooked within 7 days of the original appointment date.
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
        notRebookedPct: null,
        rescheduledCount: 0,
        rescheduleRatePct: null,
        bookedWithin7DaysPct: null,
        eventsCount: 0,
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
      const status = r["Status"];
      const note = r["Note"];

      // DNAs are already counted from the Summary section's DNAs column —
      // they're a different event type from a cancellation and shouldn't
      // also feed reschedule/not-rebooked rates.
      if (status !== "Cancelled") continue;
      // A whole-plan bulk cancellation can produce one row per future
      // appointment in Nookal's export — counting every one as a distinct
      // cancellation this week would wildly overcount.
      if (isBulkCancelNote(note)) continue;

      const nextBooking = r["Next Booking"];
      const apptDate = parseNookalDate(r["Appointment Date"]);
      const nextDate = nextBooking ? parseNookalDate(nextBooking) : null;
      const daysBetween = apptDate && nextDate ? (nextDate.getTime() - apptDate.getTime()) / (1000 * 60 * 60 * 24) : null;
      const hasNext = Boolean(nextBooking);
      const rsx = RSX_NOTE_PATTERN.test((note ?? "").trim());

      if (provider) {
        if (!byProvider[provider]) {
          byProvider[provider] = {
            cancellations: 0,
            dnas: 0,
            completed: null,
            cancellationPct: null,
            dnaPct: null,
            notRebooked: 0,
            notRebookedPct: null,
            rescheduledCount: 0,
            rescheduleRatePct: null,
            bookedWithin7DaysPct: null,
            eventsCount: 0,
          };
        }
        total[provider] = (total[provider] ?? 0) + 1;
        if (rsx) byProvider[provider].rescheduledCount += 1;
        else if (!hasNext) byProvider[provider].notRebooked += 1;
        // else: has a future booking but wasn't explicitly tagged RSX/RX —
        // counts toward this week's cancellations, but not toward either
        // the reschedule rate or the not-rebooked rate.
        if (hasNext && daysBetween !== null && daysBetween <= 7) {
          rebookedWithin7[provider] = (rebookedWithin7[provider] ?? 0) + 1;
        }
      }

      const admin = r["Modified User"];
      if (admin) {
        adminTotal[admin] = (adminTotal[admin] ?? 0) + 1;
        totalHandledByAnyAdmin += 1;
        if (rsx) adminRescheduled[admin] = (adminRescheduled[admin] ?? 0) + 1;
        else if (!hasNext) adminNotRebooked[admin] = (adminNotRebooked[admin] ?? 0) + 1;
        if (hasNext && daysBetween !== null) {
          adminDaysToNextSum[admin] = (adminDaysToNextSum[admin] ?? 0) + daysBetween;
          adminDaysToNextCount[admin] = (adminDaysToNextCount[admin] ?? 0) + 1;
          if (daysBetween <= 7) adminRebookedWithin7[admin] = (adminRebookedWithin7[admin] ?? 0) + 1;
        }
      }
    }

    for (const provider of Object.keys(byProvider)) {
      const t = total[provider];
      if (!t) continue;
      byProvider[provider].rescheduleRatePct = byProvider[provider].rescheduledCount / t;
      byProvider[provider].notRebookedPct = byProvider[provider].notRebooked / t;
      byProvider[provider].bookedWithin7DaysPct = (rebookedWithin7[provider] ?? 0) / t;
      byProvider[provider].eventsCount = t;
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

/**
 * Business Performance Report — single "Details" table, one row per
 * provider: Provider, BPC, LTVC, NCVA, UCVA, AVV, TPR, UR, $/h, ARR, CRR.
 * We only read NCVA/UCVA/TPR (the KPI Scorecard's UCVA/NCVA/TPR row) —
 * BPC/LTVC/AVV/UR/$/h/ARR/CRR aren't tracked anywhere yet. Nookal's own
 * payer-exclusion filter (Village/Top Golf/Move OT, excl Pre Employments)
 * is applied when the report is generated in Nookal itself, based on the
 * Parameters section's Payers list — nothing further to exclude here.
 */
export function parseBusinessPerformanceReport(text: string): BusinessPerformanceReportResult {
  const rows = parseCsvRows(text);
  const byProvider: BusinessPerformanceReportResult["byProvider"] = {};

  const section = extractSection(rows, "Details");
  if (!section) return { byProvider };

  for (const row of section.rows) {
    const r = rowToRecord(section.header, row);
    const provider = r["Provider"];
    if (!provider) continue;
    byProvider[provider] = {
      ncva: parseNumber(r["NCVA"]),
      ucva: parseNumber(r["UCVA"]),
      tpr: parseNumber(r["TPR"]),
    };
  }

  return { byProvider };
}
