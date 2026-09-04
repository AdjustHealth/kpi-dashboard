import { SupabaseClient } from "@supabase/supabase-js";
import { NookalReportType } from "@/lib/schema";
import { cvaTierBucket } from "@/lib/cvaTier";
import { extractSection, parseCsvRows, rowToRecord } from "@/lib/nookal/csv";
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

/**
 * Maps a provider's specialty_metrics prefix (e.g. "headache") to the
 * matching key in parseActivityReport's SPECIALTY_CATEGORY_PATTERNS (e.g.
 * "headaches") — only meaningful together with a provider's
 * targets.specialty_clinic_wide_key, see the "activity" branch below.
 */
const SPECIALTY_METRIC_PREFIX_TO_CATEGORY: Record<string, string> = {
  headache: "headaches",
};

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

  /**
   * PVA (excl. pre-employment) needs both halves before it can be computed —
   * the real 12-month Services/Unique Patients from providers_and_practice_12mo
   * (pva_services_all/pva_clients_all) and the real 12-month pre-employment-
   * only counts from activity_pre_employment_12mo (pva_services_pre/
   * pva_clients_pre). Whichever report arrives second (either order) is what
   * actually triggers the computation. Writes straight into the "ucva" KPI
   * field so every existing UCVA display/target/chart/tier-average picks up
   * the real PVA figure with no further changes — see the director's
   * decision to replace UCVA with PVA excl. pre-employment (Sept 2026).
   */
  async function recomputePvaForProvider(providerId: string) {
    const { data: existing } = await supabase
      .from("provider_weekly")
      .select("metrics")
      .eq("provider_id", providerId)
      .eq("week_ending", weekEnding)
      .maybeSingle();
    const m = (existing?.metrics ?? {}) as Record<string, unknown>;
    const { pva_services_all: servicesAll, pva_clients_all: clientsAll, pva_services_pre: servicesPre, pva_clients_pre: clientsPre } = m;
    if (
      typeof servicesAll !== "number" ||
      typeof clientsAll !== "number" ||
      typeof servicesPre !== "number" ||
      typeof clientsPre !== "number"
    ) {
      return;
    }
    const clients = clientsAll - clientsPre;
    if (clients <= 0) return;
    await upsertProviderMetrics(providerId, { ucva: (servicesAll - servicesPre) / clients });
  }

  /** Re-derives the Clinic Analysis tier averages from whatever's currently in each provider's "ucva" field (now PVA) — run after any upload that might have changed it. */
  async function recomputeCvaTierAverages() {
    const { data: rows } = await supabase.from("provider_weekly").select("provider_id, metrics").eq("week_ending", weekEnding);
    const byTier: Record<string, number[]> = { senior: [], massage: [], ep: [], new_grad: [], "2_5yr": [] };
    for (const row of (rows ?? []) as { provider_id: string; metrics: Record<string, unknown> | null }[]) {
      const p = providers.find((pp) => pp.id === row.provider_id);
      const tier = p ? cvaTierBucket(p) : null;
      const ucva = row.metrics?.ucva;
      if (tier && typeof ucva === "number") byTier[tier].push(ucva);
    }
    const seniorAvg = average(byTier.senior);
    const massageAvg = average(byTier.massage);
    const epAvg = average(byTier.ep);
    const newGradAvg = average(byTier.new_grad);
    const tier25Avg = average(byTier["2_5yr"]);
    if (seniorAvg !== null) clinicPatch.cva_senior = seniorAvg;
    if (massageAvg !== null) clinicPatch.cva_massage = massageAvg;
    if (epAvg !== null) clinicPatch.cva_ep = epAvg;
    if (newGradAvg !== null) clinicPatch.cva_new_grads = newGradAvg;
    if (tier25Avg !== null) clinicPatch.cva_2_5yr = tier25Avg;
  }

  if (reportType === "activity") {
    // Specialty consult counts (e.g. Marcio's Headache Init/Sub) are
    // detected from the same Case/Item text as JBV — any provider whose
    // specialty_metrics has a "<x>_init"/"<x>_sub" pair gets both counted
    // automatically instead of typed in by hand each week.
    //
    // Normally this only counts a provider's OWN rows (Staff column ===
    // their name) — but a provider who's responsible for a whole specialty
    // service clinic-wide (targets.specialty_clinic_wide_key, e.g. Marcio
    // for headaches — confirmed with the director 23/8/26: "all headache
    // and TMJ consults need to be included on his personal stat, he is
    // responsible for the service") instead gets the SAME clinic-wide
    // count already computed into result.specialtyCounts below (which also
    // catches "TMJ" wording the per-provider prefix match wouldn't).
    const keywordPatterns: Record<string, RegExp> = {};
    const specialtyKeyMap: Record<string, { providerId: string; initKey: string; subKey: string; clinicWideCategory: string | null }> = {};
    for (const p of providers) {
      const metrics = p.specialty_metrics ?? [];
      const clinicWideKey = typeof p.targets?.specialty_clinic_wide_key === "string" ? p.targets.specialty_clinic_wide_key : null;
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
        specialtyKeyMap[mapKey] = {
          providerId: p.id,
          initKey: m.key,
          subKey,
          clinicWideCategory: clinicWideKey === prefix ? SPECIALTY_METRIC_PREFIX_TO_CATEGORY[prefix] : null,
        };
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
    clinicPatch.m_gym3p = result.gym3pRevenue;
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

    for (const [mapKey, { providerId, initKey, subKey, clinicWideCategory }] of Object.entries(specialtyKeyMap)) {
      if (clinicWideCategory) {
        const counts = result.specialtyCounts[clinicWideCategory];
        // Always write (even 0) — this is the authoritative clinic-wide
        // count, not a per-row match that might legitimately be absent this
        // week, so a real zero is a real zero.
        if (counts) await upsertProviderMetrics(providerId, { [initKey]: counts.initial, [subKey]: counts.sub });
        continue;
      }
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
          not_rebooked: data.notRebooked,
          // Not shown as its own KPI Scorecard field anymore (director wants a
          // raw count instead — see not_rebooked above). retentionPct()
          // (lib/providerData.ts) derives Retention Rate from the raw
          // not_rebooked/cancellations counts, not this — kept only for
          // historical visibility into what the report itself reported.
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
      totalNewClients += data.newClientsExclPreEmployment;
      const p = findProvider(name);
      if (!p) continue;
      // Clinic-wide total excludes Pre-Employment screenings, same as each
      // provider's own KPI figure (see PRE_EMPLOYMENT_PATTERN) — the director
      // decided the clinic-wide number should reflect real new patients too.
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
    // Source of NCVA/TPR — confirmed against a real export and the
    // director's own "where the data comes from" sheet. No longer the
    // source of UCVA/the Clinic Analysis CVA-by-tier averages: as of Sept
    // 2026 the director replaced UCVA with a true rolling-12-month Patient
    // Visit Average excluding pre-employment/corporate-screening patients
    // (see providers_and_practice_12mo/activity_pre_employment_12mo below
    // and recomputePvaForProvider/recomputeCvaTierAverages above) — still
    // written into the same "ucva" field so every existing display/target/
    // chart/tier-average needs no further changes, it's just sourced
    // differently now.
    const result = parseBusinessPerformanceReport(csvText);
    rowsFound = Object.keys(result.byProvider).length;

    for (const [name, data] of Object.entries(result.byProvider)) {
      const p = findProvider(name);
      if (!p) continue;
      const patch: Record<string, unknown> = {};
      if (data.ncva !== null) patch.ncva = data.ncva;
      if (data.tpr !== null) patch.tpr = data.tpr;
      if (Object.keys(patch).length > 0) await upsertProviderMetrics(p.id, patch);
    }
  } else if (reportType === "providers_and_practice_12mo") {
    // Real Nookal-computed rolling-12-month Services/Unique Patients per
    // provider, paired with activity_pre_employment_12mo (below) to compute
    // the true PVA-excl-pre-employment figure that replaces UCVA. A full
    // 12-month Providers and Practice Report doesn't hit the row-volume
    // problem the equivalent Activity Report export does, so this one CAN
    // just be re-run with a rolling 12-month date range every week.
    const result = parseProvidersAndPracticeReport(csvText);
    rowsFound = 0;
    for (const [name, data] of Object.entries(result.byProvider)) {
      const services = data.services ?? data.completedConsults;
      if (services === null || data.uniqueClients === null) continue;
      const p = findProvider(name);
      if (!p) continue;
      rowsFound += 1;
      await upsertProviderMetrics(p.id, { pva_services_all: services, pva_clients_all: data.uniqueClients });
      await recomputePvaForProvider(p.id);
    }
    await recomputeCvaTierAverages();
  } else if (reportType === "activity_pre_employment_12mo") {
    // Nookal Activity Report pre-filtered, via its own Payers parameter, to
    // ONLY Village/Move OT/Top Golf pre-employment screening line items —
    // small enough Nookal can actually export a full rolling 12 months of
    // it (the unfiltered Activity Report crashes Nookal at that row volume,
    // even split by quarter — confirmed 3/9/26). Every row here is already
    // pre-employment by construction, so no case/item pattern-matching is
    // needed, unlike the weekly Activity Report upload.
    const rows = parseCsvRows(csvText);
    const section = extractSection(rows, "Details");
    const byProvider: Record<string, { services: number; clients: Set<string> }> = {};
    if (section) {
      for (const row of section.rows) {
        const r = rowToRecord(section.header, row);
        const provider = r["Staff"];
        if (!provider) continue;
        if (!byProvider[provider]) byProvider[provider] = { services: 0, clients: new Set() };
        byProvider[provider].services += 1;
        const clientName = r["Client"] || r["Patient"];
        if (clientName) byProvider[provider].clients.add(clientName);
      }
    }
    rowsFound = 0;
    for (const [name, data] of Object.entries(byProvider)) {
      const p = findProvider(name);
      if (!p) continue;
      rowsFound += 1;
      await upsertProviderMetrics(p.id, { pva_services_pre: data.services, pva_clients_pre: data.clients.size });
      await recomputePvaForProvider(p.id);
    }
    // Write a confirmed real zero for every OTHER provider too — absence
    // from this file means Nookal found no pre-employment patients for them
    // this period, not "unknown", and recomputePvaForProvider needs a real
    // number (not a missing field) from both halves before it will compute.
    for (const p of providers) {
      if (matched.has(p.name)) continue;
      await upsertProviderMetrics(p.id, { pva_services_pre: 0, pva_clients_pre: 0 });
      await recomputePvaForProvider(p.id);
    }
    await recomputeCvaTierAverages();
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
