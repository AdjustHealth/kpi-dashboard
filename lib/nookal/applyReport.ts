import { SupabaseClient } from "@supabase/supabase-js";
import { NookalReportType } from "@/lib/schema";
import { cvaTierBucket } from "@/lib/cvaTier";
import { shiftWeek } from "@/lib/week";
import {
  parseActivityReport,
  parseAgedDebtorsReport,
  parseBusinessPerformanceReport,
  parseCancellationsReport,
  parseClientsAndCasesReport,
  parseLastAttendancesReport,
  parseOccupancyReport,
  parseOnlineBookingsReport,
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

interface ExistingEventState {
  not_rebooked_resolved: boolean;
  flagged_for_discussion: boolean;
  discussion_note: string | null;
  dealt_with: boolean;
}

/** Join a row's identifying column values into one lookup key — null-safe, since appointment_date/provider/case_name can legitimately be null. */
function eventStateKey(parts: (string | null | undefined)[]): string {
  return parts.map((p) => p ?? "\u0000").join("|");
}

/**
 * Reads back the per-row state (not_rebooked_resolved/flagged_for_discussion/
 * discussion_note/dealt_with) a director or practitioner already set on any
 * existing cancellation_events/no_future_booking_events row, keyed by
 * `keyColumns`, so a delete-then-insert re-upload/reprocess can carry that
 * state forward onto the freshly inserted rows instead of silently
 * resetting it to the column defaults.
 *
 * Deliberately NOT scoped to the week being written (it used to be, see git
 * history) — a Cancellations/Last Attendances Report's rows routinely carry
 * the SAME client/appointment forward across several weeks' files (a
 * recurring/stale-until-rebooked cancellation gets re-exported under next
 * week's week_ending too, not just the week it first happened), and each
 * such upload inserts it as a brand-new row. Scoping this lookup to only
 * the current week_ending meant a plain NEW weekly upload — not just an
 * explicit reprocess — would quietly reopen any client already marked
 * "Dealt with"/resolved the moment their row reappeared under a new week,
 * since the freshly inserted row had no record of its own history. Any
 * provider whose cancellations recur across weeks can hit this, not just
 * whoever happens to get reported first. Searching every week and OR-ing
 * the flags together (true wins, most recent non-null note wins) means
 * once a row is dealt with/resolved/flagged, it stays that way for good,
 * regardless of how many more weeks the same cancellation keeps getting
 * exported under.
 */
async function fetchExistingEventState(
  supabase: SupabaseClient,
  table: "cancellation_events" | "no_future_booking_events",
  keyColumns: string[]
): Promise<Map<string, ExistingEventState>> {
  const { data } = await supabase.from(table).select("*");
  const byKey = new Map<string, ExistingEventState>();
  for (const row of (data ?? []) as unknown as Record<string, unknown>[]) {
    const key = eventStateKey(keyColumns.map((c) => row[c] as string | null));
    const existing = byKey.get(key);
    byKey.set(key, {
      not_rebooked_resolved: Boolean(row.not_rebooked_resolved) || (existing?.not_rebooked_resolved ?? false),
      flagged_for_discussion: Boolean(row.flagged_for_discussion) || (existing?.flagged_for_discussion ?? false),
      discussion_note: (row.discussion_note as string | null) ?? existing?.discussion_note ?? null,
      dealt_with: Boolean(row.dealt_with) || (existing?.dealt_with ?? false),
    });
  }
  return byKey;
}

/**
 * Maps a provider's specialty_metrics prefix (e.g. "headache") to the
 * matching key in parseActivityReport's SPECIALTY_CATEGORY_PATTERNS (e.g.
 * "headaches") — only meaningful together with a provider's
 * targets.specialty_clinic_wide_key, see the "activity" branch below.
 */
const SPECIALTY_METRIC_PREFIX_TO_CATEGORY: Record<string, string> = {
  headache: "headaches",
  womens_health: "womens_health",
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

  /**
   * Every provider's provider_weekly.metrics for this week, loaded ONCE up
   * front instead of a select-then-upsert DB round trip per metric per
   * provider. The old per-call select+upsert pattern, multiplied across
   * upsertProviderMetrics/recomputePvaForProvider/recomputeNcvaForProvider,
   * added up to ~10 sequential awaited queries per provider on a
   * providers_and_practice_12mo upload — ~150 across 15 providers in one
   * request. On a serverless function with a timeout, that silently cut off
   * partway through, leaving later providers (by object-iteration order)
   * with stale numbers while earlier ones updated — exactly the "some
   * providers didn't update" symptom this was causing. Every write below
   * mutates this cache; the one real DB write is a single batched upsert at
   * the very end of this function.
   */
  const { data: weeklyRows } = await supabase.from("provider_weekly").select("provider_id, metrics").eq("week_ending", weekEnding);
  const metricsCache = new Map<string, Record<string, unknown>>();
  for (const row of (weeklyRows ?? []) as { provider_id: string; metrics: Record<string, unknown> | null }[]) {
    metricsCache.set(row.provider_id, row.metrics ?? {});
  }
  const dirtyProviderIds = new Set<string>();

  async function upsertProviderMetrics(providerId: string, patch: Record<string, unknown>) {
    metricsCache.set(providerId, { ...(metricsCache.get(providerId) ?? {}), ...patch });
    dirtyProviderIds.add(providerId);
  }

  /**
   * Same preload-once/batch-write treatment for pre_employment_activity_weekly
   * (PVA/NCVA's trailing-52-week pre-employment ledger) — one query covering
   * every provider's whole window instead of a per-provider query inside
   * every recompute call. Keyed by provider then week so writing (or
   * reprocessing) this week's row REPLACES that week's contribution in the
   * running sum instead of double-counting it on top of the stale preloaded
   * value.
   */
  const windowStart = shiftWeek(weekEnding, -51);
  const { data: ledgerRowsAll } = await supabase
    .from("pre_employment_activity_weekly")
    .select("provider_id, week_ending, services, client_names")
    .gte("week_ending", windowStart)
    .lte("week_ending", weekEnding);
  const ledgerByProvider = new Map<string, Map<string, { services: number; clientNames: string[] }>>();
  for (const row of (ledgerRowsAll ?? []) as { provider_id: string; week_ending: string; services: number; client_names: string[] }[]) {
    if (!ledgerByProvider.has(row.provider_id)) ledgerByProvider.set(row.provider_id, new Map());
    ledgerByProvider.get(row.provider_id)!.set(row.week_ending, { services: row.services, clientNames: row.client_names ?? [] });
  }
  const ledgerDirtyRows: { provider_id: string; week_ending: string; services: number; client_names: string[] }[] = [];

  function setLedgerRow(providerId: string, services: number, clientNames: string[]) {
    if (!ledgerByProvider.has(providerId)) ledgerByProvider.set(providerId, new Map());
    ledgerByProvider.get(providerId)!.set(weekEnding, { services, clientNames });
    ledgerDirtyRows.push({ provider_id: providerId, week_ending: weekEnding, services, client_names: clientNames });
  }

  function ledgerTrailingSum(providerId: string): { services: number; clientNames: Set<string> } {
    let services = 0;
    const clientNames = new Set<string>();
    for (const [week, row] of ledgerByProvider.get(providerId) ?? []) {
      if (week < windowStart || week > weekEnding) continue;
      services += row.services;
      for (const c of row.clientNames) clientNames.add(c);
    }
    return { services, clientNames };
  }

  /**
   * PVA (excl. pre-employment) needs both halves before it can be computed —
   * the real 12-month Services/Unique Patients from providers_and_practice_12mo
   * (pva_services_all/pva_clients_all on this provider's own week), and the
   * pre-employment subtraction, which comes from summing the trailing
   * 52 weeks of pre_employment_activity_weekly (a ledger fed by the
   * director's REGULAR weekly Activity Report upload — see the "activity"
   * branch below). Whichever completes second (a fresh 12-month upload, or
   * this week's Activity Report landing in the ledger) triggers the
   * recompute. Writes straight into the "ucva" KPI field so every existing
   * UCVA display/target/chart/tier-average picks up the real PVA figure
   * with no further changes — see the director's decision to replace UCVA
   * with PVA excl. pre-employment (Sept 2026).
   */
  async function recomputePvaForProvider(providerId: string) {
    const m = metricsCache.get(providerId) ?? {};
    const { pva_services_all: servicesAll, pva_clients_all: clientsAll } = m;
    if (typeof servicesAll !== "number" || typeof clientsAll !== "number") return;

    const { services: servicesPre, clientNames: clientsPreSeen } = ledgerTrailingSum(providerId);
    const clients = clientsAll - clientsPreSeen.size;
    if (clients <= 0) return;
    await upsertProviderMetrics(providerId, { ucva: (servicesAll - servicesPre) / clients });
  }

  /**
   * NCVA (excl. pre-employment) — same shape as recomputePvaForProvider
   * above, but denominated on New Patients instead of Unique Patients
   * (ncva_services_all/ncva_new_patients_all, also written by the
   * providers_and_practice_12mo branch below), and reusing the SAME
   * pre_employment_activity_weekly ledger — no second ledger needed.
   * Validated against a real 12-month pull 24/10/26: Nookal's own NCVA (the
   * Business Performance Report figure this replaces) bakes gym Class
   * participants into the numerator, which is why it ran high for
   * class-heavy providers (confirmed against Lachlan/Wilson/Sam's real
   * Classes/Participants counts). The Providers and Practice Report's
   * "Services" column already excludes Classes, so a WorkCover/NDIS 1:1 gym
   * consult (billed as a Service) still counts, but a group Gym Supervision
   * class (billed as a Class) doesn't — with no separate gym-class ledger
   * or regex needed. Writes into the same "ncva" field every existing
   * display/target/chart reads.
   */
  async function recomputeNcvaForProvider(providerId: string) {
    const m = metricsCache.get(providerId) ?? {};
    const { ncva_services_all: servicesAll, ncva_new_patients_all: newPatientsAll } = m;
    if (typeof servicesAll !== "number" || typeof newPatientsAll !== "number") return;

    const { services: servicesPre, clientNames: clientsPreSeen } = ledgerTrailingSum(providerId);
    const newPatients = newPatientsAll - clientsPreSeen.size;
    if (newPatients <= 0) return;
    await upsertProviderMetrics(providerId, { ncva: (servicesAll - servicesPre) / newPatients });
  }

  /**
   * Re-derives the Clinic Analysis tier averages from whatever's currently
   * in each provider's "ucva" field (now PVA) — run after any upload that
   * might have changed it. Reads metricsCache, not the DB — the batched
   * flush at the end of this function means a DB select here would miss
   * every write this same invocation just made.
   */
  async function recomputeCvaTierAverages() {
    const byTier: Record<string, number[]> = { senior: [], massage: [], ep: [], new_grad: [], "2_5yr": [] };
    for (const p of providers) {
      const tier = cvaTierBucket(p);
      const ucva = metricsCache.get(p.id)?.ucva;
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

    // Feeds pre_employment_activity_weekly — this week's pre-employment
    // rows, per provider, from the director's normal Activity Report
    // upload. A trailing-52-week sum of this ledger is PVA's rolling
    // pre-employment subtraction, so no separate 12-month export is needed
    // for it (see recomputePvaForProvider above). Write a confirmed zero
    // for every provider NOT in this file too — absence means Nookal found
    // no pre-employment patients for them this week, not "unknown".
    for (const [name, data] of Object.entries(result.preEmploymentByProvider)) {
      const p = findProvider(name);
      if (!p) continue;
      setLedgerRow(p.id, data.services, data.clientNames);
      await recomputePvaForProvider(p.id);
      await recomputeNcvaForProvider(p.id);
    }
    for (const p of providers) {
      if (matched.has(p.name) && result.preEmploymentByProvider[p.name]) continue;
      setLedgerRow(p.id, 0, []);
      await recomputePvaForProvider(p.id);
      await recomputeNcvaForProvider(p.id);
    }
    await recomputeCvaTierAverages();
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
    // stale duplicates behind. BUT first carry over any per-row state a
    // director/practitioner already set on the rows being replaced
    // (not_rebooked_resolved/flagged_for_discussion/discussion_note/
    // dealt_with) — a plain delete-then-insert discards those outright,
    // since a freshly inserted row has no way to know it's "the same"
    // cancellation as the one just deleted. Confirmed the hard way: Dean's
    // week got reprocessed to fix his NPBR, and a Cancellations Report
    // commonly carries rows with much older appointment_dates than its own
    // week_ending (recurring/stale carry-through cancellations) — so EVERY
    // provider's already-"Dealt with" Unretained rows that happened to
    // appear in that one week's file reverted to unresolved at once, not
    // just Dean's.
    const existingCancellationState = await fetchExistingEventState(
      supabase,
      "cancellation_events",
      ["client", "provider", "appointment_date", "case_name", "status"]
    );
    await supabase.from("cancellation_events").delete().eq("week_ending", weekEnding);
    if (result.detailRows.length > 0) {
      await supabase.from("cancellation_events").insert(
        result.detailRows.map((row) => {
          const existing = existingCancellationState.get(
            eventStateKey([row.client, row.provider, row.appointmentDate, row.caseName, row.status])
          );
          return {
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
            not_rebooked_resolved: existing?.not_rebooked_resolved ?? false,
            flagged_for_discussion: existing?.flagged_for_discussion ?? false,
            discussion_note: existing?.discussion_note ?? null,
            dealt_with: existing?.dealt_with ?? false,
          };
        })
      );
    }
  } else if (reportType === "last_attendances") {
    // Catches what the Cancellations Report structurally can't: a client
    // who attended a real appointment (no cancellation involved at all —
    // e.g. handed from one provider to another) and simply never books
    // again. Same delete-then-insert-per-week convention as
    // cancellation_events, feeding getNotRebookedClients as a second,
    // clearly-labelled source (see lib/clinicData.ts) — same per-row-state
    // carry-over as cancellation_events above, for the same reason.
    const result = parseLastAttendancesReport(csvText);
    rowsFound = result.rows.length;
    const existingFollowUpState = await fetchExistingEventState(
      supabase,
      "no_future_booking_events",
      ["client", "provider", "last_booking_date", "case_name"]
    );
    await supabase.from("no_future_booking_events").delete().eq("week_ending", weekEnding);
    if (result.rows.length > 0) {
      await supabase.from("no_future_booking_events").insert(
        result.rows.map((row) => {
          const existing = existingFollowUpState.get(
            eventStateKey([row.client, row.provider, row.lastBookingDate, row.caseName])
          );
          return {
            week_ending: weekEnding,
            client: row.client,
            provider: row.provider,
            last_booking_date: row.lastBookingDate,
            booking_type: row.bookingType,
            case_name: row.caseName,
            case_status: row.caseStatus,
            not_rebooked_resolved: existing?.not_rebooked_resolved ?? false,
            flagged_for_discussion: existing?.flagged_for_discussion ?? false,
            discussion_note: existing?.discussion_note ?? null,
            dealt_with: existing?.dealt_with ?? false,
          };
        })
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
      // Explicitly null/zero (not skipped) when there are no real new clients
      // left after exclusions — the bug that left Dean's NPBR showing a stale
      // pre-Occupational-Health-fix number even after the regex fix shipped
      // and the week was reprocessed: Beau Guyler was his ONLY "new client"
      // that week, so newClientsExclPreEmployment dropped to 0 once excluded,
      // this `if` skipped writing anything at all, and the old (wrong, Beau-
      // inclusive) new_pt_booking_rate just sat there untouched forever.
      if (data.newClientsExclPreEmployment > 0) {
        patch.npbr_recommendations = data.npbrRecommendationsTotal;
        patch.new_pt_booking_rate = data.npbrRecommendationsTotal / data.newClientsExclPreEmployment;
      } else {
        patch.npbr_recommendations = 0;
        patch.new_pt_booking_rate = null;
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
    // Source of TPR only now. Used to also be the source of NCVA, but as of
    // 24/10/26 the director replaced it with a true rolling-12-month
    // Services/New Patients figure (see providers_and_practice_12mo below
    // and recomputeNcvaForProvider above) — Nookal's own NCVA bakes gym
    // Class participants into the numerator (confirmed against a real
    // 12-month pull: Lachlan/Wilson/Sam's inflated NCVA matched almost
    // exactly once their Classes/Participants counts were added back in),
    // on top of whichever Payers filter happened to be selected at export
    // time swinging the New Patients denominator. No longer the source of
    // UCVA/the Clinic Analysis CVA-by-tier averages either — see the
    // Sept 2026 PVA change (recomputePvaForProvider/recomputeCvaTierAverages
    // above).
    const result = parseBusinessPerformanceReport(csvText);
    rowsFound = Object.keys(result.byProvider).length;

    for (const [name, data] of Object.entries(result.byProvider)) {
      const p = findProvider(name);
      if (!p) continue;
      if (data.tpr !== null) await upsertProviderMetrics(p.id, { tpr: data.tpr });
    }
  } else if (reportType === "providers_and_practice_12mo") {
    // Real Nookal-computed rolling-12-month Services/Unique Patients/New
    // Patients per provider — the "all" half of both PVA-excl-pre-employment
    // and NCVA-excl-pre-employment (the pre-employment subtraction for both
    // comes from the SAME pre_employment_activity_weekly ledger, fed by the
    // normal weekly Activity Report upload — see recomputePvaForProvider/
    // recomputeNcvaForProvider/the "activity" branch above). Services here
    // already excludes gym Classes (a separate column in this same report),
    // so NCVA needs no further gym-class exclusion of its own — a
    // WorkCover/NDIS 1:1 gym consult still counts (it's a Service), a group
    // Gym Supervision class doesn't (it's a Class). A full 12-month
    // Providers and Practice Report doesn't hit the row-volume problem the
    // equivalent Activity Report export does, so this one CAN just be
    // re-run with a rolling 12-month date range every week.
    const result = parseProvidersAndPracticeReport(csvText);
    rowsFound = 0;
    for (const [name, data] of Object.entries(result.byProvider)) {
      const services = data.services ?? data.completedConsults;
      if (services === null || data.uniqueClients === null) continue;
      const p = findProvider(name);
      if (!p) continue;
      rowsFound += 1;
      const patch: Record<string, unknown> = { pva_services_all: services, pva_clients_all: data.uniqueClients };
      if (data.newPatients !== null) {
        patch.ncva_services_all = services;
        patch.ncva_new_patients_all = data.newPatients;
      }
      await upsertProviderMetrics(p.id, patch);
      await recomputePvaForProvider(p.id);
      if (data.newPatients !== null) await recomputeNcvaForProvider(p.id);
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
  } else if (reportType === "online_bookings") {
    // Clinic-wide only — no per-provider breakdown is tracked for this,
    // same as the fields it replaces (see lib/schema.ts's online_bookings_*/
    // all_bookings_* comments). newClientBookingsTotal === 0 still writes a
    // real 0, same "a confirmed zero is a real zero" reasoning as the other
    // clinic-wide counts in this file — a week with genuinely no online
    // "Initial" bookings shouldn't leave a stale number from a prior week.
    const result = parseOnlineBookingsReport(csvText);
    rowsFound = result.allBookingsTotal;
    clinicPatch.online_bookings_total = result.newClientBookingsTotal;
    clinicPatch.online_bookings_new = result.newClientBookingsOnline;
    clinicPatch.all_bookings_total = result.allBookingsTotal;
    clinicPatch.all_bookings_online = result.allBookingsOnline;
  }

  // The one real write for everything upsertProviderMetrics/setLedgerRow
  // staged above — see the comment on metricsCache near the top of this
  // function.
  if (dirtyProviderIds.size > 0) {
    await supabase.from("provider_weekly").upsert(
      Array.from(dirtyProviderIds).map((id) => ({ provider_id: id, week_ending: weekEnding, metrics: metricsCache.get(id) ?? {} })),
      { onConflict: "provider_id,week_ending" }
    );
  }
  if (ledgerDirtyRows.length > 0) {
    await supabase.from("pre_employment_activity_weekly").upsert(ledgerDirtyRows, { onConflict: "provider_id,week_ending" });
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
