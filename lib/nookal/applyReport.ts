import { SupabaseClient } from "@supabase/supabase-js";
import { NookalReportType } from "@/lib/schema";
import {
  parseActivityReport,
  parseCancellationsReport,
  parseClientsAndCasesReport,
  parseOccupancyReport,
  parseProvidersAndPracticeReport,
} from "@/lib/nookal/parsers";

export interface ApplyReportResult {
  matchedProviders: string[];
  unmatchedNames: string[];
  clinicFieldsUpdated: string[];
  /** Set when the file parsed without error but yielded zero usable rows — usually the wrong report/week, or a section header Nookal renamed. */
  warning?: string;
}

interface SpecialtyMetricRow {
  key: string;
  label: string;
}

interface ProviderRow {
  id: string;
  name: string;
  role: string;
  targets: Record<string, unknown> | null;
  specialty_metrics?: SpecialtyMetricRow[] | null;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * A "physio" role provider's finer New Grad / 2-5yr experience tier isn't
 * a role of its own (see ProviderRole) — it's stored as
 * providers.targets.experience_tier ("new_grad" | "2_5yr"), set on the
 * Settings page, so adding it didn't need a migration.
 */
function cvaTierBucket(p: ProviderRow): "senior_physio" | "massage" | "ep" | "new_grad" | "2_5yr" | null {
  if (p.role === "senior_physio" || p.role === "massage" || p.role === "ep") return p.role;
  if (p.role === "physio") {
    const tier = p.targets?.experience_tier;
    if (tier === "new_grad" || tier === "2_5yr") return tier;
  }
  return null;
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
  const { data: providersData } = await supabase.from("providers").select("id, name, role, targets, specialty_metrics");
  const providers = (providersData ?? []) as ProviderRow[];
  const providerByName = new Map(providers.map((p) => [p.name.trim().toLowerCase(), p]));

  const matched = new Set<string>();
  const unmatched = new Set<string>();
  const clinicPatch: Record<string, unknown> = {};
  let rowsFound = 0;

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
    // Specialty consult counts (e.g. Marcio's Headache Init/Sub) are
    // detected from the same Case/Item text as JBV — any provider whose
    // specialty_metrics has a "<x>_init"/"<x>_sub" pair gets both counted
    // automatically instead of typed in by hand each week.
    const keywordPatterns: Record<string, RegExp> = {};
    const specialtyKeyMap: Record<string, { providerId: string; initKey: string; subKey: string }> = {};
    for (const p of providers) {
      const metrics = p.specialty_metrics ?? [];
      for (const m of metrics) {
        if (!m.key.endsWith("_init")) continue;
        const prefix = m.key.slice(0, -"_init".length);
        const subKey = `${prefix}_sub`;
        if (!metrics.some((mm) => mm.key === subKey)) continue;
        const mapKey = `${p.id}:${prefix}`;
        // Both the specialty word and "init"/"sub" must appear (any order) —
        // matches text like "Headache Init" or "Headache Subsequent".
        keywordPatterns[`${mapKey}:init`] = new RegExp(`(?=.*${prefix})(?=.*init)`, "i");
        keywordPatterns[`${mapKey}:sub`] = new RegExp(`(?=.*${prefix})(?=.*sub)`, "i");
        specialtyKeyMap[mapKey] = { providerId: p.id, initKey: m.key, subKey };
      }
    }

    const result = parseActivityReport(csvText, keywordPatterns);
    rowsFound = Object.keys(result.revenueByProvider).length + (result.totalRevenue !== null ? 1 : 0);
    if (result.totalRevenue !== null) clinicPatch.total_rev = result.totalRevenue;
    clinicPatch.rev_private = result.revenueByPayerCategory.private;
    clinicPatch.rev_medicare = result.revenueByPayerCategory.medicare;
    clinicPatch.rev_dva = result.revenueByPayerCategory.dva;
    clinicPatch.rev_workcover = result.revenueByPayerCategory.workcover;
    clinicPatch.rev_ndis = result.revenueByPayerCategory.ndis;
    clinicPatch.rev_other = result.revenueByPayerCategory.other;
    clinicPatch.jbv_initial = result.jbvInitialCount;
    clinicPatch.jbv_sub = result.jbvSubCount;

    for (const [name, amount] of Object.entries(result.revenueByProvider)) {
      const p = findProvider(name);
      if (p) await upsertProviderMetrics(p.id, { turnover: amount });
    }

    for (const [mapKey, { providerId, initKey, subKey }] of Object.entries(specialtyKeyMap)) {
      const providerName = providers.find((p) => p.id === providerId)?.name;
      if (!providerName) continue;
      const initCount = result.keywordCountsByProvider[`${mapKey}:init`]?.[providerName] ?? 0;
      const subCount = result.keywordCountsByProvider[`${mapKey}:sub`]?.[providerName] ?? 0;
      if (initCount > 0 || subCount > 0) {
        await upsertProviderMetrics(providerId, { [initKey]: initCount, [subKey]: subCount });
      }
    }
  } else if (reportType === "occupancy") {
    const result = parseOccupancyReport(csvText);
    rowsFound = Object.keys(result.byProvider).length;
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
    rowsFound = Object.keys(result.byProvider).length + Object.keys(result.byAdmin).length;
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
        // booked_within_7_days_pct isn't on the individual KPI Scorecard —
        // it's clinic/admin-level, not per-physio.
        await upsertProviderMetrics(p.id, {
          cancellations: data.cancellations,
          dnas: data.dnas,
          not_rebooked: data.notRebooked,
          reschedule_rate_pct: data.rescheduleRatePct,
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

    // Same Details rows, grouped by "Modified User" — feeds the admin
    // meeting page's Cancellations Handled / Reschedule Rate fields.
    for (const [name, data] of Object.entries(result.byAdmin)) {
      const p = findProvider(name);
      if (!p) continue;
      const patch: Record<string, unknown> = {
        cancellations_handled: data.cancellationsHandled,
        not_rebooked: data.notRebooked,
        reschedule_rate_pct: data.rescheduleRatePct,
        pct_of_total_clinic_cx: data.pctOfTotalClinicCx,
      };
      if (data.notRebookedPct !== null) patch.cancellations_not_rebooked_pct = data.notRebookedPct;
      if (data.bookedWithin7DaysPct !== null) patch.booked_within_7_days_pct = data.bookedWithin7DaysPct;
      if (data.avgDaysToNextBooking !== null) patch.avg_days_to_next_booking = data.avgDaysToNextBooking;
      await upsertProviderMetrics(p.id, patch);
    }
  } else if (reportType === "clients_and_cases") {
    const result = parseClientsAndCasesReport(csvText);
    rowsFound = Object.keys(result.byProvider).length;
    let totalNewClients = 0;

    for (const [name, data] of Object.entries(result.byProvider)) {
      totalNewClients += data.newClients;
      const p = findProvider(name);
      if (p) await upsertProviderMetrics(p.id, { new_patients: data.newClients });
    }
    clinicPatch.total_nc = totalNewClients;
  } else if (reportType === "providers_and_practice") {
    // Nookal's "Client Visit Average" (Services / Unique Clients) is the
    // per-provider CVA figure the paper meeting template calls UCVA.
    const result = parseProvidersAndPracticeReport(csvText);
    rowsFound = Object.keys(result.byProvider).length;
    const ucvaByTier: Record<string, number[]> = { senior_physio: [], massage: [], ep: [], new_grad: [], "2_5yr": [] };
    let totalCompletedConsults = 0;

    for (const [name, data] of Object.entries(result.byProvider)) {
      if (data.completedConsults !== null) totalCompletedConsults += data.completedConsults;

      const p = findProvider(name);
      if (!p) continue;
      const patch: Record<string, unknown> = {};
      if (data.cva !== null) patch.ucva = data.cva;
      if (data.completedConsults !== null) patch.completed_consults = data.completedConsults;
      if (data.forwardBookingAverage !== null) patch.fba = data.forwardBookingAverage;
      if (Object.keys(patch).length > 0) await upsertProviderMetrics(p.id, patch);

      const tier = cvaTierBucket(p);
      if (data.cva !== null && tier) ucvaByTier[tier].push(data.cva);
    }

    if (totalCompletedConsults > 0) clinicPatch.total_consults = totalCompletedConsults;
    const seniorAvg = average(ucvaByTier.senior_physio);
    const massageAvg = average(ucvaByTier.massage);
    const epAvg = average(ucvaByTier.ep);
    const newGradAvg = average(ucvaByTier.new_grad);
    const tier25Avg = average(ucvaByTier["2_5yr"]);
    if (seniorAvg !== null) clinicPatch.cva_senior = seniorAvg;
    if (massageAvg !== null) clinicPatch.cva_massage = massageAvg;
    if (epAvg !== null) clinicPatch.cva_ep = epAvg;
    if (newGradAvg !== null) clinicPatch.cva_new_grads = newGradAvg;
    if (tier25Avg !== null) clinicPatch.cva_2_5yr = tier25Avg;
  }

  if (Object.keys(clinicPatch).length > 0) {
    await supabase.from("weekly_kpis").upsert({ week_ending: weekEnding, ...clinicPatch }, { onConflict: "week_ending" });
  }

  return {
    matchedProviders: Array.from(matched),
    unmatchedNames: Array.from(unmatched),
    clinicFieldsUpdated: Object.keys(clinicPatch),
    warning:
      rowsFound === 0
        ? "No matching rows were found in this file — check it's the correct report type and covers the week you're uploading it against."
        : undefined,
  };
}
