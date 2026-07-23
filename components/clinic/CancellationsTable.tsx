"use client";

import { useMemo, useState } from "react";
import { formatWeekLabel } from "@/lib/week";
import { isRescheduleNote } from "@/lib/nookal/parsers";

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
}

type SortKey = "appointment_date" | "client" | "provider" | "status" | "next_booking" | "modified_user";

const COLUMNS: { key: SortKey; label: string }[] = [
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

export function CancellationsTable({ rows }: { rows: CancellationEventRow[] }) {
  // Default sort matches the server's own order (date, then client).
  const [sortKey, setSortKey] = useState<SortKey>("appointment_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

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
    const sorted = [...rows].sort((a, b) => compareValues(withNulls(a), withNulls(b)));
    return sortDir === "asc" ? sorted : sorted.reverse();
  }, [rows, sortKey, sortDir]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
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
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => {
            // Same reschedule/not-rebooked signal the KPI stats use (RSX/RX
            // note = staff "saved" it; no Next Booking at all = not rebooked)
            // — only meaningful for real cancellations, not DNAs.
            const rescheduled = row.status === "Cancelled" && Boolean(row.note && isRescheduleNote(row.note));
            const notRebooked = row.status === "Cancelled" && !row.next_booking && !rescheduled;
            const rowStyle = rescheduled
              ? { backgroundColor: "color-mix(in srgb, var(--color-success) 10%, transparent)" }
              : notRebooked
                ? { backgroundColor: "color-mix(in srgb, var(--color-danger) 8%, transparent)" }
                : undefined;
            return (
            <tr key={row.id} className="border-b border-border/60 last:border-0 align-top" style={rowStyle}>
              <td className="py-2 pr-3 pl-0 whitespace-nowrap text-muted">
                {row.appointment_date ? formatWeekLabel(row.appointment_date) : "—"}
              </td>
              <td className="py-2 px-3 whitespace-nowrap text-foreground">{row.client}</td>
              <td className="py-2 px-3 whitespace-nowrap text-muted">{row.provider ?? "—"}</td>
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
              <td className="py-2 px-3 whitespace-nowrap text-muted">{row.modified_user ?? "—"}</td>
              <td className="max-w-md py-2 px-3 text-foreground">{row.note ?? "—"}</td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
