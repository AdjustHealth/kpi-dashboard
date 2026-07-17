import { describe, expect, it } from "vitest";
import { applyNookalReport } from "@/lib/nookal/applyReport";

interface FakeProvider {
  id: string;
  name: string;
  role: string;
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

  it("providers_and_practice: sets ucva/fba/completed_consults per provider, sums clinic total_consults, and averages CVA by role", async () => {
    const { client, providerWeekly, weeklyKpis } = createFakeSupabase([
      { id: "p1", name: "Senior One", role: "senior_physio" },
      { id: "p2", name: "Massage One", role: "massage" },
    ]);

    const result = await applyNookalReport(client as never, "providers_and_practice", "2026-07-05", PROVIDERS_AND_PRACTICE_CSV);

    expect(providerWeekly["p1:2026-07-05"].ucva).toBeCloseTo(2, 2);
    expect(providerWeekly["p1:2026-07-05"].completed_consults).toBe(40);
    expect(providerWeekly["p1:2026-07-05"].fba).toBeCloseTo(4, 2);
    expect(providerWeekly["p2:2026-07-05"].ucva).toBeCloseTo(2, 2);

    expect(weeklyKpis["2026-07-05"].total_consults).toBe(60);
    expect(weeklyKpis["2026-07-05"].cva_senior).toBeCloseTo(2, 2);
    expect(weeklyKpis["2026-07-05"].cva_massage).toBeCloseTo(2, 2);
    expect(weeklyKpis["2026-07-05"].cva_ep).toBeUndefined();
    expect(result.matchedProviders.sort()).toEqual(["Massage One", "Senior One"]);
  });
});
