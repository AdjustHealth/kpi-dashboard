"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
 * completion count, and (for directors) edit/delete controls for the topic
 * itself. Dots are only clickable for directors (canEdit), per the clinic's
 * explicit "staff can't tick their own boxes" requirement — enforced for
 * real by RLS (migration 0044_clinical_training.sql), this is just the UI
 * not offering a control that would fail anyway; topic edit/delete share
 * the same canEdit gate and the same RLS backing (training_topics' own
 * directors-only update/delete policies). Ticking is a quick action
 * (today's date, your own name) rather than a form — good enough for a
 * first real version; a fuller "pick the date/add a note" flow can follow
 * once directors are actually using this day to day.
 */
export function TopicRow({
  topicId,
  name,
  category,
  description,
  providers,
  initialCompletions,
  canEdit,
  directorName,
}: {
  topicId: string;
  name: string;
  category: string | null;
  description?: string | null;
  providers: TopicRowProvider[];
  initialCompletions: Record<string, TopicRowCompletion>;
  canEdit: boolean;
  directorName: string;
}) {
  const router = useRouter();
  const [completions, setCompletions] = useState(initialCompletions);
  const [pending, setPending] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [editCategory, setEditCategory] = useState(category ?? "");
  const [editDescription, setEditDescription] = useState(description ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  async function saveEdit() {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/training/topics/${topicId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), category: editCategory.trim() || null, description: editDescription.trim() || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to save");
      setEditing(false);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTopic() {
    if (!window.confirm(`Delete "${name}"? This also removes everyone's completion record for it — that can't be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/training/topics/${topicId}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to delete");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
      setDeleting(false);
    }
  }

  if (editing) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-accent/50 bg-surface px-4 py-3">
        <input
          value={editCategory}
          onChange={(e) => setEditCategory(e.target.value)}
          placeholder="Category (optional)"
          className="w-36 rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted"
        />
        <input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          placeholder="Topic name"
          autoFocus
          className="min-w-48 flex-1 rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted"
        />
        <input
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          placeholder="Resource link / note (optional)"
          className="min-w-56 flex-1 rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted"
        />
        <button type="button" onClick={saveEdit} disabled={saving || !editName.trim()} className="rounded-md bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground disabled:opacity-50">
          Save
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setEditName(name);
            setEditCategory(category ?? "");
            setEditDescription(description ?? "");
          }}
          className="rounded-md px-3 py-1.5 text-xs font-semibold text-muted"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-foreground">{name}</div>
        {description &&
          (description.startsWith("http") ? (
            <a href={description} target="_blank" rel="noopener noreferrer" className="mt-0.5 inline-block text-xs text-accent hover:underline">
              Resource ↗
            </a>
          ) : (
            <div className="mt-0.5 text-xs text-muted">{description}</div>
          ))}
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
      {canEdit && (
        <div className="flex flex-none items-center gap-1">
          <button type="button" title="Edit topic" onClick={() => setEditing(true)} className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-surface-raised hover:text-foreground">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>
          <button
            type="button"
            title="Delete topic"
            onClick={deleteTopic}
            disabled={deleting}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-danger/15 hover:text-danger disabled:opacity-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
