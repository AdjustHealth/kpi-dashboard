import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { recentWeeks } from "@/lib/week";
import { Provider, ProviderWeekly } from "@/lib/types";
import { WeekMetrics } from "@/components/provider/PerformanceTable";

/**
 * There's no stored mapping from a kpi-dashboard login to a providers row
 * yet — this guesses from the email's local part against each active
 * provider's first name (e.g. "dean@adjust.com.au" -> "Dean" -> "Dean
 * Walker"), same heuristic as lib/programTracker/coach.ts's
 * coachNameForUser(). Exact first-word match, not a substring/startsWith
 * check — "samantha@" must never resolve to "Sam" (a different, real
 * person here) just because "Samantha".startsWith("Sam"). Uses the admin
 * client since a practitioner with no Meetings grant can't otherwise read
 * any providers row at all, including their own — see lib/supabase/admin.ts.
 */
export async function myProvider(email: string | null | undefined): Promise<Provider | null> {
  if (!email) return null;
  const local = email.split("@")[0].split(/[._-]/)[0].toLowerCase();
  const supabase = createAdminClient();
  const { data } = await supabase.from("providers").select("*").eq("active", true);
  const providers = (data ?? []) as Provider[];
  return providers.find((p) => p.name.split(" ")[0].toLowerCase() === local) ?? null;
}

/**
 * Same trend history lib/providerData.ts's getProviderDetailData builds, for
 * the self-service "My Dashboard" page instead of the director's meeting
 * workflow — so it skips meeting notes/six-week-review entirely and uses the
 * admin client for the same reason myProvider() above does: a practitioner
 * with no Meetings grant can't read even their own provider_weekly rows
 * through the ordinary RLS-scoped client. Kept in this file rather than
 * providerData.ts so that file's own unit tests (which import its pure
 * retentionPct() at module load) never transitively pull in "server-only".
 */
export async function getMyProviderHistory(providerId: string, week: string, historyWeeks = 12): Promise<WeekMetrics[]> {
  const supabase = createAdminClient();
  const weeks = recentWeeks(week, historyWeeks);

  const { data } = await supabase.from("provider_weekly").select("*").eq("provider_id", providerId).in("week_ending", weeks);
  const rows = (data ?? []) as ProviderWeekly[];
  const rowsByWeek = new Map(rows.map((r) => [r.week_ending, r]));

  return weeks.map((w) => ({
    week_ending: w,
    metrics: rowsByWeek.get(w)?.metrics ?? {},
    kpas: rowsByWeek.get(w)?.kpas ?? {},
  }));
}
