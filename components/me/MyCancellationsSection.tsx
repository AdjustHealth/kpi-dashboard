"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { CancellationsTable, CancellationEventRow } from "@/components/clinic/CancellationsTable";
import { MyFollowUpsCard } from "@/components/me/MyFollowUpsCard";
import { FollowUpRow } from "@/lib/providerIdentity";
import { formatWeekLabel } from "@/lib/week";

/**
 * Fetches this week's cancellations/follow-ups client-side, after the rest
 * of My Dashboard has already rendered — deliberately NOT awaited inline in
 * app/(app)/me/page.tsx's server render, so a slow or failing lookup here
 * can never take the whole page down with it (stats/goals/coaching load all
 * come from separate queries that shouldn't depend on this one succeeding).
 */
export function MyCancellationsSection({ week }: { week: string }) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "ready"; cancellations: CancellationEventRow[]; followUps: FollowUpRow[] }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/my-week-events?week=${week}`)
      .then(async (res) => {
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setState({ status: "error", message: body.error ?? "Something went wrong" });
          return;
        }
        setState({ status: "ready", cancellations: body.cancellations ?? [], followUps: body.followUps ?? [] });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", message: "Could not reach the server" });
      });
    return () => {
      cancelled = true;
    };
  }, [week]);

  const weekLabel = `Week Ending ${formatWeekLabel(week)}`;

  if (state.status === "loading") {
    return (
      <Card title={`Cancellations — ${weekLabel}`}>
        <p className="text-sm text-muted">Loading…</p>
      </Card>
    );
  }

  if (state.status === "error") {
    return <p className="text-sm text-danger">Could not load your cancellations: {state.message}</p>;
  }

  return (
    <>
      <Card title={`Cancellations — ${weekLabel}${state.cancellations.length > 0 ? ` (${state.cancellations.length})` : ""}`}>
        {state.cancellations.length === 0 ? (
          <p className="text-sm text-muted">No cancellations or DNAs of yours this week.</p>
        ) : (
          <CancellationsTable rows={state.cancellations} hideProvider showDealtWithToggle />
        )}
      </Card>
      <MyFollowUpsCard rows={state.followUps} />
    </>
  );
}
