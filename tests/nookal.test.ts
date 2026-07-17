import { describe, expect, it } from "vitest";
import {
  parseActivityReport,
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
Total,,4110,3480,,81,4

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
01/07/2026,Adjust Physiotherapy,Test Client One,0400 000 001,Alex Example,Private - Physio,Service,Cancelled,2026-06-01 10:00:00,08/07/2026,"had a clash, rebooked",01/07/2026,9:00am,Staff One,1001
02/07/2026,Adjust Physiotherapy,Test Client Two,0400 000 002,Alex Example,Private - Physio,Service,Cancelled,2026-06-02 10:00:00,,no rebook,02/07/2026,9:00am,Staff One,1002
03/07/2026,Adjust Physiotherapy,Test Client Three,0400 000 003,Alex Example,Private - Physio,Service,Did Not Arrive,2026-06-03 10:00:00,20/07/2026,rebooked late,03/07/2026,9:00am,Staff One,1003

`;

const CLIENTS_AND_CASES_CSV = `Clients and Cases Report

Parameters
Dates,29/06/2026 - 05/07/2026

Details
Client,Case,Payer,Location,New Client,New Case,Registration Form,Initial,Provider,Next,Bookings,Email,Receive Email,Mobile,Receive SMS,Followed-up,Client ID
Test Client One,Private - Physio,Private,Adjust Physiotherapy,Yes,Yes,No,29/06/2026,Alex Example,15/07/2026,1 Complete / 2 Total,a@example.com,No,0400 000 001,Yes,No,1001
Test Client Two,Medicare 2026,Medicare,Adjust Physiotherapy,No,Yes,No,30/06/2026,Alex Example,,1 Complete / 1 Total,b@example.com,No,0400 000 002,Yes,No,1002
Test Client Three,NDIS - Plan Managed,Provider Choice,Adjust Physiotherapy,Yes,Yes,No,01/07/2026,Jamie Sample,,1 Complete / 1 Total,c@example.com,No,0400 000 003,Yes,No,1003

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

  it("parseNookalDate reads DD/MM/YYYY", () => {
    const d = parseNookalDate("08/07/2026");
    expect(d?.getUTCFullYear()).toBe(2026);
    expect(d?.getUTCMonth()).toBe(6); // 0-indexed -> July
    expect(d?.getUTCDate()).toBe(8);
  });

  it("extractSection finds a named section and stops before the Total row", () => {
    const rows = parseCsvRows(OCCUPANCY_CSV);
    const section = extractSection(rows, "Summary");
    expect(section?.rows.length).toBe(2);
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
});

describe("parseCancellationsReport", () => {
  it("takes counts/percentages from Summary", () => {
    const result = parseCancellationsReport(CANCELLATIONS_CSV);
    expect(result.byProvider["Alex Example"].cancellations).toBe(2);
    expect(result.byProvider["Alex Example"].dnas).toBe(1);
    expect(result.byProvider["Alex Example"].cancellationPct).toBeCloseTo(0.1538, 3);
  });

  it("derives not-rebooked / reschedule rate / booked-within-7-days from Details", () => {
    const result = parseCancellationsReport(CANCELLATIONS_CSV);
    const alex = result.byProvider["Alex Example"];
    // 3 events: one rebooked within 7 days (01/07 -> 08/07), one not rebooked, one rebooked outside 7 days (03/07 -> 20/07)
    expect(alex.notRebooked).toBe(1);
    expect(alex.rescheduledCount).toBe(2);
    expect(alex.rescheduleRatePct).toBeCloseTo(2 / 3, 4);
    expect(alex.bookedWithin7DaysPct).toBeCloseTo(1 / 3, 4);
  });
});

describe("parseClientsAndCasesReport", () => {
  it("counts new clients and new cases per provider", () => {
    const result = parseClientsAndCasesReport(CLIENTS_AND_CASES_CSV);
    expect(result.byProvider["Alex Example"].newClients).toBe(1);
    expect(result.byProvider["Alex Example"].newCases).toBe(2);
    expect(result.byProvider["Jamie Sample"].newClients).toBe(1);
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
