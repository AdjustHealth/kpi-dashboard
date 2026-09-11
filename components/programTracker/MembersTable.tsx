"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Field";
import { Member } from "@/lib/programTracker/types";
import { fmtDate, holdEndOf } from "@/lib/programTracker/date";
import { MemberModal } from "@/components/programTracker/MemberModal";

const FILTERS = ["All", "OVERDUE", "Due this week", "Upcoming", "On hold"] as const;
type Filter = (typeof FILTERS)[number];

type SortCol = "name" | "coach" | "type" | "status" | "next_due" | "due_status";
const DUE_STATUS_ORDER: Record<string, number> = { OVERDUE: 0, "Hold overdue": 0, "Due this week": 1, "Hold ending soon": 1, Upcoming: 2, "On hold": 3, "": 4 };
const SORT_COLS: { key: SortCol; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "coach", label: "Coach" },
  { key: "type", label: "Type" },
  { key: "status", label: "Status" },
  { key: "next_due", label: "Next due" },
  { key: "due_status", label: "Due status" },
];

const COACH_COLORS: Record<string, string> = {
  Dean: "#9c27b0",
  Sam: "#d9690a",
  Wilson: "#00897b",
  Michael: "#1565c0",
  Lachlan: "#558b2f",
};

function dueStatusTone(status: string | null): "neutral" | "good" | "warning" | "critical" {
  if (status === "OVERDUE" || status === "Hold overdue") return "critical";
  if (status === "Due this week" || status === "Hold ending soon") return "warning";
  if (status === "Upcoming") return "good";
  return "neutral";
}

function TypeBadge({ type }: { type: string | null }) {
  const n = (type ?? "").toLowerCase().replace(/[\s-]/g, "");
  if (n === "youth")
    return (
      <span className="rounded-full border px-2 py-0.5 text-[11px] font-semibold" style={{ color: "#a6e22e", borderColor: "#a6e22e88", backgroundColor: "#a6e22e26", boxShadow: "0 0 8px #a6e22e40" }}>
        Youth
      </span>
    );
  if (n === "movestrong")
    return (
      <span className="rounded-full border px-2 py-0.5 text-[11px] font-semibold" style={{ color: "#34d399", borderColor: "#34d39988", backgroundColor: "#34d39926", boxShadow: "0 0 8px #34d39940" }}>
        Move Strong
      </span>
    );
  return <span className="text-xs text-muted">{type || "—"}</span>;
}

export function MembersTable({ initialMembers }: { initialMembers: Member[] }) {
  const [members, setMembers] = useState(initialMembers);
  const [filter, setFilter] = useState<Filter>("All");
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<SortCol>("name");
  const [sortDir, setSortDir] = useState<1 | -1>(1);

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortCol(col);
      setSortDir(1);
    }
  }
  const [editing, setEditing] = useState<Member | null>(null);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { All: members.length, OVERDUE: 0, "Due this week": 0, Upcoming: 0, "On hold": 0 };
    for (const m of members) {
      if (m.due_status === "OVERDUE" || m.due_status === "Hold overdue") c.OVERDUE++;
      else if (m.due_status === "Due this week" || m.due_status === "Hold ending soon") c["Due this week"]++;
      else if (m.due_status === "Upcoming") c.Upcoming++;
      else if (m.due_status === "On hold") c["On hold"]++;
    }
    return c;
  }, [members]);

  const rows = useMemo(() => {
    const sl = search.trim().toLowerCase();
    return members
      .filter((m) => {
        if (filter === "OVERDUE" && !(m.due_status === "OVERDUE" || m.due_status === "Hold overdue")) return false;
        if (filter === "Due this week" && !(m.due_status === "Due this week" || m.due_status === "Hold ending soon")) return false;
        if (filter === "Upcoming" && m.due_status !== "Upcoming") return false;
        if (filter === "On hold" && m.due_status !== "On hold") return false;
        if (sl && !`${m.name} ${m.coach ?? ""} ${m.notes ?? ""}`.toLowerCase().includes(sl)) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortCol === "due_status") {
          const av = DUE_STATUS_ORDER[a.due_status ?? ""] ?? 4;
          const bv = DUE_STATUS_ORDER[b.due_status ?? ""] ?? 4;
          return (av - bv) * sortDir || a.name.localeCompare(b.name);
        }
        if (sortCol === "next_due") {
          const av = a.next_due ?? "";
          const bv = b.next_due ?? "";
          return (av < bv ? -1 : av > bv ? 1 : 0) * sortDir;
        }
        return (a[sortCol] ?? "").toString().localeCompare((b[sortCol] ?? "").toString()) * sortDir;
      });
  }, [members, filter, search, sortCol, sortDir]);

  async function refresh() {
    const res = await fetch("/api/program-tracker/members");
    const json = await res.json();
    if (res.ok) setMembers(json.data);
  }

  async function markDone(id: string) {
    setBusyId(id);
    const res = await fetch(`/api/program-tracker/members/${id}/block-done`, { method: "POST" });
    setBusyId(null);
    if (res.ok) await refresh();
    else {
      const json = await res.json().catch(() => ({}));
      alert(json.error || "Could not mark this block done.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f ? "border-accent/40 bg-accent/15 text-accent" : "border-border bg-surface-raised/60 text-muted hover:text-foreground"
              }`}
            >
              {f} ({counts[f]})
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Input placeholder="Search members…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" />
          <button onClick={() => setAdding(true)} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent-secondary">
            + Add member
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-raised text-xs uppercase tracking-wide text-muted">
              {SORT_COLS.map((c) => (
                <th key={c.key} className="cursor-pointer select-none px-4 py-3 font-medium hover:text-foreground" onClick={() => toggleSort(c.key)}>
                  {c.label}
                  {sortCol === c.key && <span className="ml-1 text-accent">{sortDir === 1 ? "▲" : "▼"}</span>}
                </th>
              ))}
              <th className="px-4 py-3 font-medium">Notes</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted">
                  No members match this filter.
                </td>
              </tr>
            )}
            {rows.map((m) => {
              const isHold = m.status === "Hold";
              const cellDate = isHold ? holdEndOf(m) : m.next_due;
              const coachColor = m.coach ? COACH_COLORS[m.coach] : undefined;
              return (
                <tr key={m.id} onClick={() => setEditing(m)} className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-raised/60">
                  <td className="px-4 py-3 font-medium text-foreground">{m.name}</td>
                  <td className="px-4 py-3">
                    {m.coach ? (
                      <span className="rounded-full border px-2 py-0.5 text-[11px] font-medium" style={{ color: coachColor, borderColor: `${coachColor}55`, backgroundColor: `${coachColor}1a` }}>
                        {m.coach}
                      </span>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <TypeBadge type={m.type} />
                  </td>
                  <td className="px-4 py-3 text-muted">{m.status || "—"}</td>
                  <td className="px-4 py-3 text-muted">{fmtDate(cellDate)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={dueStatusTone(m.due_status)}>{m.due_status || "—"}</Badge>
                  </td>
                  <td className="max-w-[220px] truncate px-4 py-3 text-muted">{m.notes || ""}</td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    {!isHold && (
                      <button
                        onClick={() => markDone(m.id)}
                        disabled={busyId === m.id}
                        className="rounded-full border border-border px-3 py-1 text-xs text-muted hover:border-accent hover:text-accent disabled:opacity-50"
                      >
                        {busyId === m.id ? "…" : "✓ Done"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {(editing || adding) && (
        <MemberModal
          member={editing}
          onClose={() => {
            setEditing(null);
            setAdding(false);
          }}
          onSaved={async () => {
            setEditing(null);
            setAdding(false);
            await refresh();
          }}
        />
      )}
    </div>
  );
}
