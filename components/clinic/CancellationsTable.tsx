"use client";

import { CSSProperties, useEffect, useMemo, useState } from "react";
import { formatWeekLabel } from "@/lib/week";
import { isRescheduleNote } from "@/lib/nookal/parsers";
import { Input } from "@/components/ui/Field";

export interface CancellationEventRow {
  id: string;
  appointment_date: string | null;
  client: string;
  provider: string | null;
  case_name: string | null;
  status: "Cancelled" | "Did Not Arrive";
  note: string | null;
  next_booking: string | null;
  modified_user: string | null;
  flagged_for_discussion?: boolean;
  discussion_note?: string | null;
  not_rebooked_resolved?: boolean;
}

type SortKey = "appointment_date" | "client" | "provider" | "status" | "next_booking" | "modified_user";

const ALL_COLUMNS: { key: SortKey; label: string }[] = [
  { key: "appointment_date", label: "Date" },
  { key: "client", label: "Client" },
  { key: "provider", label: "Provider" },
  { key: "status", label: "Status" },
  { key: "next_booking", label: "Next Booking" },
  { key: "modified_user", label: "Handled By" },
];

function compareValues(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return 1; // nulls last regardless of direction
  if (b === null) return -1;
  return a.localeCompare(b);
}

export function CancellationsTable({
  rows,
  hideHandledBy,
  hideProvider,
  showResolveAction,
}: {
  rows: CancellationEventRow[];
  /** Omit the "Handled By" column — every row already shares the same value on a single admin's own page. */
  hideHandledBy?: boolean;
  /** Omit the "Provider" column — every row already shares the same value on a single provider's own page. */
  hideProvider?: boolean;
  /** Show a "Dealt With" button that dismisses a row (sets not_rebooked_resolved) — only meaningful on the Not Rebooked list, not the general Cancellations tab. */
  showResolveAction?: boolean;
}) {
  const COLUMNS = ALL_COLUMNS.filter(
    (c) => !(hideHandledBy && c.key === "modified_user") && !(hideProvider && c.key === "provider")
  );
  // Local copy so a flag toggle can update the UI immediately — flags are
  // saved independently of the CSV-sourced columns via /api/cancellation-events.
  const [localRows, setLocalRows] = useState(rows);
  useEffect(() => setLocalRows(rows), [rows]);
  // Default sort matches the server's own order (date, then client).
  const [sortKey, setSortKey] = useState<SortKey>("appointment_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  async function toggleFlag(row: CancellationEventRow) {
    const next = !row.flagged_for_discussion;
    setLocalRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, flagged_for_discussion: next } : r)));
    const res = await fetch("/api/cancellation-events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: row.id, flagged_for_discussion: next }),
    });
    if (!res.ok) {
      // Revert on failure.
      setLocalRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, flagged_for_discussion: !next } : r)));
    }
  }

  async function resolveRow(row: CancellationEventRow) {
    // Optimistically drop it from view — this is a dismiss, not an edit, so
    // there's no "current" value to show while the request is in flight.
    setLocalRows((prev) => prev.filter((r) => r.id !== row.id));
    // Resolve by client+provider (not just this one row's id) — a client
    // who's cancelled repeatedly without rebooking can have several
    // separate cancellation_events rows across different weeks, and
    // dismissing them should mean the client doesn't come back via one of
    // the others a moment later. Falls back to the single row if provider
    // is somehow missing.
    const body = row.provider
      ? { client: row.client, provider: row.provider, not_rebooked_resolved: true }
      : { id: row.id, not_rebooked_resolved: true };
    const res = await fetch("/api/cancellation-events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      // Revert on failure — put it back so it isn't silently lost.
      setLocalRows((prev) => [...prev, row]);
    }
  }

  function editNote(id: string, text: string) {
    setLocalRows((prev) => prev.map((r) => (r.id === id ? { ...r, discussion_note: text } : r)));
  }

  async function saveNote(row: CancellationEventRow) {
    await fetch("/api/cancellation-events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: row.id, discussion_note: row.discussion_note ?? "" }),
    });
  }

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sortedRows = useMemo(() => {
    const withNulls = (r: CancellationEventRow) => (r[sortKey] === null ? null : String(r[sortKey]));
    const sorted = [...localRows].sort((a, b) => compareValues(withNulls(a), withNulls(b)));
    return sortDir === "asc" ? sorted : sorted.reverse();
  }, [localRows, sortKey, sortDir]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
            <th className="w-8 py-2 pl-0 pr-1 font-medium" title="Flag for discussion" />
            {COLUMNS.map((col) => (
              <th key={col.key} className="py-2 px-3 font-medium whitespace-nowrap first:pl-0">
                <button
                  type="button"
                  onClick={() => toggleSort(col.key)}
                  className="flex items-center gap-1 hover:text-accent"
                  title={`Sort by ${col.label}`}
                >
                  {col.label}
                  {sortKey === col.key && <span aria-hidden>{sortDir === "asc" ? "▲" : "▼"}</span>}
                </button>
              </th>
            ))}
            <th className="py-2 px-3 font-medium">Note</th>
            <th className="py-2 px-3 font-medium">Meeting Note</th>
            {showResolveAction && <th className="py-2 px-3 font-medium" />}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => {
            // Same reschedule/not-rebooked signal the KPI stats use (RSX/RX
            // note = staff "saved" it; no Next Booking at all = not rebooked)
            // — only meaningful for real cancellations, not DNAs.
            const rescheduled = row.status === "Cancelled" && Boolean(row.note && isRescheduleNote(row.note));
            const notRebooked = row.status === "Cancelled" && !row.next_booking && !rescheduled;
            const rowStyle: CSSProperties = {
              ...(rescheduled
                ? { backgroundColor: "color-mix(in srgb, var(--color-success) 10%, transparent)" }
                : notRebooked
                  ? { backgroundColor: "color-mix(in srgb, var(--color-danger) 8%, transparent)" }
                  : {}),
              ...(row.flagged_for_discussion ? { boxShadow: "inset 3px 0 0 var(--color-warning)" } : {}),
            };
            return (
            <tr key={row.id} className="border-b border-border/60 last:border-0 align-top" style={rowStyle}>
              <td className="w-8 py-2 pl-0 pr-1">
                <button
                  type="button"
                  onClick={() => toggleFlag(row)}
                  title={row.flagged_for_discussion ? "Unflag" : "Flag to discuss in the meeting"}
                  className="text-base leading-none"
                  style={{ color: row.flagged_for_discussion ? "var(--color-warning)" : "var(--color-muted)" }}
                >
                  {row.flagged_for_discussion ? "★" : "☆"}
                </button>
              </td>
              <td className="py-2 pr-3 pl-0 whitespace-nowrap text-muted">
                {row.appointment_date ? formatWeekLabel(row.appointment_date) : "—"}
              </td>
              <td className="py-2 px-3 whitespace-nowrap text-foreground">{row.client}</td>
              {!hideProvider && (
                <td className="py-2 px-3 whitespace-nowrap text-muted">{row.provider ?? "—"}</td>
              )}
              <td className="py-2 px-3 whitespace-nowrap">
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={
                    row.status === "Did Not Arrive"
                      ? { color: "var(--color-danger)", backgroundColor: "color-mix(in srgb, var(--color-danger) 15%, transparent)" }
                      : { color: "var(--color-muted)", backgroundColor: "var(--color-surface-raised)" }
                  }
                >
                  {row.status}
                </span>
              </td>
              <td className="py-2 px-3 whitespace-nowrap text-muted">
                {row.next_booking ? formatWeekLabel(row.next_booking) : "Not rebooked"}
              </td>
              {!hideHandledBy && (
                <td className="py-2 px-3 whitespace-nowrap text-muted">{row.modified_user ?? "—"}</td>
              )}
              <td className="max-w-md py-2 px-3 text-foreground">{row.note ?? "—"}</td>
              <td className="min-w-48 py-2 px-3">
                <Input
                  value={row.discussion_note ?? ""}
                  placeholder="What to raise…"
                  onChange={(e) => editNote(row.id, e.target.value)}
                  onBlur={() => saveNote(row)}
                  className="py-1 text-xs"
                />
              </td>
              {showResolveAction && (
                <td className="py-2 px-3 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => resolveRow(row)}
                    title="Mark as dealt with — removes it from this list"
                    className="rounded-md border border-border px-2 py-1 text-xs font-medium text-muted hover:border-accent hover:text-accent"
                  >
                    ✓ Dealt with
                  </button>
                </td>
              )}
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
