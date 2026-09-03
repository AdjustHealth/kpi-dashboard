import { describe, expect, it } from "vitest";
import {
  parseActivityReport,
  parseAgedDebtorsReport,
  parseBusinessPerformanceReport,
  parseCancellationsReport,
  parseClientsAndCasesReport,
  parseOccupancyReport,
  parseProvidersAndPracticeReport,
  isRescheduleNote,
  isCancellationExcludedFromStats,
} from "@/lib/nookal/parsers";
import { categorizePayer } from "@/lib/nookal/payerCategories";
import { parseNookalDate, parsePercent, parseNumber, extractSection, parseCsvRows } from "@/lib/nookal/csv";

// Fixtures below mirror the exact structure of real Nookal exports
// (multi-line tooltip headers, stacked sections, Total rows) but use
// fictional names/data — never commit real client data to this repo.

const OCCUPANCY_CSV = `Occupancy Report

Parameters
Dates,29/06/2026 - 05/07/2026
Locations,All Locations

Summary
Provider,Days,"
                Scheduled Minutes

                    Scheduled Minutes
                    (Scheduled Time - Scheduled Breaks)

            ",Occupied,Occupancy,Services,Classes
Alex Example,7,2160,1770,81.94%,39,2
Jamie Sample,7,1950,1710,87.69%,42,2
Sam Zero,7,0,0,0%,0,0
Robin Overbooked,7,1200,3180,265.00%,12,0
Total,,5310,6660,,93,2

`;

const CANCELLATIONS_CSV = `Cancellations Report

Parameters
Dates,29/06/2026 - 05/07/2026

Summary
Provider,Cancellations,DNAs,Completed,Cancellation %,DNA %,Total %
Alex Example,2,1,10,15.38%,7.69%,23.08%
Total,2,1,10,,,

Details
Appointment Date,Location,Client,Phone,Provider,Case,Type,Status,Last Attendance,Next Booking,Note,Modifed Date,Modified Time,Modified User,Client ID
01/07/2026,Adjust Physiotherapy,Test Client One,0400 000 001,Alex Example,Private - Physio,Service,Cancelled,2026-06-01 10:00:00,2026-07-08 09:00:00,rsx moved to next week,01/07/2026,9:00am,Staff One,1001
02/07/2026,Adjust Physiotherapy,Test Client Two,0400 000 002,Alex Example,Private - Physio,Service,Cancelled,2026-06-02 10:00:00,,no rebook needed,02/07/2026,9:00am,Staff One,1002
03/07/2026,Adjust Physiotherapy,Test Client Three,0400 000 003,Alex Example,Private - Physio,Service,Cancelled,2026-06-03 10:00:00,2026-07-20 09:00:00,will call to rebook,03/07/2026,9:00am,Staff One,1003
04/07/2026,Adjust Physiotherapy,Test Client Four,0400 000 004,Alex Example,Private - Physio,Service,Did Not Arrive,2026-06-04 10:00:00,,dna,04/07/2026,9:00am,Staff One,1004
05/07/2026,Adjust Physiotherapy,Test Client Five,0400 000 005,Alex Example,Private - Physio,Service,Cancelled,2026-06-05 10:00:00,,plan cancelled - client left,05/07/2026,9:00am,Staff One,1005
03/07/2026,Adjust Physiotherapy,Test Client Six,0400 000 006,Alex Example,Private - Physio,Service,Cancelled,2026-01-01 10:00:00,,stale carry-through — plan was cancelled months ago,01/01/2026,9:00am,Staff One,1006
04/07/2026,Adjust Physiotherapy,Test Client One,0400 000 001,Alex Example,Private - Physio,Service,Cancelled,2026-06-01 10:00:00,,second service for the same client this week,04/07/2026,9:00am,Staff One,1001

`;

const CLIENTS_AND_CASES_CSV = `Clients and Cases Report

Parameters
Dates,29/06/2026 - 05/07/2026

Details
Client,Case,Payer,Location,New Client,New Case,Registration Form,Initial,Provider,Next,Bookings,Email,Receive Email,Mobile,Receive SMS,Followed-up,Client ID
Test Client One,Private - Physio,Private,Adjust Physiotherapy,Yes,Yes,No,29/06/2026,Alex Example,15/07/2026,1 Complete / 2 Total,a@example.com,No,0400 000 001,Yes,No,1001
Test Client Two,Medicare 2026,Medicare,Adjust Physiotherapy,No,Yes,No,30/06/2026,Alex Example,,1 Complete / 1 Total,b@example.com,No,0400 000 002,Yes,No,1002
Test Client Three,NDIS - Plan Managed,Provider Choice,Adjust Physiotherapy,Yes,Yes,No,01/07/2026,Jamie Sample,,1 Complete / 1 Total,c@example.com,No,0400 000 003,Yes,No,1003
Test Client Four,Village - Pre-Employment,Village Road Show Theme Parks Pty Ltd,Adjust Physiotherapy,Yes,Yes,No,01/07/2026,Alex Example,,1 Complete / 1 Total,d@example.com,No,0400 000 004,Yes,No,1004

`;

const ACTIVITY_CSV = `Activity Report

Parameters
Dates,29/06/2026 - 05/07/2026

Summary
Type,Subtotal,Tax,Total
Services,300.00,0,300.00
Classes,20.00,0,20.00
Total,320.00,0,320.00

Details
Date,Staff,Location,Client,Case,Item,Type,Invoice,Invoice Date,Invoice Type,Account Code,Net,Discount,GST,Amount,Nominal,Client ID
01/07/2026,Alex Example,Adjust Physiotherapy,Test Client One,Private - Physio,Private Subs,Service,1001,01/07/2026,Private,,110.00,0.00,0.00,110.00,0.00,1001
02/07/2026,Alex Example,Adjust Physiotherapy,Test Client Two,Medicare 2026,EPC Subs,Service,1002,02/07/2026,Medicare,,110.00,0.00,0.00,110.00,0.00,1002
03/07/2026,Jamie Sample,Adjust Physiotherapy,Test Client Three,DVA Consult,DVA Subs,Service,1003,03/07/2026,Department of Veterans Affairs,,80.00,0.00,0.00,80.00,0.00,1003

`;

const PROVIDERS_AND_PRACTICE_CSV = `Providers and Practice Report

Parameters
Dates,29/06/2026 - 05/07/2026

Financial Stats
Provider,Services,Classes,Inventory,Passes,"
                    Redemptions

                        Redemptions

                        Calculated with Pass Nominal Values.
                    ",Other,"
                    Average Transaction

                        Average Transaction

                        The average invoice amount

                ","
                    Average Client Spend

                        Average Client Spend

                        The average amount a patient spent

                ",Total Sales
Alex Example,3510.40,0.0000,0.0000,0.0000,0.0000,85.62,92.38,3510.40
Total,3510.40,0,0,0,,85.62,92.38,3510.40

Provider Stats
Provider,Services,"
                    Completed Consults

                        Completed Consults

                        Services where an invoice has been generated.

                ",Unique Clients,New Clients,New Cases,"
                    Client Visit Average

                        Client Visit Average

                        Client Visit Average = (Services / Unique Client).

                ","
                    Case Visit Average

                        Case Visit Average

                        Case Visit Average = (Services / Cases).

                ",Classes,Participants,Completed Classes
Alex Example,36,36,33,1,3,1.09,1.09,2,5,5
Total,36,36,33,1,3,,,2,5,5

Forward Booking Averages
Provider,Total Appointments,Total Clients,"
                    Booking Average

                        Booking Average

                        The average number of times a patient makes an appointment

                ",Total Classes,Total Class Clients,"
                    Class Booking Average

                        Class Booking Average

                        The average number of class participants

                "
Alex Example,313,79,3.96,0,0,0.00
Total,313,79,,0,0,

`;

describe("nookal csv helpers", () => {
  it("parsePercent converts '81.94%' to a 0-1 fraction", () => {
    expect(parsePercent("81.94%")).toBeCloseTo(0.8194, 4);
    expect(parsePercent("")).toBeNull();
    expect(parsePercent(undefined)).toBeNull();
  });

  it("parseNumber strips thousands separators", () => {
    expect(parseNumber("1,234.56")).toBeCloseTo(1234.56, 2);
    expect(parseNumber("")).toBeNull();
  });

  it("parseNookalDate reads DD/MM/YYYY (Appointment Date, Modifed Date)", () => {
    const d = parseNookalDate("08/07/2026");
    expect(d?.getUTCFullYear()).toBe(2026);
    expect(d?.getUTCMonth()).toBe(6); // 0-indexed -> July
    expect(d?.getUTCDate()).toBe(8);
  });

  it("parseNookalDate also reads YYYY-MM-DD with a time component (Last Attendance, Next Booking use this format in real exports)", () => {
    const d = parseNookalDate("2026-07-08 10:30:00");
    expect(d?.getUTCFullYear()).toBe(2026);
    expect(d?.getUTCMonth()).toBe(6);
    expect(d?.getUTCDate()).toBe(8);
  });

  it("extractSection finds a named section and stops before the Total row", () => {
    const rows = parseCsvRows(OCCUPANCY_CSV);
    const section = extractSection(rows, "Summary");
    expect(section?.rows.length).toBe(4);
    expect(section?.rows.every((r) => r[0] !== "Total")).toBe(true);
  });
});

describe("categorizePayer", () => {
  it("matches the 6 Revenue-page buckets", () => {
    expect(categorizePayer("Private")).toBe("private");
    expect(categorizePayer("Medicare")).toBe("medicare");
    expect(categorizePayer("Department of Veterans Affairs")).toBe("dva");
    expect(categorizePayer("Workcover QLD")).toBe("workcover");
    expect(categorizePayer("My Plan Manager")).toBe("ndis");
    expect(categorizePayer("Some Random Law Firm")).toBe("other");
    expect(categorizePayer(undefined)).toBe("other");
  });
});

describe("parseOccupancyReport", () => {
  it("reads occupancy % and minutes per provider, handling the multi-line header", () => {
    const result = parseOccupancyReport(OCCUPANCY_CSV);
    expect(result.byProvider["Alex Example"].occupancyPct).toBeCloseTo(0.8194, 4);
    expect(result.byProvider["Alex Example"].scheduledMinutes).toBe(2160);
    expect(result.byProvider["Alex Example"].occupiedMinutes).toBe(1770);
    expect(result.byProvider["Jamie Sample"].occupancyPct).toBeCloseTo(0.8769, 4);
  });

  it("treats occupancy as not-tracked (null) when a provider saw zero patients that week, rather than Nookal's misleading 0%", () => {
    const result = parseOccupancyReport(OCCUPANCY_CSV);
    expect(result.byProvider["Sam Zero"].occupancyPct).toBeNull();
    expect(result.byProvider["Sam Zero"].services).toBe(0);
  });

  it("caps occupancy at 100% instead of the raw >100% figure a roster/schedule mismatch can produce in Nookal", () => {
    const result = parseOccupancyReport(OCCUPANCY_CSV);
    expect(result.byProvider["Robin Overbooked"].occupancyPct).toBe(1);
  });
});

describe("isRescheduleNote", () => {
  it("treats a bare rsx/rx tag as a real reschedule", () => {
    expect(isRescheduleNote("rsx")).toBe(true);
    expect(isRescheduleNote("rsx to Thurs 3.30pm")).toBe(true);
  });

  it("does not count 'no rsx' as a reschedule — a flat negation, not a confirmed one", () => {
    expect(isRescheduleNote("no rsx")).toBe(false);
    expect(isRescheduleNote("no rx")).toBe(false);
    // The real Kelly White note that missed this case.
    expect(
      isRescheduleNote(
        "Kelly White cnx mother called to book on his behalf but has just checked with him and he has too much on his plate and doesn't want to commit to this, no rsx, follow up necessary, brand new patient"
      )
    ).toBe(false);
  });

  it("still catches the other established negation phrasings", () => {
    expect(isRescheduleNote("declined rsx")).toBe(false);
    expect(isRescheduleNote("can't rsx")).toBe(false);
    expect(isRescheduleNote("not able to rsx")).toBe(false);
    expect(isRescheduleNote("offered a rsx")).toBe(false);
    expect(isRescheduleNote("will call back tomorrow to rsx")).toBe(false);
  });
});

describe("parseCancellationsReport", () => {
  it("takes DNAs/completed/percentages from Summary, but computes cancellations itself from Details (Summary's raw count overcounts real events)", () => {
    const result = parseCancellationsReport(CANCELLATIONS_CSV);
    expect(result.byProvider["Alex Example"].dnas).toBe(1);
    expect(result.byProvider["Alex Example"].cancellationPct).toBeCloseTo(0.1538, 3);
    // Summary says "2", but that's Nookal's raw Details row count. The real
    // per-client event count (see the "derives not-rebooked..." test below
    // for the row-by-row breakdown) is 3.
    expect(result.byProvider["Alex Example"].cancellations).toBe(3);
  });

  it("derives not-rebooked / reschedule rate / booked-within-7-days from Details — RSX-tagged notes only, DNA/bulk-cancel/stale rows excluded, same-client rows deduped", () => {
    const result = parseCancellationsReport(CANCELLATIONS_CSV);
    const alex = result.byProvider["Alex Example"];
    // 7 Details rows, but only 3 real per-client events for the rate denominator:
    //   row1+row7: "Test Client One", 2 rows (a second service cancelled the same week) -> 1 event, not 2.
    //     row1: "rsx moved to next week", next booking 01/07->08/07 (7 days) -> the RSX tag makes the whole
    //           client count as rescheduled + booked-within-7 (Next Booking is in real Nookal's actual
    //           YYYY-MM-DD format here, not DD/MM/YYYY like Appointment Date — parseNookalDate must handle
    //           both or this silently reads as "no next booking")
    //     row7: no RSX tag, no next booking -> doesn't change the client's rescheduled verdict (RSX wins)
    //   row2 "Test Client Two": "no rebook needed", no next booking -> counts as not rebooked
    //   row3 "Test Client Three": "will call to rebook", HAS a next booking (03/07->20/07) but isn't
    //     RSX-tagged -> counts toward the denominator only, not toward either rescheduled or not-rebooked
    //     (matches the real per-provider sheet, where RSX% + NR% never add to 100%)
    //   row4: Did Not Arrive -> excluded (DNAs come from Summary, not this rate)
    //   row5: "plan cancelled" -> excluded (bulk/whole-plan cancellation, not a real single event)
    //   row6 "Test Client Six": modified 01/01/2026 for a 03/07/2026 appointment, >14 days apart -> excluded
    //     as a stale, already-actioned cancellation just carrying through to this week's diary
    expect(alex.eventsCount).toBe(3);
    expect(alex.notRebooked).toBe(1);
    expect(alex.rescheduledCount).toBe(1);
    expect(alex.rescheduleRatePct).toBeCloseTo(1 / 3, 4);
    expect(alex.notRebookedPct).toBeCloseTo(1 / 3, 4);
    expect(alex.bookedWithin7DaysPct).toBeCloseTo(1 / 3, 4);
  });

  it("recognises RSX/RX tags written inline or bare, but excludes declined/offered/planned-not-done phrasing", () => {
    const csv = `Cancellations Report

Parameters
Dates,13/07/2026 - 19/07/2026

Summary
Provider,Cancellations,DNAs,Completed,Cancellation %,DNA %,Total %
Jordan Real,3,0,10,,,

Details
Appointment Date,Location,Client,Phone,Provider,Case,Type,Status,Last Attendance,Next Booking,Note,Modifed Date,Modified Time,Modified User,Client ID
13/07/2026,Adjust Physiotherapy,Client Inline,0400 000 010,Jordan Real,Private - Physio,Service,Cancelled,2026-07-06 10:00:00,,Client Inline rsx to Thurs 3.30pm,13/07/2026,9:00am,Staff Two,2001
14/07/2026,Adjust Physiotherapy,Client Declined,0400 000 011,Jordan Real,Private - Physio,Service,Cancelled,2026-07-07 10:00:00,,Client Declined cnx doesn't want to rsx,14/07/2026,9:00am,Staff Two,2002
15/07/2026,Adjust Physiotherapy,Client Bare Rx,0400 000 012,Jordan Real,Private - Physio,Service,Cancelled,2026-07-08 10:00:00,,rsx,15/07/2026,9:00am,Staff Two,2003
16/07/2026,Adjust Physiotherapy,Client Offered,0400 000 013,Jordan Real,Private - Physio,Service,Cancelled,2026-07-09 10:00:00,,Client Offered cnx via sms replied back offering rsx,16/07/2026,9:00am,Staff Two,2004
17/07/2026,Adjust Physiotherapy,Client Cant,0400 000 014,Jordan Real,Private - Physio,Service,Cancelled,2026-07-10 10:00:00,,Client Cant cnx busy with work can't rsx any sooner,17/07/2026,9:00am,Staff Two,2005
18/07/2026,Adjust Physiotherapy,Client Planned,0400 000 015,Jordan Real,Private - Physio,Service,Cancelled,2026-07-11 10:00:00,,Client Planned cnx mum will call back tomorrow to rsx,18/07/2026,9:00am,Staff Two,2006
18/07/2026,Adjust Physiotherapy,Client Lm,0400 000 016,Jordan Real,Private - Physio,Service,Cancelled,2026-07-11 10:00:00,,Client Lm cnx via sms lm to rsx to Tuesday,18/07/2026,9:00am,Staff Two,2007

`;
    const result = parseCancellationsReport(csv);
    const jordan = result.byProvider["Jordan Real"];
    expect(jordan.eventsCount).toBe(7);
    // "rsx to Thurs 3.30pm" (confirmed, day named after the tag) and a bare "rsx" with nothing
    // else both count — the director confirmed a bare tag is still a real (if terse) reschedule
    // note, not a placeholder. Everything else here is a real phrasing pulled from the 18/7
    // data that must NOT count despite containing "rsx": "doesn't want to rsx" (decline),
    // "offering rsx" (an offer, not a confirmed outcome), "can't rsx any sooner" (decline
    // without "not able"/"want to" wording), and "to rsx" as an infinitive — "will call back
    // tomorrow TO rsx" / "lm TO rsx to Tuesday" — where "to" sits before the tag, meaning
    // "planning to", the opposite of "rsx to Thurs" where "to" names the day after the tag.
    expect(jordan.rescheduledCount).toBe(2);
    expect(jordan.notRebooked).toBe(5);
  });

  it("excludes HotDoc placeholder rows from cancellation stats, matched on either Case or Client", () => {
    const csv = `Cancellations Report

Parameters
Dates,13/07/2026 - 19/07/2026

Summary
Provider,Cancellations,DNAs,Completed,Cancellation %,DNA %,Total %
Jordan Real,3,0,10,,,

Details
Appointment Date,Location,Client,Phone,Provider,Case,Type,Status,Last Attendance,Next Booking,Note,Modifed Date,Modified Time,Modified User,Client ID
13/07/2026,Adjust Physiotherapy,Real Client,0400 000 020,Jordan Real,Private - Physio,Service,Cancelled,2026-07-06 10:00:00,,no rebook needed,13/07/2026,9:00am,Staff Two,3001
14/07/2026,Adjust Physiotherapy,Real Client Two,0400 000 021,Jordan Real,HotDoc Widget Booking,Service,Cancelled,2026-07-07 10:00:00,,no rebook needed,14/07/2026,9:00am,Staff Two,3002
15/07/2026,Adjust Physiotherapy,HotDoc Placeholder,0400 000 022,Jordan Real,Private - Physio,Service,Cancelled,2026-07-08 10:00:00,,no rebook needed,15/07/2026,9:00am,Staff Two,3003

`;
    const result = parseCancellationsReport(csv);
    const jordan = result.byProvider["Jordan Real"];
    expect(jordan.eventsCount).toBe(1);
    expect(jordan.cancellations).toBe(1);
  });

  it("accepts an injected isReschedule classifier (e.g. the LLM classifier) instead of the regex default", () => {
    const csv = `Cancellations Report

Parameters
Dates,13/07/2026 - 19/07/2026

Summary
Provider,Cancellations,DNAs,Completed,Cancellation %,DNA %,Total %
Jordan Real,1,0,10,,,

Details
Appointment Date,Location,Client,Phone,Provider,Case,Type,Status,Last Attendance,Next Booking,Note,Modifed Date,Modified Time,Modified User,Client ID
13/07/2026,Adjust Physiotherapy,Client One,0400 000 010,Jordan Real,Private - Physio,Service,Cancelled,2026-07-06 10:00:00,,some note the regex would say no to,13/07/2026,9:00am,Staff Two,2001

`;
    // A classifier that says yes to everything, regardless of what the regex would say —
    // proves parseCancellationsReport actually defers to the injected function.
    const result = parseCancellationsReport(csv, () => true);
    expect(result.byProvider["Jordan Real"].rescheduledCount).toBe(1);
  });

  it("reads the client name from a 'Patient' column too — Nookal renamed Details' 'Client' column to 'Patient' in an 08/2026 export, which silently zeroed every cancellation until this was caught", () => {
    const csv = `Cancellations Report

Parameters
Dates,03/08/2026 - 09/08/2026

Summary
Provider,Cancellations,DNAs,Completed,Cancellation %,DNA %,Total %
Jordan Real,1,0,10,,,

Details
Appointment Date,Location,Patient,Phone,Provider,Case,Type,Status,Last Attendance,Next Booking,Note,Modifed Date,Modified Time,Modified User,Client ID
13/07/2026,Adjust Physiotherapy,Client One,0400 000 010,Jordan Real,Private - Physio,Service,Cancelled,2026-07-06 10:00:00,,no future booking,13/07/2026,9:00am,Staff Two,2001

`;
    const result = parseCancellationsReport(csv);
    expect(result.byProvider["Jordan Real"].cancellations).toBe(1);
    expect(result.byProvider["Jordan Real"].notRebooked).toBe(1);
    expect(result.detailRows).toHaveLength(1);
    expect(result.detailRows[0].client).toBe("Client One");
  });
});

describe("parseClientsAndCasesReport", () => {
  it("counts new clients and new cases per provider", () => {
    const result = parseClientsAndCasesReport(CLIENTS_AND_CASES_CSV);
    expect(result.byProvider["Alex Example"].newClients).toBe(2);
    expect(result.byProvider["Alex Example"].newCases).toBe(3);
    expect(result.byProvider["Jamie Sample"].newClients).toBe(1);
  });

  it("excludes Pre-Employment screening cases from the per-provider new-client count, but keeps them in the raw newClients total", () => {
    // Confirmed against the director's real weekly sheet: two providers with
    // Pre-Employment (Village Road Show / Top Golf) cases that week both
    // matched exactly only once those cases were excluded from their
    // individual "# New Clients" figure — the clinic-wide total still
    // includes them ("Total new clients incl Pre Employments").
    const result = parseClientsAndCasesReport(CLIENTS_AND_CASES_CSV);
    expect(result.byProvider["Alex Example"].newClients).toBe(2);
    expect(result.byProvider["Alex Example"].newClientsExclPreEmployment).toBe(1);
    expect(result.byProvider["Jamie Sample"].newClientsExclPreEmployment).toBe(1);
  });

  it("sums each new client's Bookings 'Total' count for New Patient Booking Rate, excluding Pre-Employment rows", () => {
    // Test Client One: new, non-Pre-Employment, "1 Complete / 2 Total" -> +2.
    // Test Client Two: not a new client -> excluded entirely.
    // Test Client Four: new, but Pre-Employment -> excluded from the sum too.
    const result = parseClientsAndCasesReport(CLIENTS_AND_CASES_CSV);
    expect(result.byProvider["Alex Example"].npbrRecommendationsTotal).toBe(2);
    expect(result.byProvider["Jamie Sample"].npbrRecommendationsTotal).toBe(1);
  });
});

describe("parseActivityReport", () => {
  it("reads totalRevenue from the Summary's Total row, not a sum of Details (Details excludes Classes/Inventory)", () => {
    const result = parseActivityReport(ACTIVITY_CSV);
    expect(result.totalRevenue).toBeCloseTo(320, 2); // Summary total (300 Services + 20 Classes)
  });

  it("collects every distinct client name seen this week, for New Patient Retention", () => {
    const result = parseActivityReport(ACTIVITY_CSV);
    expect(result.clientsSeenNames.sort()).toEqual(["Test Client One", "Test Client Three", "Test Client Two"]);
  });

  it("reads the client name from a 'Patient' column too — same Nookal rename as the Cancellations Report", () => {
    const csv = `Activity Report

Parameters
Dates,03/08/2026 - 09/08/2026

Summary
Type,Subtotal,Tax,Total
Services,110.00,0,110.00
Total,110.00,0,110.00

Details
Date,Staff,Location,Patient,Case,Item,Type,Invoice,Invoice Date,Invoice Type,Account Code,Net,Discount,GST,Amount,Nominal,Client ID
01/07/2026,Alex Example,Adjust Physiotherapy,Renamed Column Client,Private - Physio,Private Subs,Service,1001,01/07/2026,Private,,110.00,0.00,0.00,110.00,0.00,1001

`;
    const result = parseActivityReport(csv);
    expect(result.clientsSeenNames).toEqual(["Renamed Column Client"]);
  });

  it("sums revenue per provider and per payer category from Details (Services only)", () => {
    const result = parseActivityReport(ACTIVITY_CSV);
    expect(result.revenueByProvider["Alex Example"]).toBeCloseTo(220, 2);
    expect(result.revenueByProvider["Jamie Sample"]).toBeCloseTo(80, 2);
    expect(result.revenueByPayerCategory.private).toBeCloseTo(110, 2);
    expect(result.revenueByPayerCategory.medicare).toBeCloseTo(110, 2);
    expect(result.revenueByPayerCategory.dva).toBeCloseTo(80, 2);
  });

  it("has no JBV rows in a file with no JBV items", () => {
    const result = parseActivityReport(ACTIVITY_CSV);
    expect(result.jbvInitialCount).toBe(0);
    expect(result.jbvSubCount).toBe(0);
  });

  it("has no 3rd party gym revenue in a file with no gym items", () => {
    const result = parseActivityReport(ACTIVITY_CSV);
    expect(result.gym3pRevenue).toBe(0);
  });

  it("counts pvaByProvider Services/Client names per provider, with no exclusions when there's no pre-employment case", () => {
    const result = parseActivityReport(ACTIVITY_CSV);
    expect(result.pvaByProvider["Alex Example"]).toEqual({ services: 2, clientNames: ["Test Client One", "Test Client Two"] });
    expect(result.pvaByProvider["Jamie Sample"]).toEqual({ services: 1, clientNames: ["Test Client Three"] });
  });

  it("excludes corporate-screening/pre-employment rows from pvaByProvider, same population UCVA excludes", () => {
    const csv = `Activity Report

Parameters
Dates,29/06/2026 - 05/07/2026

Summary
Type,Subtotal,Tax,Total
Services,330.00,0,330.00
Total,330.00,0,330.00

Details
Date,Staff,Location,Client,Case,Item,Type,Invoice,Invoice Date,Invoice Type,Account Code,Net,Discount,GST,Amount,Nominal,Client ID
01/07/2026,Alex Example,Adjust Physiotherapy,Real Client,Private - Physio,Private Subs,Service,1001,01/07/2026,Private,,110.00,0.00,0.00,110.00,0.00,1001
02/07/2026,Alex Example,Adjust Physiotherapy,Screening Client,Pre-Employment Screening,Assessment,Service,1002,02/07/2026,Private,,110.00,0.00,0.00,110.00,0.00,1002
03/07/2026,Alex Example,Adjust Physiotherapy,Move OT Client,Move OT Referral,Assessment,Service,1003,03/07/2026,Private,,110.00,0.00,0.00,110.00,0.00,1003

`;
    const result = parseActivityReport(csv);
    expect(result.pvaByProvider["Alex Example"]).toEqual({ services: 1, clientNames: ["Real Client"] });
  });

  it("sums 3rd party gym revenue from the fixed item list, excluding private gym memberships (a differently-named item)", () => {
    const GYM_CSV = `Activity Report

Parameters
Dates,29/06/2026 - 05/07/2026

Summary
Type,Subtotal,Tax,Total
Services,438.00,0,438.00
Total,438.00,0,438.00

Details
Date,Staff,Location,Client,Case,Item,Type,Invoice,Invoice Date,Invoice Type,Account Code,Net,Discount,GST,Amount,Nominal,Client ID
01/07/2026,Alex Example,Adjust Physiotherapy,Test Client One,WC - Gym Membership,Adjust Gym Membership (Weekly),Service,4001,01/07/2026,Workcover QLD,,65.00,0.00,0.00,65.00,0.00,4001
02/07/2026,Alex Example,Adjust Physiotherapy,Test Client Two,Move Strong - Plan,Adjust Move Strong Membership (Weekly),Service,4002,02/07/2026,NDIS,,72.00,0.00,0.00,72.00,0.00,4002
03/07/2026,Jamie Sample,Adjust Physiotherapy,Test Client Three,City Cover GROUP EXERCISE,WC Physio Group Exercise Sessions 100106,Service,4003,03/07/2026,Workcover QLD,,58.00,0.00,0.00,58.00,0.00,4003
04/07/2026,Jamie Sample,Adjust Physiotherapy,Test Client Four,WC GROUP EXERCISE,WC EXPHYS Group Exercise Session 300401,Service,4004,04/07/2026,Workcover QLD,,60.00,0.00,0.00,60.00,0.00,4004
05/07/2026,Alex Example,Adjust Physiotherapy,Test Client Five,NDIS Self Managed,NDIS Program Management – Physio (Non-F2F),Service,4005,05/07/2026,NDIS,,65.00,0.00,0.00,65.00,0.00,4005
06/07/2026,Alex Example,Adjust Physiotherapy,Test Client Six,Gym Membership,GYM Private Subs 505 (Member),Service,4006,06/07/2026,Private,,118.00,0.00,0.00,118.00,0.00,4006

`;
    const result = parseActivityReport(GYM_CSV);
    // 65 + 72 + 58 + 60 + 65 = 320 — the private member's "GYM Private Subs
    // 505" (a differently-named item) must NOT be included.
    expect(result.gym3pRevenue).toBeCloseTo(320, 2);
  });

  it("also counts a 3rd-party member billed under the exact same generic item a private member uses, via Invoice Type", () => {
    // Real-world case (Judith Vesco, "Move Strong", 22/8/26): billed through
    // the same "GYM ... Private Subs..." item family a genuine private
    // Glofox member uses — Item text alone can't tell them apart, only
    // Invoice Type = "Adjust Gym Membership" can.
    const GYM_CSV = `Activity Report

Parameters
Dates,17/08/2026 - 23/08/2026

Summary
Type,Subtotal,Tax,Total
Services,195.75,0,195.75
Total,195.75,0,195.75

Details
Date,Staff,Location,Client,Case,Item,Type,Invoice,Invoice Date,Invoice Type,Account Code,Net,Discount,GST,Amount,Nominal,Client ID
17/08/2026,Sam Johnston,Adjust Physiotherapy,Judith Vesco,Move Strong,GYM TL Private Subs 505,Service,5001,17/08/2026,Adjust Gym Membership,,108.75,0.00,0.00,108.75,0.00,5001
21/08/2026,Wilson Page,Adjust Physiotherapy,Helen Smith,Move Strong,GYM Private Subs 505 (Member),Service,5002,21/08/2026,Private,,87.00,0.00,0.00,87.00,0.00,5002
22/08/2026,Wilson Page,Adjust Physiotherapy,Gym Member,Gym Membership,GYM Private Subs 505 (Member),Service,5003,22/08/2026,Adjust Gym Membership,,87.00,0.00,0.00,87.00,0.00,5003

`;
    const result = parseActivityReport(GYM_CSV);
    // Judith Vesco (108.75) and the third row (87.00) are both billed under
    // "Adjust Gym Membership" and must count; Helen Smith is a genuine
    // Private member on the identical item text and must NOT.
    expect(result.gym3pRevenue).toBeCloseTo(195.75, 2);
  });

  it("detects JBV Initial vs Subsequent from the Case/Item text", () => {
    const JBV_CSV = `Activity Report

Parameters
Dates,29/06/2026 - 05/07/2026

Summary
Type,Subtotal,Tax,Total
Services,300.00,0,300.00
Total,300.00,0,300.00

Details
Date,Staff,Location,Client,Case,Item,Type,Invoice,Invoice Date,Invoice Type,Account Code,Net,Discount,GST,Amount,Nominal,Client ID
01/07/2026,Alex Example,Adjust Physiotherapy,Test Client One,Service - JBV Initial 500,JBV Initial,Service,1001,01/07/2026,Private,,100.00,0.00,0.00,100.00,0.00,1001
02/07/2026,Alex Example,Adjust Physiotherapy,Test Client Two,Service - JBV Subs 30 min 505,JBV Subs,Service,1002,02/07/2026,Private,,100.00,0.00,0.00,100.00,0.00,1002
03/07/2026,Alex Example,Adjust Physiotherapy,Test Client Three,Service - JBV Subs 30 min 505,JBV Subs,Service,1003,03/07/2026,Private,,100.00,0.00,0.00,100.00,0.00,1003

`;
    const result = parseActivityReport(JBV_CSV);
    expect(result.jbvInitialCount).toBe(1);
    expect(result.jbvSubCount).toBe(2);
  });

  it("detects clinic-wide specialty consult counts (Vestibular/Headaches/Paeds) independent of provider", () => {
    const SPECIALTY_CSV = `Activity Report

Parameters
Dates,29/06/2026 - 05/07/2026

Summary
Type,Subtotal,Tax,Total
Services,400.00,0,400.00
Total,400.00,0,400.00

Details
Date,Staff,Location,Client,Case,Item,Type,Invoice,Invoice Date,Invoice Type,Account Code,Net,Discount,GST,Amount,Nominal,Client ID
01/07/2026,Alex Example,Adjust Physiotherapy,Test Client One,Service - Vestibular Initial,Vestibular Initial,Service,2001,01/07/2026,Private,,100.00,0.00,0.00,100.00,0.00,2001
02/07/2026,Jamie Sample,Adjust Physiotherapy,Test Client Two,Service - Headache Subsequent,Headache Subsequent,Service,2002,02/07/2026,Private,,100.00,0.00,0.00,100.00,0.00,2002
03/07/2026,Alex Example,Adjust Physiotherapy,Test Client Three,Service - TMJ Subsequent,TMJ Subsequent,Service,2003,03/07/2026,Private,,100.00,0.00,0.00,100.00,0.00,2003
04/07/2026,Jamie Sample,Adjust Physiotherapy,Test Client Four,Service - Paeds Initial,Paeds Initial,Service,2004,04/07/2026,Private,,100.00,0.00,0.00,100.00,0.00,2004

`;
    const result = parseActivityReport(SPECIALTY_CSV);
    expect(result.specialtyCounts.vestibular).toEqual({ total: 1, initial: 1, sub: 0 });
    expect(result.specialtyCounts.headaches).toEqual({ total: 2, initial: 0, sub: 2 }); // Headache + TMJ both match
    expect(result.specialtyCounts.paeds).toEqual({ total: 1, initial: 1, sub: 0 });
  });

  it("detects Women's Health consults from a standalone 'WH' token, not any word containing it", () => {
    const WH_CSV = `Activity Report

Parameters
Dates,29/06/2026 - 05/07/2026

Summary
Type,Subtotal,Tax,Total
Services,300.00,0,300.00
Total,300.00,0,300.00

Details
Date,Staff,Location,Client,Case,Item,Type,Invoice,Invoice Date,Invoice Type,Account Code,Net,Discount,GST,Amount,Nominal,Client ID
01/07/2026,Alex Example,Adjust Physiotherapy,Test Client One,Private - WH Physio,Private Initial WH 60 min 500,Service,3001,01/07/2026,Private,,240.00,0.00,0.00,240.00,0.00,3001
02/07/2026,Alex Example,Adjust Physiotherapy,Test Client Two,Private - WH Physio,Private Subs WH 505,Service,3002,02/07/2026,Private,,116.00,0.00,0.00,116.00,0.00,3002
03/07/2026,Alex Example,Adjust Physiotherapy,Test Client Three,Which appointment,Whatever Subs 505,Service,3003,03/07/2026,Private,,116.00,0.00,0.00,116.00,0.00,3003

`;
    const result = parseActivityReport(WH_CSV);
    // Row 3's "Which"/"Whatever" must NOT match — \bwh\b requires "wh" as its own token.
    expect(result.specialtyCounts.womens_health).toEqual({ total: 2, initial: 1, sub: 1 });
  });

  it("counts per-provider keyword matches (e.g. a specialty init/sub pair)", () => {
    const HEADACHE_CSV = `Activity Report

Parameters
Dates,29/06/2026 - 05/07/2026

Summary
Type,Subtotal,Tax,Total
Services,200.00,0,200.00
Total,200.00,0,200.00

Details
Date,Staff,Location,Client,Case,Item,Type,Invoice,Invoice Date,Invoice Type,Account Code,Net,Discount,GST,Amount,Nominal,Client ID
01/07/2026,Jamie Sample,Adjust Physiotherapy,Test Client One,Headache Init Consult,Headache Init,Service,1001,01/07/2026,Private,,100.00,0.00,0.00,100.00,0.00,1001
02/07/2026,Jamie Sample,Adjust Physiotherapy,Test Client Two,Headache Sub Consult,Headache Sub,Service,1002,02/07/2026,Private,,100.00,0.00,0.00,100.00,0.00,1002

`;
    const result = parseActivityReport(HEADACHE_CSV, {
      "headache:init": /(?=.*headache)(?=.*init)/i,
      "headache:sub": /(?=.*headache)(?=.*sub)/i,
    });
    expect(result.keywordCountsByProvider["headache:init"]["Jamie Sample"]).toBe(1);
    expect(result.keywordCountsByProvider["headache:sub"]["Jamie Sample"]).toBe(1);
  });
});

describe("parseProvidersAndPracticeReport", () => {
  it("merges the three stacked tables by provider, handling multi-line tooltip headers", () => {
    const result = parseProvidersAndPracticeReport(PROVIDERS_AND_PRACTICE_CSV);
    const alex = result.byProvider["Alex Example"];
    expect(alex.totalSales).toBeCloseTo(3510.4, 1);
    expect(alex.completedConsults).toBe(36);
    expect(alex.uniqueClients).toBe(33);
    expect(alex.cva).toBeCloseTo(1.09, 2);
    expect(alex.caseVA).toBeCloseTo(1.09, 2);
    expect(alex.forwardBookingAverage).toBeCloseTo(3.96, 2);
  });
});

describe("parseBusinessPerformanceReport", () => {
  // Real export, week ending 12/07/2026 — column values here are copied
  // directly from an actual "Business Performance Report" download and
  // cross-checked against the director's own KPI tracking sheet for that
  // same week (Sam Johnston UCVA:6.20 NCVA:27.2 TPR:$615.04, Marcio Dos
  // Santos UCVA:5.22 NCVA:16.7 TPR:$597.38, etc. — all match exactly).
  const REAL_BUSINESS_PERFORMANCE_CSV = `Business Performance Report

Parameters
Dates,05/07/2025 - 05/07/2026
Locations,Adjust Physiotherapy
Providers,21 of 86 Providers

Details
Provider,BPC,LTVC,NCVA,UCVA,AVV,TPR,UR,$/h,ARR,CRR
Nick Baxter,5.83,0,36.53,7.64,116.57,890.5948,75.27%,154.15305472038486,37.38%,0%
Michael Houbert,5.19,0,42.59,7.04,100.66,708.6464,105.17%,171.2635096153846,27.62%,0%
Sam Johnston,4.69,0,27.19,6.20,99.2,615.0400000000001,71.38%,128.78943175487464,31.54%,0.18%
Neil / ADMIN,1.00,0,0,1.00,60,60,100%,0,0%,0%
Admin Adjust,0,0,0,0,0,0,0%,0,0,0
Marcio Dos Santos,4.35,0,16.73,5.22,114.44,597.3768,53.88%,111.45941898772088,23.89%,0%
Samantha Delohery,0,0,12.29,4.12,116.09,478.29080000000005,67.62%,136.26797354747282,29.07%,0%
Ilan Berkowitz,4.49,0,19.00,5.40,104.82,566.028,68.98%,129.0924978879189,32.6%,0%
Lachlan Brazier,8.86,0,81.33,13.75,44.69,614.4875,53.45%,49.88119436619718,32.87%,1.68%

`;

  it("reads NCVA/UCVA/TPR per provider from the real report format", () => {
    const result = parseBusinessPerformanceReport(REAL_BUSINESS_PERFORMANCE_CSV);
    expect(result.byProvider["Sam Johnston"]).toEqual({ ncva: 27.19, ucva: 6.2, tpr: 615.0400000000001 });
    expect(result.byProvider["Marcio Dos Santos"]).toEqual({ ncva: 16.73, ucva: 5.22, tpr: 597.3768 });
    expect(result.byProvider["Michael Houbert"]).toEqual({ ncva: 42.59, ucva: 7.04, tpr: 708.6464 });
    expect(result.byProvider["Lachlan Brazier"]).toEqual({ ncva: 81.33, ucva: 13.75, tpr: 614.4875 });
  });

  it("does not confuse this report's UCVA with Providers & Practice's unrelated Client Visit Average column", () => {
    const result = parseBusinessPerformanceReport(REAL_BUSINESS_PERFORMANCE_CSV);
    // Samantha Delohery has 0 completed consults this period (still ramping up),
    // so Providers & Practice's CVA would be undefined/0 — but her real UCVA
    // here (a rolling-12-month figure) is a meaningful 4.12, not 0 or 1.0.
    expect(result.byProvider["Samantha Delohery"].ucva).toBe(4.12);
  });
});

describe("parseAgedDebtorsReport", () => {
  const AGED_DEBTORS_CSV = `Ageing Debts Report

Parameters
Dates,17/07/2016 - 17/07/2026

Summary
Range,Amount
0-30 Days,500.00
31-60 Days,200.00
61-90 Days,100.00
>90 Days,50.00
Total,850.00

Details
Client,Invoices,0 - 30 Days,31 - 60 Days,61 - 90 Days,> 90 Days,Amount
[Private],3,300.00,50.00,0.00,0.00,350.00
Department of Veterans Affairs,2,0.00,50.00,20.00,10.00,80.00
Tweed Coast Plan Management,1,100.00,0.00,0.00,0.00,100.00
Workcover QLD,4,100.00,100.00,80.00,40.00,320.00
Total,,500.00,200.00,100.00,50.00,850.00

`;

  it("buckets Private/DVA/NDIS/everything-else the same way the Revenue page categorizes payers", () => {
    const result = parseAgedDebtorsReport(AGED_DEBTORS_CSV);
    // [Private] -> full Amount, unfiltered by age.
    expect(result.adTotalPrivate).toBeCloseTo(350, 2);
    // Tweed Coast Plan Management -> NDIS (matches "plan manag"), full Amount.
    expect(result.adNdis).toBeCloseTo(100, 2);
    // DVA -> 31+ days only (0-30 excluded): 50 + 20 + 10.
    expect(result.adMedicareDva31).toBeCloseTo(80, 2);
    // Workcover QLD -> 3rd Party, 61-90/>90 columns only.
    expect(result.ad3rdParty6190).toBeCloseTo(80, 2);
    expect(result.ad3rdParty90).toBeCloseTo(40, 2);
    // Grand total straight off the Details section's own Total row.
    expect(result.adTotal).toBeCloseTo(850, 2);
  });

  it("returns nulls for a bucket with no matching rows, not 0", () => {
    const NO_NDIS_CSV = `Ageing Debts Report

Parameters
Dates,17/07/2016 - 17/07/2026

Details
Client,Invoices,0 - 30 Days,31 - 60 Days,61 - 90 Days,> 90 Days,Amount
[Private],1,100.00,0.00,0.00,0.00,100.00
Total,,100.00,0.00,0.00,0.00,100.00

`;
    const result = parseAgedDebtorsReport(NO_NDIS_CSV);
    expect(result.adTotalPrivate).toBeCloseTo(100, 2);
    expect(result.adNdis).toBeNull();
    expect(result.ad3rdParty6190).toBeNull();
    expect(result.adMedicareDva31).toBeNull();
  });
});

describe("isCancellationExcludedFromStats", () => {
  const base = {
    note: "cnx feeling unwell, will call to rebook",
    caseName: "Private - Physio",
    client: "Jane Example",
    appointmentDate: "2026-08-20",
    modifiedAt: "2026-08-19",
  };

  it("does not exclude a genuine, fresh, actionable cancellation", () => {
    expect(isCancellationExcludedFromStats(base)).toBe(false);
  });

  it("excludes a whole-plan/bulk-cancel note", () => {
    expect(isCancellationExcludedFromStats({ ...base, note: "Plan cancelled as per note 13/07" })).toBe(true);
    expect(isCancellationExcludedFromStats({ ...base, note: "bulk cancel per client request" })).toBe(true);
  });

  it("excludes a corporate screening partner case", () => {
    expect(isCancellationExcludedFromStats({ ...base, caseName: "Village - Pre-Employment" })).toBe(true);
  });

  it("excludes a HotDoc placeholder record", () => {
    expect(isCancellationExcludedFromStats({ ...base, caseName: "General (Online)", client: "HotDoc Placeholder" })).toBe(true);
  });

  it("excludes a stale/ghost recurring slot actioned well before the appointment", () => {
    // Modified 20 days before the appointment date — beyond STALE_CANCEL_DAYS (14).
    expect(isCancellationExcludedFromStats({ ...base, appointmentDate: "2026-08-20", modifiedAt: "2026-07-31" })).toBe(true);
  });

  it("does not exclude a cancellation actioned close to its own appointment date", () => {
    // Modified only 1 day before the appointment — a real, fresh reaction this week.
    expect(isCancellationExcludedFromStats({ ...base, appointmentDate: "2026-08-20", modifiedAt: "2026-08-19" })).toBe(false);
  });
});
