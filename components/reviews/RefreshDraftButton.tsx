"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Re-snapshots a stale draft's KPI/KPA rollups, bonus pacing and goals
 * reflection to right now — for a draft started long enough ago that its
 * numbers are no longer today's, without having to finish or abandon it
 * first just to get a review with current data. Anything already typed
 * into the draft (reviewer, notes, proud-of, new goals) is left alone —
 * see the `refresh` branch of PATCH /api/performance-reviews.
 */
export function RefreshDraftButton({ reviewId }: { reviewId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    const res = await fetch("/api/performance-reviews", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: reviewId, refresh: true }),
    });
    setLoading(false);
    if (!res.ok) return;
    router.push(`/reviews/${reviewId}`);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={refresh}
      disabled={loading}
      title="Re-snapshot this draft's KPI/KPA numbers to today, keeping anything already typed in"
      className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-accent hover:text-accent disabled:opacity-50"
    >
      {loading ? "Refreshing…" : "Refresh"}
    </button>
  );
}
