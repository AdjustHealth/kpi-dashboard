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

  const client = {
    from(table: string) {
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

  it("cancellations: aggregates clinic-wide cx_pct/cx_rsx_pct/cx_in7_pct from real per-event data", async () => {
    const CANCELLATIONS_CSV = `Cancellations Report

Parameters
Dates,29/06/2026 - 05/07/2026

Summary
Provider,Cancellations,DNAs,Completed,Cancellation %,DNA %,Total %
Alex Example,2,1,10,15.38%,7.69%,23.08%
Total,2,1,10,,,

Details
Appointment Date,Location,Client,Phone,Provider,Case,Type,Status,Last Attendance,Next Booking,Note,Modifed Date,Modified Time,Modified User,Client ID
01/07/2026,Adjust Physiotherapy,Test Client One,0400 000 001,Alex Example,Private - Physio,Service,Cancelled,2026-06-01 10:00:00,08/07/2026,ok,01/07/2026,9:00am,Staff One,1001
02/07/2026,Adjust Physiotherapy,Test Client Two,0400 000 002,Alex Example,Private - Physio,Service,Cancelled,2026-06-02 10:00:00,,ok,02/07/2026,9:00am,Staff One,1002
03/07/2026,Adjust Physiotherapy,Test Client Three,0400 000 003,Alex Example,Private - Physio,Service,Did Not Arrive,2026-06-03 10:00:00,20/07/2026,ok,03/07/2026,9:00am,Staff One,1003

`;
    const { client, providerWeekly, weeklyKpis } = createFakeSupabase([{ id: "p1", name: "Alex Example", role: "physio" }]);
    await applyNookalReport(client as never, "cancellations", "2026-07-05", CANCELLATIONS_CSV);

    // 3 events total: 1 not rebooked, 2 rescheduled (1 within 7 days, 1 not)
    expect(weeklyKpis["2026-07-05"].cx_nr).toBe(1);
    expect(weeklyKpis["2026-07-05"].cx_nr_pct).toBeCloseTo(1 / 3, 4);
    expect(weeklyKpis["2026-07-05"].cx_rsx_pct).toBeCloseTo(2 / 3, 4);
    expect(weeklyKpis["2026-07-05"].cx_in7_pct).toBeCloseTo(1 / 3, 4);
    // Cancellation % = cancellations / (cancellations + completed) = 2 / (2 + 10)
    expect(weeklyKpis["2026-07-05"].cx_pct).toBeCloseTo(2 / 12, 4);
    expect(providerWeekly["p1:2026-07-05"].not_rebooked_pct).toBeCloseTo(1 / 3, 4);
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
    expect(providerWeekly["p1:2026-07-05"].ucva).toBeUndefined();
    expect(providerWeekly["p2:2026-07-05"].ucva).toBeUndefined();

    expect(weeklyKpis["2026-07-05"].total_consults).toBe(60);
    expect(weeklyKpis["2026-07-05"].cva_senior).toBeUndefined();
    expect(weeklyKpis["2026-07-05"].cva_massage).toBeUndefined();
    expect(weeklyKpis["2026-07-05"].cva_ep).toBeUndefined();
    expect(result.matchedProviders.sort()).toEqual(["Massage One", "Senior One"]);
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

  it("business_performance: sets ucva/ncva/tpr per provider and averages CVA-by-tier using experience_tier (including role:physio bucketed as senior)", async () => {
    const { client, providerWeekly, weeklyKpis } = createFakeSupabase([
      { id: "p1", name: "Senior One", role: "senior_physio" },
      { id: "p2", name: "Massage One", role: "massage" },
      { id: "p3", name: "Physio Senior Tier", role: "physio", targets: { experience_tier: "senior" } },
      { id: "p4", name: "Physio Mid Tier", role: "physio", targets: { experience_tier: "2_5yr" } },
      { id: "p5", name: "Physio New Grad", role: "physio", targets: { experience_tier: "new_grad" } },
    ]);

    const result = await applyNookalReport(client as never, "business_performance", "2026-07-12", BUSINESS_PERFORMANCE_CSV);

    expect(providerWeekly["p1:2026-07-12"].ucva).toBeCloseTo(6.2, 2);
    expect(providerWeekly["p1:2026-07-12"].ncva).toBeCloseTo(27.19, 2);
    expect(providerWeekly["p1:2026-07-12"].tpr).toBeCloseTo(615.04, 2);

    // Both role:senior_physio (Senior One) and role:physio+experience_tier:senior
    // (Physio Senior Tier) bucket into the same "senior" CVA-by-tier average.
    expect(weeklyKpis["2026-07-12"].cva_senior).toBeCloseTo((6.2 + 7.04) / 2, 2);
    expect(weeklyKpis["2026-07-12"].cva_massage).toBeCloseTo(4.26, 2);
    expect(weeklyKpis["2026-07-12"].cva_2_5yr).toBeCloseTo(4.62, 2);
    expect(weeklyKpis["2026-07-12"].cva_new_grads).toBeCloseTo(3.12, 2);
    expect(weeklyKpis["2026-07-12"].cva_ep).toBeUndefined();
    expect(result.matchedProviders.sort()).toEqual(["Massage One", "Physio Mid Tier", "Physio New Grad", "Physio Senior Tier", "Senior One"]);
  });

  it("cancellations: buckets by Modified User for admin reschedule rate / cancellations handled", async () => {
    const CANCELLATIONS_CSV = `Cancellations Report

Parameters
Dates,29/06/2026 - 05/07/2026

Details
Appointment Date,Location,Client,Phone,Provider,Case,Type,Status,Last Attendance,Next Booking,Note,Modifed Date,Modified Time,Modified User,Client ID
01/07/2026,Adjust Physiotherapy,Test Client One,0400 000 001,Alex Example,Private - Physio,Service,Cancelled,2026-06-01 10:00:00,08/07/2026,ok,01/07/2026,9:00am,Admin One,1001
02/07/2026,Adjust Physiotherapy,Test Client Two,0400 000 002,Alex Example,Private - Physio,Service,Cancelled,2026-06-02 10:00:00,,ok,02/07/2026,9:00am,Admin One,1002
03/07/2026,Adjust Physiotherapy,Test Client Three,0400 000 003,Alex Example,Private - Physio,Service,Did Not Arrive,2026-06-03 10:00:00,10/07/2026,ok,03/07/2026,9:00am,Admin Two,1003

`;
    const { client, providerWeekly } = createFakeSupabase([
      { id: "p1", name: "Alex Example", role: "physio" },
      { id: "a1", name: "Admin One", role: "admin" },
      { id: "a2", name: "Admin Two", role: "admin" },
    ]);

    await applyNookalReport(client as never, "cancellations", "2026-07-05", CANCELLATIONS_CSV);

    // Admin One handled 2 of 3 total rows, 1 rescheduled (08/07) of 2
    expect(providerWeekly["a1:2026-07-05"].cancellations_handled).toBe(2);
    expect(providerWeekly["a1:2026-07-05"].not_rebooked).toBe(1);
    expect(providerWeekly["a1:2026-07-05"].reschedule_rate_pct).toBeCloseTo(0.5, 4);
    expect(providerWeekly["a1:2026-07-05"].pct_of_total_clinic_cx).toBeCloseTo(2 / 3, 4);
    expect(providerWeekly["a1:2026-07-05"].avg_days_to_next_booking).toBeCloseTo(7, 4);
    expect(providerWeekly["a1:2026-07-05"].cancellations_not_rebooked_pct).toBeCloseTo(0.5, 4);
    expect(providerWeekly["a1:2026-07-05"].booked_within_7_days_pct).toBeCloseTo(0.5, 4);

    // Admin Two handled 1 of 3, fully rescheduled within 7 days
    expect(providerWeekly["a2:2026-07-05"].cancellations_handled).toBe(1);
    expect(providerWeekly["a2:2026-07-05"].reschedule_rate_pct).toBeCloseTo(1, 4);
    expect(providerWeekly["a2:2026-07-05"].pct_of_total_clinic_cx).toBeCloseTo(1 / 3, 4);
    expect(providerWeekly["a2:2026-07-05"].booked_within_7_days_pct).toBeCloseTo(1, 4);
  });
});
