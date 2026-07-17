import { SupabaseClient } from "@supabase/supabase-js";
import { NookalReportType } from "@/lib/schema";
import {
  parseActivityReport,
  parseCancellationsReport,
  parseClientsAndCasesReport,
  parseOccupancyReport,
} from "@/lib/nookal/parsers";

export interface ApplyReportResult {
  matchedProviders: string[];
  unmatchedNames: string[];
  clinicFieldsUpdated: string[];
}

interface ProviderRow {
  id: string;
  name: string;
  role: string;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Parses an uploaded Nookal report and writes whatever KPIs it maps to —
 * clinic-wide weekly_kpis fields and/or each matched provider's
 * provider_weekly.metrics. Matching a CSV row's provider name to a
 * `providers` row is exact (case-insensitive, trimmed); unmatched names are
 * returned so the caller can surface them rather than silently dropping
 * data (e.g. if a provider's name in Nookal doesn't exactly match the name
 * on the Providers/Settings page).
 *
 * "business_performance" and "aged_debtors" are stored (by the caller) but
 * not parsed here — see lib/nookal/parsers.ts for why.
 */
export async function applyNookalReport(
  supabase: SupabaseClient,
  reportType: NookalReportType,
  weekEnding: string,
  csvText: string
): Promise<ApplyReportResult> {
  const { data: providersData } = await supabase.from("providers").select("id, name, role");
  const providers = (providersData ?? []) as ProviderRow[];
  const providerByName = new Map(providers.map((p) => [p.name.trim().toLowerCase(), p]));

  const matched = new Set<string>();
  const unmatched = new Set<string>();
  const clinicPatch: Record<string, unknown> = {};

  function findProvider(name: string): ProviderRow | undefined {
    const p = providerByName.get(name.trim().toLowerCase());
    if (p) matched.add(p.name);
    else unmatched.add(name);
    return p;
  }

  async function upsertProviderMetrics(providerId: string, patch: Record<string, unknown>) {
    const { data: existing } = await supabase
      .from("provider_weekly")
      .select("metrics")
      .eq("provider_id", providerId)
      .eq("week_ending", weekEnding)
      .maybeSingle();
    const merged = { ...(existing?.metrics ?? {}), ...patch };
    await supabase
      .from("provider_weekly")
      .upsert({ provider_id: providerId, week_ending: weekEnding, metrics: merged }, { onConflict: "provider_id,week_ending" });
  }

  if (reportType === "activity") {
    const result = parseActivityReport(csvText);
    if (result.totalRevenue !== null) clinicPatch.total_rev = result.totalRevenue;
    clinicPatch.rev_private = result.revenueByPayerCategory.private;
    clinicPatch.rev_medicare = result.revenueByPayerCategory.medicare;
    clinicPatch.rev_dva = result.revenueByPayerCategory.dva;
    clinicPatch.rev_workcover = result.revenueByPayerCategory.workcover;
    clinicPatch.rev_ndis = result.revenueByPayerCategory.ndis;
    clinicPatch.rev_other = result.revenueByPayerCategory.other;

    for (const [name, amount] of Object.entries(result.revenueByProvider)) {
      const p = findProvider(name);
      if (p) await upsertProviderMetrics(p.id, { turnover: amount });
    }
  } else if (reportType === "occupancy") {
    const result = parseOccupancyReport(csvText);
    const byRole: Record<string, number[]> = { senior_physio: [], physio: [], massage: [], ep: [] };

    for (const [name, data] of Object.entries(result.byProvider)) {
      const p = findProvider(name);
      if (!p || data.occupancyPct === null) continue;
      await upsertProviderMetrics(p.id, { occupancy_pct: data.occupancyPct });
      if (byRole[p.role]) byRole[p.role].push(data.occupancyPct);
    }

    const physioAvg = average([...byRole.senior_physio, ...byRole.physio]);
    const massageAvg = average(byRole.massage);
    const epAvg = average(byRole.ep);
    const clinicAvg = average([...byRole.senior_physio, ...byRole.physio, ...byRole.massage, ...byRole.ep]);
    if (physioAvg !== null) clinicPatch.physio_occ = physioAvg;
    if (massageAvg !== null) clinicPatch.massage_occ = massageAvg;
    if (epAvg !== null) clinicPatch.ep_occ = epAvg;
    if (clinicAvg !== null) clinicPatch.clinic_occ = clinicAvg;
  } else if (reportType === "cancellations") {
    const result = parseCancellationsReport(csvText);
    let totalCancels = 0;
    let totalDnas = 0;
    let totalCompleted = 0;
    let totalNotRebooked = 0;
    let totalRescheduled = 0;
    let totalEvents = 0;
    let totalBookedWithin7 = 0;

    for (const [name, data] of Object.entries(result.byProvider)) {
      totalCancels += data.cancellations;
      totalDnas += data.dnas;
      totalCompleted += data.completed ?? 0;
      totalNotRebooked += data.notRebooked;
      totalRescheduled += data.rescheduledCount;
      const events = data.notRebooked + data.rescheduledCount;
      totalEvents += events;
      if (data.bookedWithin7DaysPct !== null) totalBookedWithin7 += data.bookedWithin7DaysPct * events;

      const p = findProvider(name);
      if (p) {
        await upsertProviderMetrics(p.id, {
          cancellations: data.cancellations,
          dnas: data.dnas,
          not_rebooked: data.notRebooked,
          reschedule_rate_pct: data.rescheduleRatePct,
          booked_within_7_days_pct: data.bookedWithin7DaysPct,
        });
      }
    }
    clinicPatch.cx_cancels = totalCancels;
    clinicPatch.cx_dnas = totalDnas;
    clinicPatch.cx_nr = totalNotRebooked;
    if (totalCancels + totalCompleted > 0) clinicPatch.cx_pct = totalCancels / (totalCancels + totalCompleted);
    if (totalEvents > 0) {
      clinicPatch.cx_nr_pct = totalNotRebooked / totalEvents;
      clinicPatch.cx_rsx_pct = totalRescheduled / totalEvents;
      clinicPatch.cx_in7_pct = totalBookedWithin7 / totalEvents;
    }
  } else if (reportType === "clients_and_cases") {
    const result = parseClientsAndCasesReport(csvText);
    let totalNewClients = 0;

    for (const [name, data] of Object.entries(result.byProvider)) {
      totalNewClients += data.newClients;
      const p = findProvider(name);
      if (p) await upsertProviderMetrics(p.id, { new_patients: data.newClients });
    }
    clinicPatch.total_nc = totalNewClients;
  }

  if (Object.keys(clinicPatch).length > 0) {
    await supabase.from("weekly_kpis").upsert({ week_ending: weekEnding, ...clinicPatch }, { onConflict: "week_ending" });
  }

  return {
    matchedProviders: Array.from(matched),
    unmatchedNames: Array.from(unmatched),
    clinicFieldsUpdated: Object.keys(clinicPatch),
  };
}
