"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatWeekLabel, defaultWeekEnding, recentWeeks } from "@/lib/week";

interface WeekPreview {
  weekEnding: string;
  error?: string;
  before: { onlineBookingsNew: number | null; totalNewPatients: number | null; phoneInPerson: number | null };
  after: { onlineBookingsNew: number | null; totalNewPatients: number | null; phoneInPerson: number | null };
  changed: boolean;
}

function fmt(n: number | null): string {
  return n === null ? "—" : String(n);
}

/**
 * Read-only check for the "New Clients — Online vs. Phone / In-Person"
 * chart: re-reads a past week's already-uploaded Online Bookings Report
 * with today's cross-reference logic (see lib/nookal/applyReport.ts's
 * previewOnlineBookingsWeek) and shows what would change, WITHOUT writing
 * anything — so a week can be checked before committing to the full
 * "Reprocess past reports" tool above, which overwrites immediately.
 */
export function OnlineBookingsPreviewCard() {
  const [weekCount, setWeekCount] = useState(3);
  const [results, setResults] = useState<WeekPreview[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runPreview() {
    setLoading(true);
    setError(null);
    try {
      const weeks = recentWeeks(defaultWeekEnding(), weekCount);
      const res = await fetch("/api/nookal-reprocess/online-bookings-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weeks }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not run the preview");
      setResults(body.results ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reach the server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="Preview: Online vs. Phone / In-Person split">
      <p className="text-xs text-muted">
        Read-only - re-reads each week&apos;s already-uploaded Online Bookings Report with today&apos;s logic
        (cross-referenced against the real new-client list) and shows what would change, without writing anything.
        Use &quot;Reprocess past reports&quot; above to actually apply a week shown as changed here.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <label className="text-xs text-muted">
          Last{" "}
          <input
            type="number"
            min={1}
            max={12}
            value={weekCount}
            onChange={(e) => setWeekCount(Math.max(1, Math.min(12, Number(e.target.value) || 1)))}
            className="mx-1 w-12 rounded border border-border bg-surface-raised px-1.5 py-0.5 text-center text-foreground"
          />
          weeks
        </label>
        <button
          type="button"
          onClick={runPreview}
          disabled={loading}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-accent disabled:opacity-50"
        >
          {loading ? "Checking…" : "Run preview"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      {results && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="py-1.5 pr-3 font-medium">Week</th>
                <th className="py-1.5 px-3 font-medium">Total New Patients</th>
                <th className="py-1.5 px-3 font-medium">Online (stored)</th>
                <th className="py-1.5 px-3 font-medium">Online (recomputed)</th>
                <th className="py-1.5 px-3 font-medium">Phone/In-Person (stored)</th>
                <th className="py-1.5 px-3 font-medium">Phone/In-Person (recomputed)</th>
                <th className="py-1.5 px-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.weekEnding} className="border-b border-border/60 last:border-0">
                  <td className="py-1.5 pr-3 whitespace-nowrap text-foreground">{formatWeekLabel(r.weekEnding)}</td>
                  {r.error ? (
                    <td colSpan={6} className="py-1.5 px-3 text-muted">
                      {r.error}
                    </td>
                  ) : (
                    <>
                      <td className="py-1.5 px-3">{fmt(r.before.totalNewPatients)}</td>
                      <td className="py-1.5 px-3">{fmt(r.before.onlineBookingsNew)}</td>
                      <td className="py-1.5 px-3 font-semibold text-foreground">{fmt(r.after.onlineBookingsNew)}</td>
                      <td className="py-1.5 px-3">{fmt(r.before.phoneInPerson)}</td>
                      <td className="py-1.5 px-3 font-semibold text-foreground">{fmt(r.after.phoneInPerson)}</td>
                      <td className="py-1.5 px-3">{r.changed ? <Badge tone="warning">Changed</Badge> : <Badge tone="good">Correct</Badge>}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
