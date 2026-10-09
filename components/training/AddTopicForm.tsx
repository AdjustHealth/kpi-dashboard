"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddTopicForm({ trainingGroup }: { trainingGroup: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/training/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trainingGroup, category: category.trim() || null, name: name.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to add topic");
      setName("");
      setCategory("");
      setOpen(false);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex-none rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground hover:brightness-110"
      >
        + Add topic
      </button>
    );
  }

  return (
    <div className="flex flex-none flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-2">
      <input
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        placeholder="Category (optional)"
        className="w-36 rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted"
      />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Topic name"
        autoFocus
        className="w-48 rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted"
      />
      <button type="button" onClick={submit} disabled={saving || !name.trim()} className="rounded-md bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground disabled:opacity-50">
        Save
      </button>
      <button type="button" onClick={() => setOpen(false)} className="rounded-md px-3 py-1.5 text-xs font-semibold text-muted">
        Cancel
      </button>
    </div>
  );
}
