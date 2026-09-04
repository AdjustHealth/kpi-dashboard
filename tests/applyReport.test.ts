import { describe, expect, it } from "vitest";
import { applyNookalReport } from "@/lib/nookal/applyReport";

interface FakeProvider {
  id: string;
  name: string;
  role: string;
  targets?: Record<string, unknown>;
  specialty_metrics?: { key: string; label: string }[];
}

/**
 * Minimal stand-in for the slice of the Supabase JS client applyNookalReport
 * actually calls: providers (plain select), provider_weekly (select+eq+eq+
 * maybeSingle, then upsert), weekly_kpis (upsert). Good enough to verify the
 * write orchestration without a real database.
 */
function createFakeSupabase(providers: FakeProvider[]) {
  const providerWeekly: Record<string, Record<string, unknown>> = {}; // key: `${provider_id}:${week}` -> metrics
  const weeklyKpis: Record<string, Record<string, unknown>> = {}; // key: week -> patch
  let cancellationEvents: Record<string, unknown>[] = [];

  const client = {
    from(table: string) {
      if (table === "cancellation_events") {
        return {
          delete() {
            return {
              async eq(col: string, val: string) {
                if (col === "week_ending") cancellationEvents = cancellationEvents.filter((r) => r.week_ending !== val);
                return { data: null, error: null };
              },
            };
          },
          async insert(rows: Record<string, unknown>[]) {
            cancellationEvents.push(...rows);
            return { data: rows, error: null };
          },
        };
      }

      if (table === "providers") {
        return {
          select: async () => ({ data: providers }),
        };
      }

      if (table === "provider_weekly") {
        return {
          select() {
            let providerId: string | undefined;
            let week: string | undefined;
            const builder = {
              eq(col: string, val: string) {
                if (col === "provider_id") providerId = val;
                if (col === "week_ending") week = val;
                return builder;
              },
              async maybeSingle() {
                const key = `${providerId}:${week}`;
                return { data: providerWeekly[key] ? { metrics: providerWeekly[key] } : null };
              },
              // Supports recomputeCvaTierAverages' un-.maybeSingle()'d query
              // (filtered by week_ending only, across every provider).
              then(resolve: (v: { data: { provider_id: string; metrics: Record<string, unknown> }[] }) => void) {
                const rows = Object.entries(providerWeekly)
                  .filter(([key]) => key.endsWith(`:${week}`))
                  .map(([key, metrics]) => ({ provider_id: key.split(":")[0], metrics }));
                resolve({ data: rows });
              },
            };
            return builder;
          },
          async upsert(payload: { provider_id: string; week_ending: string; metrics: Record<string, unknown> }) {
            providerWeekly[`${payload.provider_id}:${payload.week_ending}`] = payload.metrics;
            return { data: payload, error: null };
          },
        };
      }

      if (table === "weekly_kpis") {
        return {
          async upsert(payload: { week_ending: string; [key: string]: unknown }) {
            const { week_ending, ...patch } = payload;
            weeklyKpis[week_ending] = { ...(weeklyKpis[week_ending] ?? {}), ...patch };
            return { data: payload, error: null };
          },
        };
      }

      throw new Error(`unexpected table ${table}`);
    },
  };

  return { client, providerWeekly, weeklyKpis };
}

const ACTIVITY_CSV = `Activity Report

Parameters
Dates,29/06/2026 - 05/07/2026

Summary
Type,Subtotal,Tax,Total
Services,300.00,0,300.00
Total,300.00,0,300.00

Details
Date,Staff,Location,Client,Case,Item,Type,Invoice,Invoice Date,Invoice Type,Account Code,Net,Discount,GST,Amount,Nominal,Client ID
01/07/2026,Alex Example,Adjust Physiotherapy,Test Client One,Private - Physio,Private Subs,Service,1001,01/07/2026,Private,,220.00,0.00,0.00,220.00,0.00,1001
02/07/2026,Sam Not On File,Adjust Physiotherapy,Test Client Two,Medicare 2026,EPC Subs,Service,1002,02/07/2026,Medicare,,80.00,0.00,0.00,80.00,0.00,1002

`;

describe("applyNookalReport", () => {
  it("activity: sets clinic total_rev/payer split and matched provider turnover, reports unmatched names", async () => {
    const { client, providerWeekly, weeklyKpis } = createFakeSupabase([
      { id: "p1", name: "Alex Example", role: "physio" },
    ]);

    const result = await applyNookalReport(client as never, "activity", "2026-07-05", ACTIVITY_CSV);

    expect(weeklyKpis["2026-07-05"].total_rev).toBeCloseTo(300, 2);
    expect(weeklyKpis["2026-07-05"].rev_private).toBeCloseTo(220, 2);
    expect(weeklyKpis["2026-07-05"].rev_medicare).toBeCloseTo(80, 2);
    expect(providerWeekly["p1:2026-07-05"].turnover).toBeCloseTo(220, 2);
    expect(result.matchedProviders).toEqual(["Alex Example"]);
    expect(result.unmatchedNames).toEqual(["Sam Not On File"]);
    expect(weeklyKpis["2026-07-05"].jbv_initial).toBe(0);
    expect(weeklyKpis["2026-07-05"].jbv_sub).toBe(0);
  });

  it("activity: auto-detects JBV Initial/Sub counts and a provider's specialty init/sub pair", async () => {
    const JBV_AND_SPECIALTY_CSV = `Activity Report

Parameters
Dates,29/06/2026 - 05/07/2026

Summary
Type,Subtotal,Tax,Total
Services,400.00,0,400.00
Total,400.00,0,400.00

Details
Date,Staff,Location,Client,Case,Item,Type,Invoice,Invoice Date,Invoice Type,Account Code,Net,Discount,GST,Amount,Nominal,Client ID
01/07/2026,Alex Example,Adjust Physiotherapy,Test Client One,Service - JBV Initial 500,JBV Initial,Service,1001,01/07/2026,Private,,100.00,0.00,0.00,100.00,0.00,1001
02/07/2026,Alex Example,Adjust Physiotherapy,Test Client Two,Service - JBV Subs 30 min 505,JBV Subs,Service,1002,02/07/2026,Private,,100.00,0.00,0.00,100.00,0.00,1002
03/07/2026,Jamie Sample,Adjust Physiotherapy,Test Client Three,Headache Init Consult,Headache Init,Service,1003,03/07/2026,Private,,100.00,0.00,0.00,100.00,0.00,1003
04/07/2026,Jamie Sample,Adjust Physiotherapy,Test Client Four,Headache Sub Consult,Headache Sub,Service,1004,04/07/2026,Private,,100.00,0.00,0.00,100.00,0.00,1004

`;
    const { client, providerWeekly, weeklyKpis } = createFakeSupabase([
      { id: "p1", name: "Alex Example", role: "physio" },
      {
        id: "p2",
        name: "Jamie Sample",
        role: "senior_physio",
        specialty_metrics: [
          { key: "headache_init", label: "Headache Init" },
          { key: "headache_sub", label: "Headache Sub" },
          { key: "headache_total", label: "Headache Total" },
        ],
      },
    ]);

    await applyNookalReport(client as never, "activity", "2026-07-05", JBV_AND_SPECIALTY_CSV);

    expect(weeklyKpis["2026-07-05"].jbv_initial).toBe(1);
    expect(weeklyKpis["2026-07-05"].jbv_sub).toBe(1);
    expect(providerWeekly["p2:2026-07-05"].headache_init).toBe(1);
    expect(providerWeekly["p2:2026-07-05"].headache_sub).toBe(1);
    expect(providerWeekly["p1:2026-07-05"].headache_init).toBeUndefined();
  });

  it("activity: a provider responsible for a specialty clinic-wide (targets.specialty_clinic_wide_key) gets every matching consult, not just their own — including TMJ wording and other providers' rows", async () => {
    const CLINIC_WIDE_HEADACHE_CSV = `Activity Report

Parameters
Dates,29/06/2026 - 05/07/2026

Summary
Type,Subtotal,Tax,Total
Services,300.00,0,300.00
Total,300.00,0,300.00

Details
Date,Staff,Location,Client,Case,Item,Type,Invoice,Invoice Date,Invoice Type,Account Code,Net,Discount,GST,Amount,Nominal,Client ID
01/07/2026,Jamie Sample,Adjust Physiotherapy,Test Client One,Headache Init Consult,Headache Init,Service,1001,01/07/2026,Private,,100.00,0.00,0.00,100.00,0.00,1001
02/07/2026,Alex Example,Adjust Physiotherapy,Test Client Two,TMJ Sub Consult,TMJ Sub,Service,1002,02/07/2026,Private,,100.00,0.00,0.00,100.00,0.00,1002
03/07/2026,Alex Example,Adjust Physiotherapy,Test Client Three,Headache Sub Consult,Headache Sub,Service,1003,03/07/2026,Private,,100.00,0.00,0.00,100.00,0.00,1003

`;
    const { client, providerWeekly } = createFakeSupabase([
      { id: "p1", name: "Alex Example", role: "physio" },
      {
        id: "p2",
        name: "Jamie Sample",
        role: "senior_physio",
        targets: { specialty_clinic_wide_key: "headache" },
        specialty_metrics: [
          { key: "headache_init", label: "Headache Init" },
          { key: "headache_sub", label: "Headache Sub" },
          { key: "headache_total", label: "Headache Total" },
        ],
      },
    ]);

    await applyNookalReport(client as never, "activity", "2026-07-05", CLINIC_WIDE_HEADACHE_CSV);

    // Jamie Sample (the responsible senior physio) gets ALL 3 rows — their
    // own Headache Init, plus Alex Example's TMJ Sub and Headache Sub —
    // even though only 1 of the 3 rows is actually theirs.
    expect(providerWeekly["p2:2026-07-05"].headache_init).toBe(1);
    expect(providerWeekly["p2:2026-07-05"].headache_sub).toBe(2);
  });

  it("matching is case-insensitive and whitespace-tolerant", async () => {
    const { client, providerWeekly } = createFakeSupabase([{ id: "p1", name: "  alex example  ", role: "physio" }]);
    await applyNookalReport(client as never, "activity", "2026-07-05", ACTIVITY_CSV);
    expect(providerWeekly["p1:2026-07-05"].turnover).toBeCloseTo(220, 2);
  });

  it("preserves existing provider_weekly.metrics keys not touched by this report", async () => {
    const { client, providerWeekly } = createFakeSupabase([{ id: "p1", name: "Alex Example", role: "physio" }]);
    providerWeekly["p1:2026-07-05"] = { personal_cva: 5 };
    await applyNookalReport(client as never, "activity", "2026-07-05", ACTIVITY_CSV);
    expect(providerWeekly["p1:2026-07-05"].personal_cva).toBe(5);
    expect(providerWeekly["p1:2026-07-05"].turnover).toBeCloseTo(220, 2);
  });

  it("cancellations: aggregates clinic-wide cx_pct/cx_rsx_pct/cx_in7_pct from real per-event data — RSX-tagged notes only, DNA/bulk-cancel rows excluded", async () => {
    const CANCELLATIONS_CSV = `Cancellations Report

Parameters
Dates,29/06/2026 - 05/07/2026

Summary
Provider,Cancellations,DNAs,Completed,Cancellation %,DNA %,Total %
Alex Example,3,1,10,,,
Total,3,1,10,,,

Details
Appointment Date,Location,Client,Phone,Provider,Case,Type,Status,Last Attendance,Next Booking,Note,Modifed Date,Modified Time,Modified User,Client ID
01/07/2026,Adjust Physiotherapy,Test Client One,0400 000 001,Alex Example,Private - Physio,Service,Cancelled,2026-06-01 10:00:00,08/07/2026,rsx moved to next week,01/07/2026,9:00am,Staff One,1001
02/07/2026,Adjust Physiotherapy,Test Client Two,0400 000 002,Alex Example,Private - Physio,Service,Cancelled,2026-06-02 10:00:00,,no rebook needed,02/07/2026,9:00am,Staff One,1002
03/07/2026,Adjust Physiotherapy,Test Client Three,0400 000 003,Alex Example,Private - Physio,Service,Cancelled,2026-06-03 10:00:00,20/07/2026,will call to rebook,03/07/2026,9:00am,Staff One,1003
04/07/2026,Adjust Physiotherapy,Test Client Four,0400 000 004,Alex Example,Private - Physio,Service,Did Not Arrive,2026-06-04 10:00:00,,dna,04/07/2026,9:00am,Staff One,1004

`;
    const { client, providerWeekly, weeklyKpis } = createFakeSupabase([{ id: "p1", name: "Alex Example", role: "physio" }]);
    await applyNookalReport(client as never, "cancellations", "2026-07-05", CANCELLATIONS_CSV);

    // Denominator is 3 real events (DNA excluded, no bulk-cancel rows here):
    // row1 RSX-tagged + within 7 days, row2 not rebooked, row3 has a future
    // booking but isn't RSX-tagged (counts toward the denominator only).
    expect(weeklyKpis["2026-07-05"].cx_nr).toBe(1);
    expect(weeklyKpis["2026-07-05"].cx_nr_pct).toBeCloseTo(1 / 3, 4);
    expect(weeklyKpis["2026-07-05"].cx_rsx_pct).toBeCloseTo(1 / 3, 4);
    expect(weeklyKpis["2026-07-05"].cx_in7_pct).toBeCloseTo(1 / 3, 4);
    // Cancellation % = cancellations / (cancellations + completed) = 3 / (3 + 10)
    expect(weeklyKpis["2026-07-05"].cx_pct).toBeCloseTo(3 / 13, 4);
    expect(providerWeekly["p1:2026-07-05"].not_rebooked_pct).toBeCloseTo(1 / 3, 4);
    expect(providerWeekly["p1:2026-07-05"].not_rebooked).toBe(1);
  });

  const PROVIDERS_AND_PRACTICE_CSV = `Providers and Practice Report

Parameters
Dates,29/06/2026 - 05/07/2026

Provider Stats
Provider,Services,Completed Consults,Unique Clients,New Clients,New Cases,Client Visit Average,Case Visit Average,Classes,Participants,Completed Classes
Senior One,40,40,20,2,2,2.00,2.00,0,0,0
Massage One,20,20,10,1,1,2.00,2.00,0,0,0
Total,60,60,30,3,3,,,0,0,0

Forward Booking Averages
Provider,Total Appointments,Total Clients,Booking Average,Total Classes,Total Class Clients,Class Booking Average
Senior One,80,20,4.00,0,0,0.00
Massage One,40,10,4.00,0,0,0.00
Total,120,30,,0,0,

`;

  it("providers_and_practice: sets fba/completed_consults per provider and sums clinic total_consults (NOT ucva/cva-by-tier — those need the Business Performance Report, not this one)", async () => {
    const { client, providerWeekly, weeklyKpis } = createFakeSupabase([
      { id: "p1", name: "Senior One", role: "senior_physio" },
      { id: "p2", name: "Massage One", role: "massage" },
    ]);

    const result = await applyNookalReport(client as never, "providers_and_practice", "2026-07-05", PROVIDERS_AND_PRACTICE_CSV);

    expect(providerWeekly["p1:2026-07-05"].completed_consults).toBe(40);
    expect(providerWeekly["p1:2026-07-05"].fba).toBeCloseTo(4, 2);
    expect(providerWeekly["p1:2026-07-05"].personal_cva).toBeUndefined();
    expect(providerWeekly["p1:2026-07-05"].ucva).toBeUndefined();
    expect(providerWeekly["p2:2026-07-05"].ucva).toBeUndefined();

    expect(weeklyKpis["2026-07-05"].total_consults).toBe(60);
    expect(weeklyKpis["2026-07-05"].cva_senior).toBeUndefined();
    expect(weeklyKpis["2026-07-05"].cva_massage).toBeUndefined();
    expect(weeklyKpis["2026-07-05"].cva_ep).toBeUndefined();
    expect(result.matchedProviders.sort()).toEqual(["Massage One", "Senior One"]);
  });

  it("clients_and_cases: computes New Patient Booking Rate from each new client's own Bookings 'Total' count, excluding Pre-Employment", async () => {
    const CLIENTS_AND_CASES_CSV = `Clients and Cases Report

Parameters
Dates,29/06/2026 - 05/07/2026

Details
Client,Case,Payer,Location,New Client,New Case,Registration Form,Initial,Provider,Next,Bookings,Email,Receive Email,Mobile,Receive SMS,Followed-up,Client ID
Bob,Private - Physio,Private,Adjust Physiotherapy,Yes,Yes,No,29/06/2026,Alex Example,15/07/2026,2 Complete / 7 Total,bob@example.com,No,0400 000 001,Yes,No,1001
Cara,Medicare 2026,Medicare,Adjust Physiotherapy,Yes,Yes,No,30/06/2026,Alex Example,,1 Complete / 3 Total,cara@example.com,No,0400 000 002,Yes,No,1002
Dana,Existing case,Private,Adjust Physiotherapy,No,Yes,No,30/06/2026,Alex Example,,4 Complete / 4 Total,dana@example.com,No,0400 000 003,Yes,No,1003
Evan,Village - Pre-Employment,Village Road Show Theme Parks Pty Ltd,Adjust Physiotherapy,Yes,Yes,No,01/07/2026,Alex Example,,1 Complete / 1 Total,evan@example.com,No,0400 000 004,Yes,No,1004

`;
    const { client, providerWeekly, weeklyKpis } = createFakeSupabase([{ id: "p1", name: "Alex Example", role: "physio" }]);
    await applyNookalReport(client as never, "clients_and_cases", "2026-07-05", CLIENTS_AND_CASES_CSV);

    // Bob (7) + Cara (3) = 10 recommendations across 2 new clients (excl.
    // Pre-Employment Evan, and excl. Dana who isn't a New Client at all).
    expect(providerWeekly["p1:2026-07-05"].new_patients).toBe(2);
    expect(providerWeekly["p1:2026-07-05"].npbr_recommendations).toBe(10);
    expect(providerWeekly["p1:2026-07-05"].new_pt_booking_rate).toBeCloseTo(5, 2);
    // Clinic-wide new-client total also excludes Pre-Employment (Evan).
    expect(weeklyKpis["2026-07-05"].total_nc).toBe(2);
  });

  const BUSINESS_PERFORMANCE_CSV = `Business Performance Report

Parameters
Dates,05/07/2025 - 05/07/2026

Details
Provider,BPC,LTVC,NCVA,UCVA,AVV,TPR,UR,$/h,ARR,CRR
Senior One,4.69,0,27.19,6.20,99.2,615.04,71.38%,128.79,31.54%,0.18%
Massage One,4.06,0,22.43,4.26,117.47,500.42,71.98%,78.92,22.95%,0%
Physio Senior Tier,5.19,0,42.59,7.04,100.66,708.65,105.17%,171.26,27.62%,0%
Physio Mid Tier,3.84,0,11.78,4.62,90.13,416.40,61.83%,105.75,28.76%,0.06%
Physio New Grad,2.87,0,7.29,3.12,113.57,354.34,57.01%,87.10,34.15%,0%
`;

  it("business_performance: sets ncva/tpr per provider, but NOT ucva/cva-by-tier (those come from PVA now, see providers_and_practice_12mo/activity_pre_employment_12mo below)", async () => {
    const { client, providerWeekly, weeklyKpis } = createFakeSupabase([
      { id: "p1", name: "Senior One", role: "senior_physio" },
      { id: "p2", name: "Massage One", role: "massage" },
      { id: "p3", name: "Physio Senior Tier", role: "physio", targets: { experience_tier: "senior" } },
      { id: "p4", name: "Physio Mid Tier", role: "physio", targets: { experience_tier: "2_5yr" } },
      { id: "p5", name: "Physio New Grad", role: "physio", targets: { experience_tier: "new_grad" } },
    ]);

    const result = await applyNookalReport(client as never, "business_performance", "2026-07-12", BUSINESS_PERFORMANCE_CSV);

    expect(providerWeekly["p1:2026-07-12"].ucva).toBeUndefined();
    expect(providerWeekly["p1:2026-07-12"].ncva).toBeCloseTo(27.19, 2);
    expect(providerWeekly["p1:2026-07-12"].tpr).toBeCloseTo(615.04, 2);
    expect(weeklyKpis["2026-07-12"]?.cva_senior).toBeUndefined();
    expect(result.matchedProviders.sort()).toEqual(["Massage One", "Physio Mid Tier", "Physio New Grad", "Physio Senior Tier", "Senior One"]);
  });

  it("providers_and_practice_12mo + activity_pre_employment_12mo: computes ucva (PVA excl. pre-employment) once both halves are in, in either order, and averages CVA-by-tier from it", async () => {
    const PVA_ALL_CSV = `Providers and Practice Report

Parameters
Dates,31/08/2025 - 30/08/2026

Provider Stats
Provider,Services,Completed Consults,Unique Patients,New Patients,New Cases,Patient Visit Average,Case Visit Average,Classes,Participants,Completed Classes
Senior One,1000,1000,200,10,10,5.00,5.00,0,0,0
Massage One,500,500,100,10,10,5.00,5.00,0,0,0

`;
    const PVA_PRE_EMPLOYMENT_CSV = `Activity Report

Parameters
Dates,31/08/2025 - 30/08/2026
Payers,"Move OT, Top Golf Australia, Village Road Show Theme Parks Pty Ltd"

Details
Date,Staff,Location,Client,Case,Item,Type,Invoice,Invoice Date,Invoice Type,Account Code,Net,Discount,GST,Amount,Nominal,Client ID
01/09/2025,Senior One,Adjust Physiotherapy,Screening Client One,Village - Pre-employment,Pre-Employment Assessment,Service,1,01/09/2025,Village Road Show Theme Parks Pty Ltd,,120,0,12,132,0,1

`;
    const { client, providerWeekly, weeklyKpis } = createFakeSupabase([
      { id: "p1", name: "Senior One", role: "senior_physio" },
      { id: "p2", name: "Massage One", role: "massage" },
    ]);

    // Upload the "all" half first — no ucva yet, missing the "pre" half.
    await applyNookalReport(client as never, "providers_and_practice_12mo", "2026-07-12", PVA_ALL_CSV);
    expect(providerWeekly["p1:2026-07-12"].ucva).toBeUndefined();
    expect(providerWeekly["p1:2026-07-12"].pva_services_all).toBe(1000);
    expect(providerWeekly["p1:2026-07-12"].pva_clients_all).toBe(200);

    // The second half (in either order) triggers the real computation:
    // Senior One: (1000-1)/(200-1) = 5.0201..., Massage One had zero
    // pre-employment patients: (500-0)/(100-0) = 5.
    await applyNookalReport(client as never, "activity_pre_employment_12mo", "2026-07-12", PVA_PRE_EMPLOYMENT_CSV);
    expect(providerWeekly["p1:2026-07-12"].ucva).toBeCloseTo(999 / 199, 4);
    expect(providerWeekly["p2:2026-07-12"].ucva).toBeCloseTo(5, 4);
    expect(weeklyKpis["2026-07-12"].cva_senior).toBeCloseTo(999 / 199, 4);
    expect(weeklyKpis["2026-07-12"].cva_massage).toBeCloseTo(5, 4);
  });

  it("cancellations: buckets by Modified User for admin reschedule rate / cancellations handled — RSX-tagged, DNA excluded", async () => {
    const CANCELLATIONS_CSV = `Cancellations Report

Parameters
Dates,29/06/2026 - 05/07/2026

Details
Appointment Date,Location,Client,Phone,Provider,Case,Type,Status,Last Attendance,Next Booking,Note,Modifed Date,Modified Time,Modified User,Client ID
01/07/2026,Adjust Physiotherapy,Test Client One,0400 000 001,Alex Example,Private - Physio,Service,Cancelled,2026-06-01 10:00:00,08/07/2026,rsx moved to next week,01/07/2026,9:00am,Admin One,1001
02/07/2026,Adjust Physiotherapy,Test Client Two,0400 000 002,Alex Example,Private - Physio,Service,Cancelled,2026-06-02 10:00:00,,no rebook needed,02/07/2026,9:00am,Admin One,1002
03/07/2026,Adjust Physiotherapy,Test Client Three,0400 000 003,Alex Example,Private - Physio,Service,Cancelled,2026-06-03 10:00:00,,no rebook needed,03/07/2026,9:00am,Admin Two,1003
04/07/2026,Adjust Physiotherapy,Test Client Four,0400 000 004,Alex Example,Private - Physio,Service,Did Not Arrive,2026-06-04 10:00:00,10/07/2026,dna,04/07/2026,9:00am,Admin Two,1004

`;
    const { client, providerWeekly } = createFakeSupabase([
      { id: "p1", name: "Alex Example", role: "physio" },
      { id: "a1", name: "Admin One", role: "admin" },
      { id: "a2", name: "Admin Two", role: "admin" },
    ]);

    await applyNookalReport(client as never, "cancellations", "2026-07-05", CANCELLATIONS_CSV);

    // Admin One handled 2 real cancellations, 1 RSX-tagged (08/07) of 2.
    // Admin Two's DNA row is excluded entirely (DNAs aren't cancellations),
    // leaving 3 real events total across both admins.
    expect(providerWeekly["a1:2026-07-05"].cancellations_handled).toBe(2);
    expect(providerWeekly["a1:2026-07-05"].not_rebooked).toBe(1);
    expect(providerWeekly["a1:2026-07-05"].reschedule_rate_pct).toBeCloseTo(0.5, 4);
    expect(providerWeekly["a1:2026-07-05"].pct_of_total_clinic_cx).toBeCloseTo(2 / 3, 4);
    expect(providerWeekly["a1:2026-07-05"].avg_days_to_next_booking).toBeCloseTo(7, 4);
    expect(providerWeekly["a1:2026-07-05"].cancellations_not_rebooked_pct).toBeCloseTo(0.5, 4);
    expect(providerWeekly["a1:2026-07-05"].booked_within_7_days_pct).toBeCloseTo(0.5, 4);

    // Admin Two handled 1 of 3 real events (their DNA row is excluded), not rebooked
    expect(providerWeekly["a2:2026-07-05"].cancellations_handled).toBe(1);
    expect(providerWeekly["a2:2026-07-05"].reschedule_rate_pct).toBeCloseTo(0, 4);
    expect(providerWeekly["a2:2026-07-05"].pct_of_total_clinic_cx).toBeCloseTo(1 / 3, 4);
    expect(providerWeekly["a2:2026-07-05"].booked_within_7_days_pct).toBeCloseTo(0, 4);
  });
});
