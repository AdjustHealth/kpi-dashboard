"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { formatWeekLabel } from "@/lib/week";
import { FollowUpRow } from "@/lib/providerIdentity";

/**
 * A practitioner's own "Last Attendances" follow-ups for the week — clients
 * who attended a real appointment (no cancellation at all) and simply
 * haven't booked again. Same persistent "Dealt with" tick as
 * CancellationsTable's showDealtWithToggle (never removes the row, just
 * marks it done for the rest of the week) — kept as its own small component
 * rather than folded into CancellationsTable since no_future_booking_events
 * rows don't share that table's shape (no appointment/status/next booking).
 */
export function MyFollowUpsCard({ rows }: { rows: FollowUpRow[] }) {
  const [localRows, setLocalRows] = useState(rows);
  // Re-sync local (optimistically-edited) rows when the server hands down a
  // fresh set (e.g. navigating back to the page) — adjusting state during
  // render instead of an Effect, per React's own guidance for "resetting
  // state when a prop changes".
  const [prevRows, setPrevRows] = useState(rows);
  if (rows !== prevRows) {
    setPrevRows(rows);
    setLocalRows(rows);
  }

  async function toggleDealtWith(row: FollowUpRow) {
    const next = !row.dealt_with;
    setLocalRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, dealt_with: next } : r)));
    const res = await fetch("/api/my-week-events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "followup", id: row.id, dealt_with: next }),
    });
    if (!res.ok) {
      setLocalRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, dealt_with: !next } : r)));
    }
  }

  return (
    <Card title={`Following Up — No Booking Since${localRows.length > 0 ? ` (${localRows.length})` : ""}`}>
      {localRows.length === 0 ? (
        <p className="text-sm text-muted">No one on this list for the week — everyone who attended has a future booking.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-3 pl-0 font-medium">Client</th>
                <th className="py-2 px-3 font-medium">Last Booking</th>
                <th className="py-2 px-3 font-medium">Booking Type</th>
                <th className="py-2 px-3 text-center font-medium">Dealt With</th>
              </tr>
            </thead>
            <tbody>
              {localRows.map((row) => (
                <tr key={row.id} className="border-b border-border/60 last:border-0" style={row.dealt_with ? { opacity: 0.5 } : undefined}>
                  <td className="py-2 pr-3 pl-0 whitespace-nowrap text-foreground" style={row.dealt_with ? { textDecoration: "line-through" } : undefined}>
                    {row.client}
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap text-muted">
                    {row.last_booking_date ? formatWeekLabel(row.last_booking_date) : "—"}
                  </td>
                  <td className="py-2 px-3 text-muted">{row.booking_type ?? "—"}</td>
                  <td className="py-2 px-3 text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => toggleDealtWith(row)}
                      title={row.dealt_with ? "Mark as not yet dealt with" : "Mark as dealt with — stays visible for the rest of the week"}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-md border text-xs font-bold transition-colors"
                      style={
                        row.dealt_with
                          ? { borderColor: "var(--color-success)", color: "var(--color-success)", backgroundColor: "color-mix(in srgb, var(--color-success) 18%, transparent)" }
                          : { borderColor: "var(--color-border)", color: "var(--color-muted)" }
                      }
                    >
                      ✓
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-muted">
        Each week&apos;s list is its own — nothing carries over. Next week&apos;s upload starts a fresh list, and this one stays exactly as you left it.
      </p>
    </Card>
  );
}
