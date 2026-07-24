import { createClient } from "@/lib/supabase/server";
import { Provider } from "@/lib/types";
import { reviewCadenceMonths, nextReviewDue, KpiRollups, KpaRollups } from "@/lib/performanceReview";

export interface ReviewSummaryRow {
  provider: Pick<Provider, "id" | "name" | "role" | "targets">;
  cadenceMonths: number;
  lastReviewDate: string | null;
  nextDue: string | null;
  overdue: boolean;
  /** An in-progress (not yet completed) review already exists — link straight to it instead of Prep Review. */
  draftReviewId: string | null;
  latestCompletedReviewId: string | null;
}

/** Every active provider's review status, for the /reviews list page. */
export async function getReviewsOverview(): Promise<ReviewSummaryRow[]> {
  const supabase = await createClient();
  const [{ data: providers }, { data: reviews }] = await Promise.all([
    supabase.from("providers").select("id, name, role, targets").eq("active", true).order("sort_order"),
    supabase
      .from("performance_reviews")
      .select("id, provider_id, review_date, completed_at")
      .order("review_date", { ascending: false }),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const rows = reviews ?? [];

  return ((providers ?? []) as Pick<Provider, "id" | "name" | "role" | "targets">[]).map((provider) => {
    const providerReviews = rows.filter((r) => r.provider_id === provider.id);
    const lastCompleted = providerReviews.find((r) => r.completed_at);
    const draft = providerReviews.find((r) => !r.completed_at);
    const cadenceMonths = reviewCadenceMonths(provider);
    const lastReviewDate = lastCompleted?.review_date ?? null;
    const nextDue = nextReviewDue(lastReviewDate, cadenceMonths);
    return {
      provider,
      cadenceMonths,
      lastReviewDate,
      nextDue,
      overdue: nextDue === null ? true : nextDue <= today,
      draftReviewId: draft?.id ?? null,
      latestCompletedReviewId: lastCompleted?.id ?? null,
    };
  });
}

export interface ReviewHistoryRow {
  id: string;
  reviewDate: string;
  completedAt: string | null;
}

/** Every past review for one provider, newest first — for the detail page's history list. */
export async function getProviderReviewHistory(providerId: string, excludeId?: string): Promise<ReviewHistoryRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("performance_reviews")
    .select("id, review_date, completed_at")
    .eq("provider_id", providerId)
    .order("review_date", { ascending: false });
  if (excludeId) query = query.neq("id", excludeId);
  const { data } = await query;
  return (data ?? []).map((r) => ({ id: r.id, reviewDate: r.review_date, completedAt: r.completed_at }));
}

export interface PerformanceReviewRecord {
  id: string;
  provider_id: string;
  review_date: string;
  completed_at: string | null;
  reviewer: string | null;
  goals_reflection: { text: string; achieved: boolean; note: string }[];
  proud_of: string[];
  areas_for_growth: string[];
  new_goals: { short_term: { text: string; how: string }[]; long_term: { text: string; how: string }[] };
  other_notes: string | null;
  kpi_rollups: KpiRollups;
  kpa_rollups: KpaRollups;
  bonus_summary: Record<string, unknown>;
}

export async function getPerformanceReview(id: string): Promise<{
  review: PerformanceReviewRecord | null;
  provider: Provider | null;
}> {
  const supabase = await createClient();
  const { data: review } = await supabase.from("performance_reviews").select("*").eq("id", id).maybeSingle();
  if (!review) return { review: null, provider: null };
  const { data: provider } = await supabase.from("providers").select("*").eq("id", review.provider_id).maybeSingle();
  return { review: review as PerformanceReviewRecord, provider: provider as Provider | null };
}
