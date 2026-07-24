"use client";

import { useState, CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { SaveIndicator } from "@/components/ui/SaveIndicator";
import { Input, Textarea } from "@/components/ui/Field";
import { Sparkline } from "@/components/charts/Sparkline";
import { KpaRadarChart, RadarRow } from "@/components/charts/KpaRadarChart";
import { KpiProgressBar } from "@/components/charts/KpiProgressBar";
import { targetColor } from "@/lib/targetColor";
import { formatValue } from "@/lib/format";
import { formatWeekLabel } from "@/lib/week";
import { useBatchedAutosave } from "@/lib/useBatchedAutosave";
import { ROLLING_WINDOWS } from "@/lib/performanceReview";
import { metricFieldsForRole, kpaGroupsForRole, KPA_RATING_LABELS, KPA_RATINGS, KpaRating } from "@/lib/providerSchema";
import { Provider } from "@/lib/types";
import { PerformanceReviewRecord, ReviewHistoryRow } from "@/lib/reviewsData";

interface NewGoal {
  text: string;
  how: string;
}
interface NewGoals {
  short_term: NewGoal[];
  long_term: NewGoal[];
}
interface GoalReflection {
  text: string;
  achieved: boolean;
  note: string;
}

function pad3<T>(arr: T[] | undefined, empty: T): T[] {
  const a = arr ?? [];
  return [0, 1, 2].map((i) => a[i] ?? empty);
}

function ratingPillStyle(rating: KpaRating): CSSProperties {
  return rating === "above_and_beyond"
    ? { color: "var(--color-success)", backgroundColor: "color-mix(in srgb, var(--color-success) 15%, transparent)" }
    : rating === "demonstrated"
      ? { color: "var(--color-warning)", backgroundColor: "color-mix(in srgb, var(--color-warning) 15%, transparent)" }
      : { color: "var(--color-danger)", backgroundColor: "color-mix(in srgb, var(--color-danger) 15%, transparent)" };
}

/** Click cycles Not Met -> Demonstrated -> Above & Beyond -> Not Met — starts from the auto-computed rating, director can override to match their own judgement. */
function EditableRatingPill({ rating, onChange }: { rating: KpaRating | null; onChange: (next: KpaRating) => void }) {
  function cycle() {
    if (!rating) {
      onChange(KPA_RATINGS[0]);
      return;
    }
    const idx = KPA_RATINGS.indexOf(rating);
    onChange(KPA_RATINGS[(idx + 1) % KPA_RATINGS.length]);
  }
  return (
    <button
      type="button"
      onClick={cycle}
      title="Click to change rating"
      className="rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap transition-opacity hover:opacity-80"
      style={rating ? ratingPillStyle(rating) : { color: "var(--color-muted)", backgroundColor: "var(--color-surface-raised)" }}
    >
      {rating ? KPA_RATING_LABELS[rating] : "Not enough data"}
    </button>
  );
}

export function ReviewDetailView({
  review,
  provider,
  history,
  cadenceMonths,
  targets,
  weeklySeries,
}: {
  review: PerformanceReviewRecord;
  provider: Provider;
  history: ReviewHistoryRow[];
  cadenceMonths: number;
  targets: Record<string, unknown>;
  /** Every stored week for this provider, oldest first — for the sparkline next to each rollup number. */
  weeklySeries: { week_ending: string; metrics: Record<string, unknown> }[];
}) {
  const router = useRouter();
  const [reviewer, setReviewer] = useState(review.reviewer ?? "");
  const [reviewDate, setReviewDate] = useState(review.review_date);
  const [goalsReflection, setGoalsReflection] = useState<GoalReflection[]>(
    (review.goals_reflection ?? []).map((g) => ({ ...g, note: g.note ?? "" }))
  );
  const [proudOf, setProudOf] = useState<string[]>(pad3(review.proud_of, ""));
  const [areasForGrowth, setAreasForGrowth] = useState<string[]>(pad3(review.areas_for_growth, ""));
  const [otherNotes, setOtherNotes] = useState(review.other_notes ?? "");
  const [newGoals, setNewGoals] = useState<NewGoals>({
    short_term: pad3(review.new_goals?.short_term, { text: "", how: "" }),
    long_term: pad3(review.new_goals?.long_term, { text: "", how: "" }),
  });
  const [completing, setCompleting] = useState(false);
  const [completedAt, setCompletedAt] = useState(review.completed_at);
  const [kpaRollups, setKpaRollups] = useState(review.kpa_rollups);
  const [bonusSummary, setBonusSummary] = useState<Record<string, unknown>>(review.bonus_summary ?? {});

  const { status, set, flush } = useBatchedAutosave(async (patch) => {
    const res = await fetch("/api/performance-reviews", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: review.id, patch }),
    });
    if (!res.ok) throw new Error("save failed");
  });

  async function completeReview() {
    await flush();
    setCompleting(true);
    const res = await fetch("/api/performance-reviews", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: review.id, complete: true }),
    });
    setCompleting(false);
    if (res.ok) {
      setCompletedAt(new Date().toISOString());
      router.refresh();
    }
  }

  const metricFields = metricFieldsForRole(provider.role).filter((f) => f.key in review.kpi_rollups);
  const specialtyFields = (provider.specialty_metrics ?? []).filter((f) => f.key in review.kpi_rollups);
  const kpaGroups = kpaGroupsForRole(provider.role);
  const windows = ROLLING_WINDOWS.slice(0, 2); // 6mth + 1yr shown by default; data for 2yr/3yr fills in as history grows

  function updateKpaRating(fieldKey: string, windowKey: string, rating: KpaRating) {
    const next = { ...kpaRollups, [fieldKey]: { ...kpaRollups[fieldKey], [windowKey]: rating } };
    setKpaRollups(next);
    set("kpa_rollups", next);
  }

  function updateBonusSummary(patch: Record<string, unknown>) {
    const next = { ...bonusSummary, ...patch };
    setBonusSummary(next);
    set("bonus_summary", next);
  }

  const hasBonusSummary = typeof bonusSummary.cumulative_turnover === "number";

  function sparklineValues(fieldKey: string): (number | null)[] {
    return weeklySeries.map((w) => (typeof w.metrics[fieldKey] === "number" ? (w.metrics[fieldKey] as number) : null));
  }

  const kpiFieldsWithTargets = metricFields.filter((f) => typeof targets[f.key] === "number" && f.betterWhen);

  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span>
            <span className="text-muted">Review Date </span>
            <input
              type="date"
              value={reviewDate}
              onChange={(e) => {
                setReviewDate(e.target.value);
                set("review_date", e.target.value);
              }}
              className="rounded-md border border-border bg-surface-raised px-2 py-1 text-sm text-foreground"
            />
          </span>
          <span>
            <span className="text-muted">Reviewer </span>
            <input
              value={reviewer}
              placeholder="e.g. Michael"
              onChange={(e) => {
                setReviewer(e.target.value);
                set("reviewer", e.target.value);
              }}
              className="w-32 rounded-md border border-border bg-surface-raised px-2 py-1 text-sm text-foreground"
            />
          </span>
          <span className="rounded-full bg-accent-secondary/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent-secondary">
            {cadenceMonths === 6 ? "6-Monthly" : "Annual"}
          </span>
          <span
            className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
            style={
              completedAt
                ? { color: "var(--color-success)", backgroundColor: "color-mix(in srgb, var(--color-success) 15%, transparent)" }
                : { color: "var(--color-muted)", backgroundColor: "var(--color-surface-raised)" }
            }
          >
            {completedAt ? `Completed ${formatWeekLabel(completedAt.slice(0, 10))}` : "In Progress"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <SaveIndicator status={status} />
          <button
            type="button"
            onClick={completeReview}
            disabled={completing}
            className="rounded-md bg-accent px-4 py-1.5 text-xs font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-50"
          >
            {completing ? "Completing…" : completedAt ? "Mark Complete Again" : "Complete Review"}
          </button>
        </div>
      </div>

      {goalsReflection.length > 0 && (
        <Card title="Goals Reflection — From Last Review">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="py-2 pr-3 font-medium">Goal</th>
                  <th className="py-2 px-3 font-medium">Status</th>
                  <th className="py-2 px-3 font-medium">Notes from this review</th>
                </tr>
              </thead>
              <tbody>
                {goalsReflection.map((g, i) => (
                  <tr key={i} className="border-b border-border/60 last:border-0 align-top">
                    <td className="py-2.5 pr-3 max-w-sm text-foreground">{g.text}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                        style={
                          g.achieved
                            ? { color: "var(--color-success)", backgroundColor: "color-mix(in srgb, var(--color-success) 15%, transparent)" }
                            : { color: "var(--color-warning)", backgroundColor: "color-mix(in srgb, var(--color-warning) 15%, transparent)" }
                        }
                      >
                        {g.achieved ? "Achieved" : "Not Yet"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 min-w-64">
                      <Input
                        value={g.note}
                        placeholder="Notes..."
                        onChange={(e) => {
                          const next = goalsReflection.map((gg, ii) => (ii === i ? { ...gg, note: e.target.value } : gg));
                          setGoalsReflection(next);
                          set("goals_reflection", next);
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {kpaGroups.map((group) => {
        const radarRows: RadarRow[] = group.fields.map((field) => ({
          behaviour: field.label,
          ratingsByWindow: kpaRollups[field.key] ?? {},
        }));
        return (
        <Card key={group.title} title={`${group.title} — Rolling Averages`}>
          <p className="mb-3 text-xs text-muted">
            Auto-computed from the most common weekly rating in each window — click any rating to override it.
          </p>
          {group.fields.length >= 3 && <KpaRadarChart rows={radarRows} windows={windows} />}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="py-2 pr-3 font-medium">Behaviour</th>
                  {windows.map((w) => (
                    <th key={w.key} className="py-2 px-3 text-right font-medium whitespace-nowrap">
                      {w.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {group.fields.map((field) => (
                  <tr key={field.key} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-3 text-foreground">{field.label}</td>
                    {windows.map((w) => (
                      <td key={w.key} className="py-2 px-3 text-right whitespace-nowrap">
                        <EditableRatingPill
                          rating={kpaRollups[field.key]?.[w.key] ?? null}
                          onChange={(rating) => updateKpaRating(field.key, w.key, rating)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        );
      })}

      <Card title="KPI Scorecard — Rolling Averages">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-3 font-medium">KPI</th>
                <th className="py-2 px-3 font-medium">Trend</th>
                {windows.map((w) => (
                  <th key={w.key} className="py-2 px-3 text-right font-medium whitespace-nowrap">
                    {w.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metricFields.map((field, i) => {
                const target = targets[field.key];
                return (
                  <tr key={field.key} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-3 text-foreground">{field.label}</td>
                    <td className="py-2 px-3">
                      <Sparkline values={sparklineValues(field.key)} colorIndex={i} />
                    </td>
                    {windows.map((w) => {
                      const value = review.kpi_rollups[field.key]?.[w.key] ?? null;
                      const color = targetColor(value, target, field.betterWhen);
                      return (
                        <td key={w.key} className="py-2 px-3 text-right whitespace-nowrap">
                          <span className={color ? "font-medium" : "text-muted"} style={color ? { color } : undefined}>
                            {value === null ? "—" : formatValue(value, field.type, field.decimals)}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {kpiFieldsWithTargets.length > 0 && (
        <Card title="KPI Progress vs Target">
          <p className="mb-3 text-xs text-muted">Same numbers as the table above, shown against target — the {windows[0].label.toLowerCase()} window.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {kpiFieldsWithTargets.map((field) => (
              <KpiProgressBar
                key={field.key}
                label={field.label}
                value={review.kpi_rollups[field.key]?.[windows[0].key] ?? null}
                target={targets[field.key] as number}
                betterWhen={field.betterWhen}
                format={field.type === "boolean" || field.type === "rating" ? "number" : field.type}
                decimals={field.decimals}
              />
            ))}
          </div>
        </Card>
      )}

      {specialtyFields.length > 0 && (
        <Card title="⭐ Specialty KPIs — Rolling Averages" className="border-2 border-accent-secondary/50 bg-accent-secondary/[0.05]">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-accent-secondary/25 text-left text-xs uppercase tracking-wide text-muted">
                  <th className="py-2 pr-3 font-medium">Metric</th>
                  <th className="py-2 px-3 font-medium">Trend</th>
                  {windows.map((w) => (
                    <th key={w.key} className="py-2 px-3 text-right font-medium whitespace-nowrap">
                      {w.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {specialtyFields.map((field, i) => {
                  const target = provider.targets[field.key];
                  return (
                    <tr key={field.key} className="border-b border-accent-secondary/15 last:border-0">
                      <td className="py-2 pr-3 text-foreground">{field.label}</td>
                      <td className="py-2 px-3">
                        <Sparkline values={sparklineValues(field.key)} colorIndex={i + 3} />
                      </td>
                      {windows.map((w) => {
                        const value = review.kpi_rollups[field.key]?.[w.key] ?? null;
                        const color = targetColor(value, target, "higher");
                        return (
                          <td key={w.key} className="py-2 px-3 text-right whitespace-nowrap">
                            <span className={color ? "font-medium" : "text-muted"} style={color ? { color } : undefined}>
                              {value === null ? "—" : formatValue(value, field.type === "boolean" ? "number" : field.type)}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {hasBonusSummary && (
        <Card title="💰 Bonus &amp; Growth" className="border-2 border-amber-400/60 bg-amber-400/[0.06] dark:border-amber-300/40 dark:bg-amber-300/[0.05]">
          <div className="mb-4 flex flex-wrap gap-6">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted">Cumulative Turnover</div>
              <div className="text-lg font-semibold text-foreground">
                {formatValue(bonusSummary.cumulative_turnover as number, "currency")}
              </div>
            </div>
            {typeof bonusSummary.base_target_cumulative === "number" && (
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted">Base Target</div>
                <div className="text-lg font-semibold text-foreground">
                  {formatValue(bonusSummary.base_target_cumulative as number, "currency")}
                </div>
              </div>
            )}
            {typeof bonusSummary.pacing_pct === "number" && (
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted">Turnover Pacing</div>
                <div
                  className="text-lg font-semibold"
                  style={{ color: (bonusSummary.pacing_pct as number) >= 100 ? "var(--color-success)" : "var(--color-danger)" }}
                >
                  {(bonusSummary.pacing_pct as number).toFixed(1)}%
                </div>
              </div>
            )}
            {bonusSummary.bonus_metric_label != null && (
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted">{String(bonusSummary.bonus_metric_label)}</div>
                <div className="text-lg font-semibold text-foreground">
                  {bonusSummary.bonus_metric_value == null
                    ? "—"
                    : bonusSummary.bonus_metric_target != null
                      ? `${bonusSummary.bonus_metric_value} / ${bonusSummary.bonus_metric_target}`
                      : String(bonusSummary.bonus_metric_value)}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-amber-400/30 pt-4">
            <p className="mb-3 text-xs text-muted">
              Reference numbers only — confirm against the actual bonus formula before deciding. This isn&apos;t computed
              automatically.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted">Bonus Achieved?</span>
                <select
                  value={(bonusSummary.achieved as string) ?? ""}
                  onChange={(e) => updateBonusSummary({ achieved: e.target.value || null })}
                  className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground"
                >
                  <option value="">Not decided yet</option>
                  <option value="yes">Yes</option>
                  <option value="partial">Partial</option>
                  <option value="no">No</option>
                </select>
              </label>
              <div className="flex-1">
                <Textarea
                  value={(bonusSummary.notes as string) ?? ""}
                  placeholder="Notes on the bonus decision..."
                  onChange={(e) => updateBonusSummary({ notes: e.target.value })}
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card title="3 Things They're Proud Of">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {proudOf.map((v, i) => (
            <Textarea
              key={i}
              value={v}
              placeholder={`#${i + 1}`}
              onChange={(e) => {
                const next = proudOf.map((x, ii) => (ii === i ? e.target.value : x));
                setProudOf(next);
                set("proud_of", next);
              }}
            />
          ))}
        </div>
      </Card>

      <Card title="Areas for Growth">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {areasForGrowth.map((v, i) => (
            <Textarea
              key={i}
              value={v}
              placeholder={`#${i + 1}`}
              onChange={(e) => {
                const next = areasForGrowth.map((x, ii) => (ii === i ? e.target.value : x));
                setAreasForGrowth(next);
                set("areas_for_growth", next);
              }}
            />
          ))}
        </div>
      </Card>

      <Card title="New Performance Review Goals">
        <p className="mb-4 text-xs text-muted">
          Only the first 3 (short-term first) carry over to {provider.name.split(" ")[0]}&apos;s weekly Goals card — every
          goal set here stays on this review record regardless.
        </p>
        {(["short_term", "long_term"] as const).map((term) => (
          <div key={term} className={term === "long_term" ? "mt-5 border-t border-border pt-5" : ""}>
            <div className="mb-2.5 text-xs font-semibold text-foreground">{term === "short_term" ? "Short Term" : "Long Term"}</div>
            <div className="flex flex-col gap-3">
              {newGoals[term].map((g, i) => (
                <div key={i} className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <Input
                    value={g.text}
                    placeholder="Goal"
                    onChange={(e) => {
                      const list = newGoals[term].map((x, ii) => (ii === i ? { ...x, text: e.target.value } : x));
                      const next = { ...newGoals, [term]: list };
                      setNewGoals(next);
                      set("new_goals", next);
                    }}
                  />
                  <Input
                    value={g.how}
                    placeholder="How will they achieve this?"
                    onChange={(e) => {
                      const list = newGoals[term].map((x, ii) => (ii === i ? { ...x, how: e.target.value } : x));
                      const next = { ...newGoals, [term]: list };
                      setNewGoals(next);
                      set("new_goals", next);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </Card>

      <Card title="Other Items to Discuss">
        <Textarea
          value={otherNotes}
          placeholder="Anything else raised in the meeting..."
          onChange={(e) => {
            setOtherNotes(e.target.value);
            set("other_notes", e.target.value);
          }}
        />
      </Card>

      {history.length > 0 && (
        <Card title="Review History">
          <div className="flex flex-col">
            {history.map((h) => (
              <Link
                key={h.id}
                href={`/reviews/${h.id}`}
                className="flex items-center justify-between gap-3 border-b border-border/60 py-2.5 text-sm last:border-0 hover:text-accent"
              >
                <span className="font-medium">{formatWeekLabel(h.reviewDate)}</span>
                <span className="text-xs text-muted">{h.completedAt ? "Completed" : "In Progress"}</span>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
