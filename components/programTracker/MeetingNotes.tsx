"use client";

import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { AGENDA_DEFS, Meeting } from "@/lib/programTracker/types";
import { fmtDate } from "@/lib/programTracker/date";

// No live push from the database here (this reads/writes the Program
// Tracker's Supabase project through our own server, not a direct browser
// connection — see lib/programTracker/supabaseAdmin.ts) — so two people's
// saves are kept safe with two things instead: merge_meeting_note merges
// just the one changed box atomically in Postgres (same fix already applied
// to the standalone site's identical race), and this page polls for other
// people's saves periodically and on window focus, skipping whichever box
// you're actively typing in so an incoming refresh can't overwrite your
// keystrokes.
const POLL_MS = 20000;

export function MeetingNotes({ initialMeetings }: { initialMeetings: Meeting[] }) {
  const [meetings, setMeetings] = useState(initialMeetings);
  const [activeId, setActiveId] = useState<string | null>(initialMeetings[0]?.id ?? null);
  const [creating, setCreating] = useState(false);
  const focusedIdx = useRef<number | null>(null);
  const savingIdx = useRef<Set<number>>(new Set());

  const active = meetings.find((m) => m.id === activeId) ?? null;

  async function refresh() {
    const res = await fetch("/api/program-tracker/meetings");
    const json = await res.json();
    if (!res.ok) return;
    setMeetings((prev) => {
      const incoming = json.data as Meeting[];
      // Never let a poll clobber the box currently being typed in.
      if (focusedIdx.current === null) return incoming;
      return incoming.map((m) => {
        if (m.id !== activeId) return m;
        const current = prev.find((p) => p.id === activeId);
        if (!current) return m;
        const notes = { ...m.notes, [focusedIdx.current!]: current.notes[focusedIdx.current!] };
        return { ...m, notes };
      });
    });
  }

  useEffect(() => {
    const interval = setInterval(refresh, POLL_MS);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  async function createMeeting() {
    setCreating(true);
    const res = await fetch("/api/program-tracker/meetings", { method: "POST" });
    setCreating(false);
    const json = await res.json();
    if (!res.ok) {
      alert(json.error || "Could not create meeting");
      return;
    }
    setMeetings((prev) => [json.data, ...prev].sort((a, b) => (a.meeting_date < b.meeting_date ? 1 : -1)));
    setActiveId(json.data.id);
  }

  async function deleteMeeting(id: string) {
    const m = meetings.find((x) => x.id === id);
    if (!m) return;
    if (!confirm(`Delete the meeting for ${fmtDate(m.meeting_date)}? This removes all its notes and cannot be undone.`)) return;
    const res = await fetch(`/api/program-tracker/meetings/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      alert(json.error || "Delete failed");
      return;
    }
    setMeetings((prev) => {
      const next = prev.filter((x) => x.id !== id);
      if (activeId === id) setActiveId(next[0]?.id ?? null);
      return next;
    });
  }

  function updateLocal(idx: number, text: string) {
    if (!activeId) return;
    setMeetings((prev) => prev.map((m) => (m.id === activeId ? { ...m, notes: { ...m.notes, [idx]: text } } : m)));
  }

  async function saveField(idx: number, text: string) {
    if (!activeId) return;
    savingIdx.current.add(idx);
    const res = await fetch(`/api/program-tracker/meetings/${activeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idx, text }),
    });
    savingIdx.current.delete(idx);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      alert(json.error || "Save failed");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-4">
        {meetings.map((m) => (
          <div
            key={m.id}
            className={`group flex items-center gap-1.5 rounded-full border py-1 pl-3 pr-1.5 text-sm font-medium transition-colors ${
              activeId === m.id ? "border-accent/40 bg-accent/15 text-accent" : "border-border bg-surface-raised/60 text-muted hover:text-foreground"
            }`}
          >
            <button onClick={() => setActiveId(m.id)}>{fmtDate(m.meeting_date)}</button>
            <button
              onClick={() => deleteMeeting(m.id)}
              title="Delete this meeting"
              className="flex h-4 w-4 items-center justify-center rounded-full text-muted/70 opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
            >
              ×
            </button>
          </div>
        ))}
        <button
          onClick={createMeeting}
          disabled={creating}
          className="ml-auto rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent-secondary disabled:opacity-50"
        >
          + New meeting
        </button>
      </div>

      {!active ? (
        <EmptyState message="No meetings yet — create one above." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {AGENDA_DEFS.map((def, idx) => (
            <div key={idx} className="overflow-hidden rounded-xl border border-border bg-surface">
              <div className="border-b border-border bg-surface-raised px-4 py-2.5">
                <div className="text-sm font-semibold text-accent">{def.title}</div>
                {def.sub && <div className="mt-0.5 text-xs text-muted">{def.sub}</div>}
              </div>
              <Textarea
                value={active.notes[idx] ?? ""}
                onFocus={() => {
                  focusedIdx.current = idx;
                }}
                onChange={(e) => updateLocal(idx, e.target.value)}
                onBlur={(e) => {
                  focusedIdx.current = null;
                  saveField(idx, e.target.value);
                }}
                placeholder="Notes…"
                className="min-h-[140px]"
                style={{ border: "none", borderRadius: 0 }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
