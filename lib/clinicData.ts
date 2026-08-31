import { createClient } from "@/lib/supabase/server";
import { recentWeeks } from "@/lib/week";
import { cvaTierBucket, CvaTier } from "@/lib/cvaTier";
import { retentionPct } from "@/lib/providerData";
import { isRescheduleNote, isCancellationExcludedFromStats } from "@/lib/nookal/parsers";
import { CancellationEventRow } from "@/components/clinic/CancellationsTable";

export interface ClinicWeekRow {
  week_ending: string;
  [key: string]: unknown;
}

export async function getClinicHistory(week: string, historyWeeks = 12): Promise<ClinicWeekRow[]> {
  const supabase = await createClient();
  const weeks = recentWeeks(week, historyWeeks);
  const { data } = await supabase.from("weekly_kpis").select("*").in("week_ending", weeks);
  const byWeek = new Map((data ?? []).map((r) => [r.week_ending as string, r as ClinicWeekRow]));
  return weeks.map((w) => byWeek.get(w) ?? { week_ending: w });
}

export async function getClinicTargets(): Promise<Record<string, unknown>> {
  const supabase = await createClient();
  const { data } = await supabase.from("clinic_targets").select("values").eq("id", "clinic").maybeSingle();
  return data?.values ?? {};
}

/** Role-level target sets ("providers" / "senior" / "admin"), keyed by group id — see lib/targetsSchema.ts. */
export async function getRoleTargets(): Promise<Record<string, Record<string, unknown>>> {
  const supabase = await createClient();
  const { data } = await supabase.from("role_targets").select("id, values");
  const out: Record<string, Record<string, unknown>> = {};
  for (const row of data ?? []) {
    out[row.id as string] = (row.values as Record<string, unknown>) ?? {};
  }
  return out;
}

export interface ClinicWideCvaRollup {
  avgCva: number | null;
  avgNcva: number | null;
  /** TPR is already a per-provider total (e.g. 5 consults x $100 = $500) — the clinic-wide figure averages those totals across providers, it doesn't sum them again. */
  avgTpr: number | null;
  providerCount: number;
}

export interface ProviderNewClients {
  providerName: string;
  names: string[];
}

function average(values: number[]): number | null {
  return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

/**
 * A clinic-level rollup of provider CVA/NCVA/TPR — no dedicated Weekly
 * Input field for this exists, so it's computed on the fly from that
 * week's provider_weekly rows rather than typed in separately.
 */
export async function getClinicWideCvaRollup(week: string): Promise<ClinicWideCvaRollup> {
  const supabase = await createClient();
  const [providersResult, weeklyResult] = await Promise.all([
    supabase.from("providers").select("id, role").eq("active", true),
    supabase.from("provider_weekly").select("provider_id, metrics").eq("week_ending", week),
  ]);
  const clinicianIds = new Set(
    (providersResult.data ?? []).filter((p) => p.role !== "admin").map((p) => p.id as string)
  );
  const rows = (weeklyResult.data ?? []).filter((r) => clinicianIds.has(r.provider_id as string));

  const cvas = rows.map((r) => (r.metrics as Record<string, unknown>)?.ucva).filter((v): v is number => typeof v === "number");
  const ncvas = rows.map((r) => (r.metrics as Record<string, unknown>)?.ncva).filter((v): v is number => typeof v === "number");
  const tprs = rows.map((r) => (r.metrics as Record<string, unknown>)?.tpr).filter((v): v is number => typeof v === "number");

  return {
    avgCva: average(cvas),
    avgNcva: average(ncvas),
    avgTpr: average(tprs),
    providerCount: cvas.length,
  };
}

export interface ProviderCvaSeries {
  providerName: string;
  role: string;
  /** CVA-tier bucket (lib/cvaTier.ts) — used to color multi-provider comparison charts by tier instead of one hue per person. */
  tier: CvaTier | null;
  points: { week_ending: string; value: number | null }[];
}

/** Each active clinician's own value for a given provider_weekly.metrics key over time, for a per-provider comparison chart. */
export async function getProviderMetricHistory(
  week: string,
  historyWeeks: number,
  metricKey: string
): Promise<ProviderCvaSeries[]> {
  const supabase = await createClient();
  const weeks = recentWeeks(week, historyWeeks);
  const [providersResult, weeklyResult] = await Promise.all([
    supabase.from("providers").select("id, name, role, targets").eq("active", true).order("sort_order"),
    supabase.from("provider_weekly").select("provider_id, week_ending, metrics").in("week_ending", weeks),
  ]);
  const providers = (providersResult.data ?? []) as { id: string; name: string; role: string; targets: Record<string, unknown> | null }[];
  const rows = (weeklyResult.data ?? []) as { provider_id: string; week_ending: string; metrics: Record<string, unknown> }[];
  const byProviderWeek = new Map(rows.map((r) => [`${r.provider_id}:${r.week_ending}`, r.metrics]));

  return providers
    .filter((p) => p.role !== "admin")
    .map((p) => ({
      providerName: p.name,
      role: p.role,
      tier: cvaTierBucket({ role: p.role, targets: p.targets }),
      points: weeks.map((w) => {
        const v = byProviderWeek.get(`${p.id}:${w}`)?.[metricKey];
        return { week_ending: w, value: typeof v === "number" ? v : null };
      }),
    }))
    .filter((s) => s.points.some((pt) => pt.value !== null));
}

/** Each clinician's list of new patients this week (from the Clients & Cases upload), for the director to review. */
export async function getNewClientsByProvider(week: string): Promise<ProviderNewClients[]> {
  const supabase = await createClient();
  const [providersResult, weeklyResult] = await Promise.all([
    supabase.from("providers").select("id, name, role").eq("active", true).order("sort_order"),
    supabase.from("provider_weekly").select("provider_id, metrics").eq("week_ending", week),
  ]);
  const providers = (providersResult.data ?? []) as { id: string; name: string; role: string }[];
  const metricsByProvider = new Map(
    (weeklyResult.data ?? []).map((r) => [r.provider_id as string, r.metrics as Record<string, unknown>])
  );

  return providers
    .filter((p) => p.role !== "admin")
    .map((p) => {
      const names = metricsByProvider.get(p.id)?.new_patient_names;
      return { providerName: p.name, names: Array.isArray(names) ? (names as string[]) : [] };
    })
    .filter((p) => p.names.length > 0);
}

export interface AdminTeamRow {
  providerId: string;
  providerName: string;
  metrics: Record<string, unknown>;
}

/**
 * Every active admin staff member's own cancellation-handling stats for one
 * week, side by side — matches the original spreadsheet's "admin team"
 * comparison tab (Cancellations Handled / Not Rebooked / Reschedule Rate /
 * etc., one row per person). retention_pct is synthetic (see
 * lib/providerData.ts's retentionPct), same as every other admin/provider page.
 */
export async function getAdminTeamComparison(week: string): Promise<AdminTeamRow[]> {
  const supabase = await createClient();
  const [providersResult, weeklyResult] = await Promise.all([
    supabase.from("providers").select("id, name").eq("role", "admin").eq("active", true).order("sort_order"),
    supabase.from("provider_weekly").select("provider_id, metrics").eq("week_ending", week),
  ]);
  const metricsByProvider = new Map(
    (weeklyResult.data ?? []).map((r) => [r.provider_id as string, (r.metrics as Record<string, unknown>) ?? {}])
  );
  return ((providersResult.data ?? []) as { id: string; name: string }[]).map((p) => {
    const metrics = metricsByProvider.get(p.id) ?? {};
    return {
      providerId: p.id,
      providerName: p.name,
      metrics: { ...metrics, retention_pct: retentionPct(metrics) },
    };
  });
}

export interface NewPatientRetention {
  /** How many weeks back "new" was measured from — the retention window. */
  lookbackWeeks: number;
  /** Patients marked new in that week. */
  newPatientCount: number;
  /** Of those, how many have had at least one visit (any provider, any reason) since. */
  retainedCount: number;
  retentionPct: number | null;
}

/**
 * % of patients who were new `lookbackWeeks` ago who've had at least one
 * visit since — a simple, transparent proxy for new-patient retention that
 * doesn't need a full per-client attendance ledger: "new" comes from
 * provider_weekly.metrics.new_patient_names (Clients & Cases upload),
 * "still showing up" comes from weekly_kpis.clients_seen_names (every
 * distinct client on that week's Activity Report), unioned across the weeks
 * since. Name-matched, so a client whose name is entered inconsistently
 * between reports won't match — same caveat as everywhere else names are
 * cross-referenced in this app.
 */
export async function getNewPatientRetention(week: string, lookbackWeeks = 4): Promise<NewPatientRetention> {
  const supabase = await createClient();
  const weeks = recentWeeks(week, lookbackWeeks + 1); // oldest..newest, oldest = the "new patient" week
  const newPatientWeek = weeks[0];
  const sinceWeeks = weeks.slice(1); // every week after the new-patient week, through `week`

  const [newPatientRows, seenRows] = await Promise.all([
    supabase.from("provider_weekly").select("metrics").eq("week_ending", newPatientWeek),
    supabase.from("weekly_kpis").select("clients_seen_names").in("week_ending", sinceWeeks),
  ]);

  const newPatients = new Set<string>();
  for (const row of newPatientRows.data ?? []) {
    const names = (row.metrics as Record<string, unknown> | null)?.new_patient_names;
    if (Array.isArray(names)) for (const n of names) if (typeof n === "string") newPatients.add(n);
  }

  const seenSince = new Set<string>();
  for (const row of seenRows.data ?? []) {
    const names = row.clients_seen_names;
    if (Array.isArray(names)) for (const n of names) if (typeof n === "string") seenSince.add(n);
  }

  const retained = Array.from(newPatients).filter((n) => seenSince.has(n));

  return {
    lookbackWeeks,
    newPatientCount: newPatients.size,
    retainedCount: retained.length,
    retentionPct: newPatients.size > 0 ? retained.length / newPatients.size : null,
  };
}

/**
 * A provider's own clients who cancelled and had no future booking at
 * all in that cancellation's own report — i.e. they've fallen out of the
 * diary entirely, not just rescheduled to a different day. Director
 * request: surface this on the provider/senior physio meeting page so it
 * gets followed up rather than quietly forgotten.
 *
 * Not scoped to a single week — the whole point is to keep catching anyone
 * who slipped through, however long ago they cancelled, until someone
 * marks it dealt with (not_rebooked_resolved — a manual dismiss, since
 * there's no live sync back to Nookal to know a client's been rebooked).
 * Same "Cancelled status, no next_booking, not a reschedule note"
 * definition already used for the Cancellations tab's red-row styling —
 * DNAs aren't included, matching that precedent. Also excludes whatever the
 * Cancellations/Not Rebooked KPI stats themselves exclude (bulk/whole-plan-
 * cancel notes, corporate screening partners, HotDoc placeholders, stale
 * ghost recurring slots — see isCancellationExcludedFromStats) — otherwise
 * a client whose whole plan was cancelled weeks ago keeps reappearing on
 * this follow-up list forever even though the KPI count (correctly) stopped
 * counting them as needing action. Confirmed against Tayla Cattanach's real
 * data: her weekly Not Rebooked count has read 0 for two months straight
 * while this list kept surfacing the same handful of already-resolved
 * whole-plan cancellations (Bodhi Behan, Sophie Halbert, etc.) every week.
 */
export async function getNotRebookedClients(providerName: string): Promise<CancellationEventRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cancellation_events")
    .select("*")
    .eq("provider", providerName)
    .eq("status", "Cancelled")
    .eq("not_rebooked_resolved", false)
    .is("next_booking", null)
    .order("appointment_date", { ascending: false });

  const rows = (data ?? []) as CancellationEventRow[];
  const actionable = rows.filter(
    (r) =>
      !(r.note && isRescheduleNote(r.note)) &&
      !isCancellationExcludedFromStats({
        note: r.note,
        caseName: r.case_name,
        client: r.client,
        appointmentDate: r.appointment_date,
        modifiedAt: r.modified_at ?? null,
      })
  );

  // One row per cancellation instance — a client who's cancelled more than
  // once without rebooking would otherwise show up repeatedly; keep just
  // their most recent (rows are already newest-first).
  const seen = new Set<string>();
  return actionable.filter((r) => {
    if (seen.has(r.client)) return false;
    seen.add(r.client);
    return true;
  });
}

export interface DropOutRatePoint {
  week_ending: string;
  value: number | null;
}

/**
 * Drop Out Rate — % of a provider's DISTINCT clients who cancelled in a
 * given week and, as of right now, still have no future booking — same
 * "genuinely not rebooked" definition as getNotRebookedClients above
 * (excludes reschedule-note cancellations, respects the not_rebooked_
 * resolved manual dismiss). Deduped by client so someone cancelling
 * several appointments in the same week without rebooking only counts
 * once, per the director's ask. Denominator is that week's distinct
 * cancelling clients — same convention as the existing Not Rebooked %
 * clinic stat (a % of cancellations, not of total caseload, which isn't
 * tracked as a client list anywhere).
 *
 * Recomputed live from current data rather than stored per week, so a
 * past week's rate can improve later once someone confirms a client
 * actually got rebooked and resolves it — the whole point being that a
 * client who "fell out weeks ago" but has since been rebooked shouldn't
 * keep counting as a drop out.
 */
export async function getDropOutRateHistory(providerName: string, weeks: string[]): Promise<DropOutRatePoint[]> {
  if (weeks.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("cancellation_events")
    .select("week_ending, client, note, next_booking, not_rebooked_resolved, case_name, appointment_date, modified_at")
    .eq("provider", providerName)
    .eq("status", "Cancelled")
    .in("week_ending", weeks);

  const rows = (data ?? []) as {
    week_ending: string;
    client: string;
    note: string | null;
    next_booking: string | null;
    not_rebooked_resolved: boolean | null;
    case_name: string | null;
    appointment_date: string | null;
    modified_at: string | null;
  }[];
  const notRescheduled = rows.filter(
    (r) =>
      !(r.note && isRescheduleNote(r.note)) &&
      !isCancellationExcludedFromStats({
        note: r.note,
        caseName: r.case_name,
        client: r.client,
        appointmentDate: r.appointment_date,
        modifiedAt: r.modified_at,
      })
  );

  return weeks.map((week_ending) => {
    const weekRows = notRescheduled.filter((r) => r.week_ending === week_ending);
    const clients = new Set(weekRows.map((r) => r.client));
    if (clients.size === 0) return { week_ending, value: null };
    const droppedOut = new Set(
      weekRows.filter((r) => r.next_booking === null && !r.not_rebooked_resolved).map((r) => r.client)
    );
    return { week_ending, value: droppedOut.size / clients.size };
  });
}
