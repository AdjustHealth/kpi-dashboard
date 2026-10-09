"use client";

import { useState } from "react";

export interface TopicRowProvider {
  id: string;
  initials: string;
  name: string;
}

export interface TopicRowCompletion {
  completed_at: string;
  marked_by: string | null;
}

/**
 * One topic's row — a status dot per provider in the group, plus a
 * completion count. Dots are only clickable for directors (canEdit), per
 * the clinic's explicit "staff can't tick their own boxes" requirement —
 * enforced for real by RLS (migration 0044_clinical_training.sql), this is
 * just the UI not offering a control that would fail anyway. Ticking is a
 * quick action (today's date, your own name) rather than a form — good
 * enough for a first real version; a fuller "pick the date/add a note"
 * flow can follow once directors are actually using this day to day.
 */
export function TopicRow({
  topicId,
  name,
  description,
  providers,
  initialCompletions,
  canEdit,
  directorName,
}: {
  topicId: string;
  name: string;
  description?: string | null;
  providers: TopicRowProvider[];
  initialCompletions: Record<string, TopicRowCompletion>;
  canEdit: boolean;
  directorName: string;
}) {
  const [completions, setCompletions] = useState(initialCompletions);
  const [pending, setPending] = useState<string | null>(null);

  const completeCount = providers.filter((p) => completions[p.id]).length;

  async function toggle(providerId: string) {
    if (!canEdit || pending) return;
    setPending(providerId);
    try {
      if (completions[providerId]) {
        if (!window.confirm("Unmark this topic as complete for this person?")) return;
        const res = await fetch("/api/training/completions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topicId, providerId }),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Failed to unmark");
        setCompletions((prev) => {
          const next = { ...prev };
          delete next[providerId];
          return next;
        });
      } else {
        const completedAt = new Date().toISOString().slice(0, 10);
        const res = await fetch("/api/training/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topicId, providerId, completedAt, markedBy: directorName }),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Failed to mark complete");
        setCompletions((prev) => ({ ...prev, [providerId]: { completed_at: completedAt, marked_by: directorName } }));
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-foreground">{name}</div>
        {description && <div className="mt-0.5 text-xs text-muted">{description}</div>}
      </div>
      <div className="flex flex-none gap-2">
        {providers.map((p) => {
          const done = completions[p.id];
          const base = "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold";
          const style = done
            ? "bg-success text-background"
            : "border border-dashed border-border text-muted";
          const title = done ? `${p.name} — completed ${done.completed_at}${done.marked_by ? ` by ${done.marked_by}` : ""}` : `${p.name} — not started`;
          return canEdit ? (
            <button
              key={p.id}
              type="button"
              title={title}
              disabled={pending === p.id}
              onClick={() => toggle(p.id)}
              className={`${base} ${style} ${pending === p.id ? "opacity-50" : "cursor-pointer hover:brightness-110"}`}
            >
              {p.initials}
            </button>
          ) : (
            <div key={p.id} title={title} className={`${base} ${style}`}>
              {p.initials}
            </div>
          );
        })}
      </div>
      <div className="w-14 flex-none text-right text-sm font-semibold text-foreground">
        {completeCount}/{providers.length}
      </div>
    </div>
  );
}
