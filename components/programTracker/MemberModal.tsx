"use client";

import { useState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Member, MemberInput, PROGRAM_TRACKER_COACHES, PROGRAM_TRACKER_STATUSES, PROGRAM_TRACKER_TYPES } from "@/lib/programTracker/types";
import { addWeeks, fmtDate } from "@/lib/programTracker/date";

export function MemberModal({
  member,
  defaultCoach,
  onClose,
  onSaved,
}: {
  /** null = adding a new member */
  member: Member | null;
  /** Pre-fills Coach when adding from a coach-scoped list (My List) — saves re-selecting your own name every time. Ignored when editing an existing member. */
  defaultCoach?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<MemberInput>({
    name: member?.name ?? "",
    coach: member?.coach ?? defaultCoach ?? "",
    type: member?.type ?? "",
    status: member?.status ?? "Active",
    block_start: member?.block_start ?? "",
    block_weeks: member?.block_weeks ?? 4,
    hold_start: member?.hold_start ?? "",
    hold_weeks: member?.hold_weeks ?? null,
    notes: member?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const holdEndPreview = form.status === "Hold" && form.hold_start && form.hold_weeks ? fmtDate(addWeeks(form.hold_start, form.hold_weeks)) : "—";

  async function save() {
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError(null);
    const url = member ? `/api/program-tracker/members/${member.id}` : "/api/program-tracker/members";
    const res = await fetch(url, { method: member ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error || "Save failed");
      return;
    }
    onSaved();
  }

  async function cancelMember() {
    if (!member) return;
    if (!confirm(`Remove ${member.name} from the tracker? They will be moved to Cancelled.`)) return;
    setCancelling(true);
    const res = await fetch(`/api/program-tracker/members/${member.id}/cancel`, { method: "POST" });
    setCancelling(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error || "Could not cancel this member.");
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{member ? member.name : "Add member"}</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground">
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <Field label="Name">
            <Input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Coach">
              <Select value={form.coach ?? ""} onChange={(e) => setForm({ ...form, coach: e.target.value })}>
                <option value="">Select…</option>
                {PROGRAM_TRACKER_COACHES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="Type">
              <Select value={form.type ?? ""} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="">Select…</option>
                {PROGRAM_TRACKER_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Status">
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {PROGRAM_TRACKER_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            </Field>
            <Field label="Block weeks">
              <Input type="number" min={1} value={form.block_weeks} onChange={(e) => setForm({ ...form, block_weeks: parseInt(e.target.value) || 4 })} />
            </Field>
          </div>

          <Field label="Block start">
            <Input type="date" value={form.block_start ?? ""} onChange={(e) => setForm({ ...form, block_start: e.target.value })} />
          </Field>

          {form.status === "Hold" && (
            <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-surface-raised/60 p-3">
              <Field label="Hold start">
                <Input type="date" value={form.hold_start ?? ""} onChange={(e) => setForm({ ...form, hold_start: e.target.value })} />
              </Field>
              <Field label="Hold weeks" hint={`Off hold date: ${holdEndPreview}`}>
                <Input type="number" min={1} value={form.hold_weeks ?? ""} onChange={(e) => setForm({ ...form, hold_weeks: parseInt(e.target.value) || null })} />
              </Field>
            </div>
          )}

          <Field label="Notes">
            <Textarea value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex items-center justify-between gap-3">
            {member ? (
              <button onClick={cancelMember} disabled={cancelling} className="text-sm text-danger hover:underline disabled:opacity-50">
                {cancelling ? "Removing…" : "Remove from tracker"}
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-3">
              <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-foreground">
                Cancel
              </button>
              <button onClick={save} disabled={saving} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent-secondary disabled:opacity-50">
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
