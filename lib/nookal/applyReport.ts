import { SupabaseClient } from "@supabase/supabase-js";
import { NookalReportType } from "@/lib/schema";
import { cvaTierBucket } from "@/lib/cvaTier";
import {
  parseActivityReport,
  parseAgedDebtorsReport,
  parseBusinessPerformanceReport,
  parseCancellationsReport,
  parseClientsAndCasesReport,
  parseOccupancyReport,
  parseProvidersAndPracticeReport,
  isRescheduleNote,
  hasRescheduleTag,
} from "@/lib/nookal/parsers";
import { classifyRescheduleNotes } from "@/lib/nookal/rescheduleClassifier";

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
 * Parses an uploaded Nookal report and writes whatever KPIs it maps to —
 * clinic-wide weekly_kpis fields and/or each matched provider's
 * provider_weekly.metrics. Matching a CSV row's provider name to a
 * `providers` row is exact (case-insensitive, trimmed); unmatched names are
 * returned so the caller can surface them rather than silently dropping
 * data (e.g. if a provider's name in Nookal doesn't exactly match the name
 * on the Providers/Settings page).
 *
 * "business_performance" and "aged_debtors" are both parsed below.
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
    clinicPatch.specialty_vestibular_initial = result.specialtyCounts.vestibular.initial;
    clinicPatch.specialty_vestibular_sub = result.specialtyCounts.vestibular.sub;
    clinicPatch.specialty_headaches_initial = result.specialtyCounts.headaches.initial;
    clinicPatch.specialty_headaches_sub = result.specialtyCounts.headaches.sub;
    clinicPatch.specialty_paeds_initial = result.specialtyCounts.paeds.initial;
    clinicPatch.specialty_paeds_sub = result.specialtyCounts.paeds.sub;
    clinicPatch.specialty_womens_health_initial = result.specialtyCounts.womens_health.initial;
    clinicPatch.specialty_womens_health_sub = result.specialtyCounts.womens_health.sub;
    clinicPatch.specialty_hydro_initial = result.specialtyCounts.hydro.initial;
    clinicPatch.specialty_hydro_sub = result.specialtyCounts.hydro.sub;
    // Hydro items rarely say "Initial"/"Subsequent" (unlike the other
    // specialties, which always do), so initial+sub would badly undercount —
    // write the real matched-row total directly instead of relying on a
    // generated initial+sub column.
    clinicPatch.specialty_hydro_total = result.specialtyCounts.hydro.total;
    clinicPatch.clients_seen_names = result.clientsSeenNames;

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
    // Regex pass first — fast, deterministic, always available. Then try
    // upgrading with an LLM read of every rsx/rx-tagged note, which catches
    // phrasing the regex can't (a new way of saying "declined" or "just
    // discussed"). Falls back to the regex result untouched if no API key
    // is configured or the call fails for any reason — never blocks an upload.
    const baseline = parseCancellationsReport(csvText);
    const taggedNotes = Array.from(
      new Set(
        baseline.detailRows
          .filter((r) => r.status === "Cancelled" && r.note && hasRescheduleTag(r.note))
          .map((r) => (r.note as string).trim())
      )
    );
    let result = baseline;
    if (taggedNotes.length > 0) {
      const verdicts = await classifyRescheduleNotes(taggedNotes.map((note, i) => ({ id: String(i), note })));
      if (verdicts) {
        const byNote = new Map(taggedNotes.map((note, i) => [note, verdicts[String(i)]]));
        result = parseCancellationsReport(csvText, (note) => byNote.get(note.trim()) ?? isRescheduleNote(note));
      }
    }
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
      totalEvents += data.eventsCount;
      if (data.bookedWithin7DaysPct !== null) totalBookedWithin7 += data.bookedWithin7DaysPct * data.eventsCount;

      const p = findProvider(name);
      if (p) {
        // booked_within_7_days_pct isn't on the individual KPI Scorecard —
        // it's clinic/admin-level, not per-physio.
        await upsertProviderMetrics(p.id, {
          cancellations: data.cancellations,
          dnas: data.dnas,
          not_rebooked_pct: data.notRebookedPct,
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

    // Raw per-cancellation rows for the Cancellations tab — replace this
    // week's rows entirely so re-uploading a corrected file doesn't leave
    // stale duplicates behind.
    await supabase.from("cancellation_events").delete().eq("week_ending", weekEnding);
    if (result.detailRows.length > 0) {
      await supabase.from("cancellation_events").insert(
        result.detailRows.map((row) => ({
          week_ending: weekEnding,
          appointment_date: row.appointmentDate,
          client: row.client,
          provider: row.provider,
          case_name: row.caseName,
          status: row.status,
          note: row.note,
          next_booking: row.nextBooking,
          modified_user: row.modifiedUser,
          modified_at: row.modifiedAt,
        }))
      );
    }
  } else if (reportType === "clients_and_cases") {
    // A provider's own NPBR can exclude a specialty category (e.g. Nick
    // Baxter's vestibular referrals) via providers.targets.npbr_exclude_keyword.
    const npbrExcludeKeywordsByProvider: Record<string, RegExp> = {};
    for (const p of providers) {
      const keyword = p.targets?.npbr_exclude_keyword;
      if (typeof keyword === "string" && keyword.trim()) {
        npbrExcludeKeywordsByProvider[p.name] = new RegExp(keyword.trim(), "i");
      }
    }
    const result = parseClientsAndCasesReport(csvText, npbrExcludeKeywordsByProvider);
    rowsFound = Object.keys(result.byProvider).length;
    let totalNewClients = 0;

    for (const [name, data] of Object.entries(result.byProvider)) {
      totalNewClients += data.newClients;
      const p = findProvider(name);
      if (!p) continue;
      // Clinic-wide total includes Pre-Employment screenings; each
      // provider's own KPI figure doesn't (see PRE_EMPLOYMENT_PATTERN).
      const patch: Record<string, unknown> = {
        new_patients: data.newClientsExclPreEmployment,
        new_patient_names: data.newClientNames,
      };
      // New Patient Booking Rate: each new client's own "X Complete / Y Total"
      // Bookings count, averaged across all of this provider's new clients
      // that week (see parseClientsAndCasesReport's npbrRecommendationsTotal).
      if (data.newClientsExclPreEmployment > 0) {
        patch.npbr_recommendations = data.npbrRecommendationsTotal;
        patch.new_pt_booking_rate = data.npbrRecommendationsTotal / data.newClientsExclPreEmployment;
      }
      await upsertProviderMetrics(p.id, patch);
    }
    clinicPatch.total_nc = totalNewClients;
  } else if (reportType === "providers_and_practice") {
    // NOTE: Nookal's "Client Visit Average" in this report is NOT the same
    // metric as "CVA" (key: ucva) on the KPI Scorecard/Clinic Analysis — the
    // director's own "where the data comes from" sheet confirms CVA/NCVA/TPR
    // are a rolling-12-month figure from the Business Performance Report
    // (with payer/provider exclusions), which we don't parse here. Do not
    // write this report's "Client Visit Average" anywhere on the scorecard —
    // tried surfacing it as a separate "Personal CVA" row once, and it read
    // as a second, much-lower, confusing number next to the real one (a
    // single week's Services/Unique-Client ratio, ~1.0-1.2, vs. CVA's
    // rolling-year figure) — the director doesn't track two CVAs, just one.
    const result = parseProvidersAndPracticeReport(csvText);
    rowsFound = Object.keys(result.byProvider).length;
    let totalCompletedConsults = 0;

    for (const [name, data] of Object.entries(result.byProvider)) {
      if (data.completedConsults !== null) totalCompletedConsults += data.completedConsults;

      const p = findProvider(name);
      if (!p) continue;
      const patch: Record<string, unknown> = {};
      if (data.completedConsults !== null) patch.completed_consults = data.completedConsults;
      if (data.forwardBookingAverage !== null) patch.fba = data.forwardBookingAverage;
      if (Object.keys(patch).length > 0) await upsertProviderMetrics(p.id, patch);
    }

    if (totalCompletedConsults > 0) clinicPatch.total_consults = totalCompletedConsults;
    // CVA-by-tier (Clinic Analysis: New Grads/2-5yr/Massage/EP/Senior) is
    // NOT auto-filled here — it comes from the Business Performance Report
    // below. It was previously computed from this report's per-week
    // "Client Visit Average", which is a different, mismatched metric.
  } else if (reportType === "business_performance") {
    // The real source of UCVA/NCVA/TPR — confirmed against a real export
    // and the director's own "where the data comes from" sheet. Also feeds
    // the clinic-wide Clinic Analysis CVA-by-tier averages (grouped by
    // providers.targets.experience_tier — "senior" now covers experienced
    // physios like Michael/Nick who aren't role:"senior_physio").
    const result = parseBusinessPerformanceReport(csvText);
    rowsFound = Object.keys(result.byProvider).length;
    const ucvaByTier: Record<string, number[]> = { senior: [], massage: [], ep: [], new_grad: [], "2_5yr": [] };

    for (const [name, data] of Object.entries(result.byProvider)) {
      const p = findProvider(name);
      if (!p) continue;
      const patch: Record<string, unknown> = {};
      if (data.ucva !== null) patch.ucva = data.ucva;
      if (data.ncva !== null) patch.ncva = data.ncva;
      if (data.tpr !== null) patch.tpr = data.tpr;
      if (Object.keys(patch).length > 0) await upsertProviderMetrics(p.id, patch);

      const tier = cvaTierBucket(p);
      if (data.ucva !== null && tier) ucvaByTier[tier].push(data.ucva);
    }

    const seniorAvg = average(ucvaByTier.senior);
    const massageAvg = average(ucvaByTier.massage);
    const epAvg = average(ucvaByTier.ep);
    const newGradAvg = average(ucvaByTier.new_grad);
    const tier25Avg = average(ucvaByTier["2_5yr"]);
    if (seniorAvg !== null) clinicPatch.cva_senior = seniorAvg;
    if (massageAvg !== null) clinicPatch.cva_massage = massageAvg;
    if (epAvg !== null) clinicPatch.cva_ep = epAvg;
    if (newGradAvg !== null) clinicPatch.cva_new_grads = newGradAvg;
    if (tier25Avg !== null) clinicPatch.cva_2_5yr = tier25Avg;
  } else if (reportType === "aged_debtors") {
    const result = parseAgedDebtorsReport(csvText);
    rowsFound = [result.adTotalPrivate, result.adNdis, result.ad3rdParty6190, result.adMedicareDva31].filter(
      (v) => v !== null
    ).length;
    if (result.adTotalPrivate !== null) clinicPatch.ad_total_private = result.adTotalPrivate;
    if (result.adNdis !== null) clinicPatch.ad_ndis = result.adNdis;
    if (result.ad3rdParty6190 !== null) clinicPatch.ad_3rd_party_61_90 = result.ad3rdParty6190;
    if (result.ad3rdParty90 !== null) clinicPatch.ad_3rd_party_90 = result.ad3rdParty90;
    if (result.adMedicareDva31 !== null) clinicPatch.ad_medicare_dva_31 = result.adMedicareDva31;
    if (result.adTotal !== null) clinicPatch.ad_total = result.adTotal;
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
