"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { ROLE_LABELS, ProviderRole } from "@/lib/providerSchema";
import { Provider } from "@/lib/types";

const ROLES: ProviderRole[] = ["senior_physio", "physio", "massage", "ep", "admin"];

export function NewProviderForm({ onCreated }: { onCreated: (provider: Provider) => void }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<ProviderRole>("physio");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const res = await fetch("/api/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, role }),
    });
    setSaving(false);
    if (res.ok) {
      const { data } = await res.json();
      onCreated(data);
      setName("");
      setRole("physio");
    }
  }

  return (
    <Card title="Add a Provider">
      <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
        </Field>
        <Field label="Role">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as ProviderRole)}
            className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </Field>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Adding…" : "Add Provider"}
        </button>
      </form>
    </Card>
  );
}
