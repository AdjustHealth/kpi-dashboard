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

/**
 * Occupancy Report — per-provider scheduled vs. occupied minutes.
 *
 * Two real-world quirks, both confirmed against the director's own sheet
 * (which reports neither raw): a provider who saw zero patients that week
 * (services = 0 — on leave, block-booked-but-all-cancelled, etc.) gets a
 * meaningless raw Occupancy figure (Nookal still divides by whatever's on
 * the roster) — the sheet reports these as blank/not-tracked rather than a
 * number, so occupancyPct is null here too. A provider who DID see patients
 * can still read over 100% (occupied minutes exceeding scheduled minutes —
 * a Nookal roster/scheduling mismatch, not a real >100% occupancy) — the
 * sheet caps these at 100% instead of showing the inflated figure.
 */
export function parseOccupancyReport(text: string): OccupancyReportResult {
  const rows = parseCsvRows(text);
  const section = extractSection(rows, "Summary");
  const byProvider: OccupancyReportResult["byProvider"] = {};
  if (!section) return { byProvider };

  for (const row of section.rows) {
    const r = rowToRecord(section.header, row);
    const provider = r["Provider"];
    if (!provider) continue;
    const services = parseNumber(r["Services"]);
    let occupancyPct = parsePercent(r["Occupancy"]);
    if (!services) occupancyPct = null;
    else if (occupancyPct !== null && occupancyPct > 1) occupancyPct = 1;
    byProvider[provider] = {
      occupancyPct,
      scheduledMinutes: parseNumber(r["Scheduled Minutes"]),
      occupiedMinutes: parseNumber(r["Occupied"]),
      services,
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

// A recurring booking that was cancelled well before this reporting week
// (e.g. a client's whole plan cancelled a month ago) can still produce a
// "Cancelled" Details row for an appointment date that falls inside this
// week — Nookal doesn't remove the ghost slot from the diary. That's not a
// fresh cancellation event *this week*, it's last time's decision carrying
// through. Confirmed against the director's real weekly sheet: filtering
// out any row whose Modified Date is more than STALE_CANCEL_DAYS before its
// own Appointment Date (i.e. it was actioned well in advance, not reacted
// to this week) brought every provider within 0-2 of the sheet's real
// per-provider cancellation count, vs. wildly overcounting before (e.g. one
// provider read 37 raw vs. 20 on the sheet).
const STALE_CANCEL_DAYS = 14;

function isStaleCancellation(apptDate: Date | null, modifiedDate: Date | null): boolean {
  if (!apptDate || !modifiedDate) return false;
  const daysBeforeAppt = (apptDate.getTime() - modifiedDate.getTime()) / (1000 * 60 * 60 * 24);
  return daysBeforeAppt > STALE_CANCEL_DAYS;
}

/**
 * Cancellations Report. The Summary section's own per-provider Cancellations
 * count is Nookal's raw tally of every Details row, which — as above —
 * substantially overcounts a real week's cancellations, so counts here are
 * computed from Details instead: excluded rows (DNAs, bulk/whole-plan notes,
 * stale carry-through) are dropped, and what's left is grouped by client —
 * a client with several cancelled service-lines from the same underlying
 * decision (e.g. "flu, cancelling everything this week") is one cancellation
 * event, not one per line item. Per client: "rescheduled" if any of their
 * kept rows is RSX/RX-tagged by staff (the real "reschedule rate" signal —
 * a future Next Booking date alone doesn't mean staff "saved" it); else
 * "not rebooked" if none of their kept rows has any future booking at all;
 * "booked within 7 days" if any kept row was rebooked within 7 days of its
 * original appointment date.
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
        cancellations: 0,
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
    // Real (non-DNA, non-bulk, non-stale) rows, grouped by provider then by
    // client — the "one event per client" dedup described above.
    const providerClientRows: Record<string, Record<string, ReturnType<typeof rowToRecord>[]>> = {};
    // Same rows, grouped by "Modified User" (the admin who actioned it)
    // then by client — same one-event-per-client dedup, per admin.
    const adminClientRows: Record<string, Record<string, ReturnType<typeof rowToRecord>[]>> = {};

    for (const row of details.rows) {
      const r = rowToRecord(details.header, row);
      const provider = r["Provider"];
      const status = r["Status"];
      const note = r["Note"];
      const client = r["Client"];

      // DNAs are already counted from the Summary section's DNAs column —
      // they're a different event type from a cancellation.
      if (status !== "Cancelled" || !client) continue;
      if (isBulkCancelNote(note)) continue;
      const apptDate = parseNookalDate(r["Appointment Date"]);
      const modifiedDate = parseNookalDate(r["Modifed Date"]);
      if (isStaleCancellation(apptDate, modifiedDate)) continue;

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
        ((providerClientRows[provider] ??= {})[client] ??= []).push(r);
      }

      const admin = r["Modified User"];
      if (admin) ((adminClientRows[admin] ??= {})[client] ??= []).push(r);
    }

    const bookedWithin7 = (clientRows: ReturnType<typeof rowToRecord>[]): boolean =>
      clientRows.some((r) => {
        if (!r["Next Booking"]) return false;
        const apptDate = parseNookalDate(r["Appointment Date"]);
        const nextDate = parseNookalDate(r["Next Booking"]);
        if (!apptDate || !nextDate) return false;
        const daysBetween = (nextDate.getTime() - apptDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysBetween <= 7;
      });
    const daysToNext = (clientRows: ReturnType<typeof rowToRecord>[]): number | null => {
      const days = clientRows
        .filter((r) => r["Next Booking"])
        .map((r) => {
          const apptDate = parseNookalDate(r["Appointment Date"]);
          const nextDate = parseNookalDate(r["Next Booking"]);
          return apptDate && nextDate ? (nextDate.getTime() - apptDate.getTime()) / (1000 * 60 * 60 * 24) : null;
        })
        .filter((d): d is number => d !== null);
      if (days.length === 0) return null;
      return days.reduce((a, b) => a + b, 0) / days.length;
    };

    for (const [provider, clients] of Object.entries(providerClientRows)) {
      const entry = byProvider[provider];
      const clientEntries = Object.values(clients);
      const t = clientEntries.length;
      entry.cancellations = t;
      entry.eventsCount = t;
      for (const clientRows of clientEntries) {
        const rsx = clientRows.some((r) => RSX_NOTE_PATTERN.test((r["Note"] ?? "").trim()));
        const hasNext = clientRows.some((r) => Boolean(r["Next Booking"]));
        if (rsx) entry.rescheduledCount += 1;
        else if (!hasNext) entry.notRebooked += 1;
      }
      const within7Count = clientEntries.filter(bookedWithin7).length;
      entry.rescheduleRatePct = t > 0 ? entry.rescheduledCount / t : null;
      entry.notRebookedPct = t > 0 ? entry.notRebooked / t : null;
      entry.bookedWithin7DaysPct = t > 0 ? within7Count / t : null;
    }

    const totalHandledByAnyAdmin = Object.values(adminClientRows).reduce(
      (sum, clients) => sum + Object.keys(clients).length,
      0
    );

    for (const [admin, clients] of Object.entries(adminClientRows)) {
      const clientEntries = Object.values(clients);
      const t = clientEntries.length;
      let notRebooked = 0;
      let rescheduledCount = 0;
      for (const clientRows of clientEntries) {
        const rsx = clientRows.some((r) => RSX_NOTE_PATTERN.test((r["Note"] ?? "").trim()));
        const hasNext = clientRows.some((r) => Boolean(r["Next Booking"]));
        if (rsx) rescheduledCount += 1;
        else if (!hasNext) notRebooked += 1;
      }
      const within7Count = clientEntries.filter(bookedWithin7).length;
      const avgDays = clientEntries.map(daysToNext).filter((d): d is number => d !== null);
      byAdmin[admin] = {
        cancellationsHandled: t,
        notRebooked,
        rescheduledCount,
        rescheduleRatePct: t > 0 ? rescheduledCount / t : null,
        notRebookedPct: t > 0 ? notRebooked / t : null,
        bookedWithin7DaysPct: t > 0 ? within7Count / t : null,
        pctOfTotalClinicCx: totalHandledByAnyAdmin > 0 ? t / totalHandledByAnyAdmin : null,
        avgDaysToNextBooking: avgDays.length > 0 ? avgDays.reduce((a, b) => a + b, 0) / avgDays.length : null,
      };
    }
  }

  return { byProvider, byAdmin };
}

// Corporate Pre-Employment screening visits (Village Road Show, Top Golf,
// etc.) show up as "New Client: Yes" in Nookal like any other new client,
// but they're one-off screenings, not a real new patient booking — the
// director's own weekly sheet counts them in the clinic-wide total ("Total
// new clients incl Pre Employments") but excludes them from every
// individual provider's "# New Clients" figure. Confirmed against two
// providers' real weekly numbers (both matched exactly once Pre-Employment
// cases were excluded, and not before).
const PRE_EMPLOYMENT_PATTERN = /pre[\s-]?employment/i;

// "Bookings" cells read like "2 Complete / 7 Total" — the second number is
// this client's total recommended/scheduled appointment count, the input to
// New Patient Booking Rate (see ClientsAndCasesReportResult.npbrRecommendationsTotal).
const BOOKINGS_TOTAL_PATTERN = /\/\s*(\d+)\s*Total/i;

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
    if (!byProvider[provider]) {
      byProvider[provider] = { newClients: 0, newClientsExclPreEmployment: 0, newCases: 0, npbrRecommendationsTotal: 0 };
    }
    if (r["New Client"]?.toLowerCase() === "yes") {
      byProvider[provider].newClients += 1;
      if (!PRE_EMPLOYMENT_PATTERN.test(r["Case"] ?? "")) {
        byProvider[provider].newClientsExclPreEmployment += 1;
        const bookingsMatch = BOOKINGS_TOTAL_PATTERN.exec(r["Bookings"] ?? "");
        if (bookingsMatch) byProvider[provider].npbrRecommendationsTotal += Number(bookingsMatch[1]);
      }
    }
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
