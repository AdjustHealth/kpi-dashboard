"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatWeekLabel } from "@/lib/week";
import { NOOKAL_REPORT_LABELS, NookalReportType } from "@/lib/schema";

interface ReportResult {
  report_type: NookalReportType;
  file_name: string;
  ok: boolean;
  error?: string;
  summary?: { matchedProviders: string[]; unmatchedNames: string[]; warning?: string };
}

type WeekState =
  | { status: "pending" }
  | { status: "running" }
  | { status: "done"; results: ReportResult[] }
  | { status: "error"; message: string };

/**
 * One-off maintenance tool: re-runs a parsing fix against every PAST week's
 * already-uploaded report files, since a parsing-logic fix only changes how
 * the next upload is read — it never touches numbers a past upload already
 * wrote (see app/api/nookal-reprocess/route.ts). Director-only; re-running
 * is safe (applyNookalReport is idempotent per week/report type), and
 * processes one week at a time client-side rather than one long server
 * request, so progress is visible and a slow/failing week doesn't risk the
 * whole run timing out silently.
 */
export function ReprocessReportsCard() {
  const [weeks, setWeeks] = useState<string[] | null>(null);
  const [weekStates, setWeekStates] = useState<Record<string, WeekState>>({});
  const [running, setRunning] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function loadWeeks() {
    setLoadError(null);
    try {
      const res = await fetch("/api/nookal-reprocess");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not load the week list");
      setWeeks(body.weeks ?? []);
      setWeekStates(Object.fromEntries((body.weeks ?? []).map((w: string) => [w, { status: "pending" }])));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not reach the server");
    }
  }

  async function runAll() {
    if (!weeks) return;
    if (
      !window.confirm(
        `This re-reads ${weeks.length} week(s) of already-uploaded Cancellations/Clients & Cases/Activity/Last Attendances reports with the current (fixed) parsing logic, and overwrites those weeks' stats. It's the same effect as re-uploading each file by hand. Continue?`
      )
    ) {
      return;
    }
    setRunning(true);
    for (const week of weeks) {
      setWeekStates((prev) => ({ ...prev, [week]: { status: "running" } }));
      try {
        const res = await fetch("/api/nookal-reprocess", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ week_ending: week }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Reprocessing failed");
        setWeekStates((prev) => ({ ...prev, [week]: { status: "done", results: body.results ?? [] } }));
      } catch (e) {
        setWeekStates((prev) => ({
          ...prev,
          [week]: { status: "error", message: e instanceof Error ? e.message : "Reprocessing failed" },
        }));
      }
    }
    setRunning(false);
  }

  return (
    <Card title="Reprocess past reports">
      <p className="text-xs text-muted">
        After a parsing fix ships (e.g. a corrected exclusion), past weeks keep their old numbers until the report
        that produced them is re-read — this re-reads every past week&apos;s Cancellations, Clients &amp; Cases,
        Activity, and Last Attendances files (already stored from their original upload) with today&apos;s logic, in
        order, oldest first. Safe to run more than once.
      </p>
      <div className="mt-3 flex items-center gap-2">
        {weeks === null ? (
          <button
            type="button"
            onClick={loadWeeks}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-accent"
          >
            Check what&apos;s available
          </button>
        ) : (
          <button
            type="button"
            onClick={runAll}
            disabled={running || weeks.length === 0}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-accent disabled:opacity-50"
          >
            {running ? "Reprocessing…" : `Reprocess all ${weeks.length} week(s)`}
          </button>
        )}
      </div>
      {loadError && <p className="mt-2 text-xs text-danger">{loadError}</p>}
      {weeks !== null && weeks.length === 0 && <p className="mt-2 text-xs text-muted">No uploaded reports found to reprocess.</p>}
      {weeks !== null && weeks.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {weeks.map((week) => {
            const state = weekStates[week] ?? { status: "pending" };
            return (
              <div key={week} className="rounded-lg border border-border/60 p-2.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground">Week ending {formatWeekLabel(week)}</span>
                  {state.status === "pending" && <Badge>Pending</Badge>}
                  {state.status === "running" && <Badge tone="warning">Reprocessing…</Badge>}
                  {state.status === "done" && <Badge tone="good">Done</Badge>}
                  {state.status === "error" && <Badge tone="critical">Failed</Badge>}
                </div>
                {state.status === "error" && <p className="mt-1 text-danger">{state.message}</p>}
                {state.status === "done" && (
                  <div className="mt-1.5 flex flex-col gap-1">
                    {state.results.length === 0 && <span className="text-muted">No reprocessable reports found for this week.</span>}
                    {state.results.map((r) => (
                      <div key={r.report_type} className="flex flex-wrap items-center gap-1.5">
                        <span className="text-muted">{NOOKAL_REPORT_LABELS[r.report_type]}:</span>
                        {r.ok ? (
                          <>
                            <Badge tone="good">OK</Badge>
                            {!!r.summary?.unmatchedNames?.length && (
                              <span className="text-warning">not matched: {r.summary.unmatchedNames.join(", ")}</span>
                            )}
                          </>
                        ) : (
                          <Badge tone="critical">{r.error}</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
