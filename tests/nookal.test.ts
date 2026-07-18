import { describe, expect, it } from "vitest";
import {
  parseActivityReport,
  parseBusinessPerformanceReport,
  parseCancellationsReport,
  parseClientsAndCasesReport,
  parseOccupancyReport,
  parseProvidersAndPracticeReport,
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
