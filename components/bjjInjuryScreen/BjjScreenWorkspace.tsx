"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Field, Input, Select } from "@/components/ui/Field";
import type { BjjScreenFormData, Rating } from "@/lib/bjjInjuryScreen/types";

type ValueSection = "strength" | "power";

const MOBILITY_FIELDS: [keyof BjjScreenFormData["mobility"], string][] = [
  ["shoulderErIr", "Shoulder ER/IR"],
  ["hipErIr", "Hip ER/IR"],
  ["lumbarFlexExt", "Lumbar Flexion/Extension"],
  ["txRotation", "Thoracic (Tx) Rotation"],
];

const STRENGTH_FIELDS: [keyof BjjScreenFormData["strength"], string][] = [
  ["imtp", "IMTP"],
  ["standingShoulderY", "Standing Shoulder Y"],
  ["maxPullUps", "Max Pull Ups"],
  ["maxChinUps", "Max Chin Ups"],
];

const POWER_FIELDS: [keyof BjjScreenFormData["power"], string][] = [
  ["cmjHeight", "CMJ — Jump Height"],
  ["dropJumpRsi", "Drop Jump — RSI"],
];

const RATING_LABELS: Record<Exclude<Rating, "">, string> = {
  poor: "Poor",
  demonstrated: "Demonstrated",
  good: "Good",
};

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface-raised/60 p-6">
      <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-wide text-muted">{title}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

export function BjjScreenWorkspace({
  screenId = null,
  initialData,
}: {
  screenId?: string | null;
  initialData: BjjScreenFormData;
}) {
  const router = useRouter();
  const [id, setId] = useState<string | null>(screenId);
  const [data, setData] = useState<BjjScreenFormData>(initialData);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  function setTop<K extends keyof BjjScreenFormData>(key: K, value: BjjScreenFormData[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  function setMobility(key: keyof BjjScreenFormData["mobility"], value: Rating) {
    setData((d) => ({ ...d, mobility: { ...d.mobility, [key]: value } }));
  }

  function setValue(section: ValueSection, key: string, value: string) {
    setData((d) => ({ ...d, [section]: { ...d[section], [key]: value } }));
  }

  async function save(): Promise<string | null> {
    setSaveState("saving");
    setError(null);
    try {
      if (id) {
        const res = await fetch(`/api/bjj-injury-screen/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Save failed");
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 2000);
        return id;
      } else {
        const res = await fetch("/api/bjj-injury-screen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Save failed");
        setId(result.id);
        setSaveState("saved");
        router.replace(`/bjj-injury-screen/${result.id}`);
        return result.id as string;
      }
    } catch (e) {
      setSaveState("error");
      setError(e instanceof Error ? e.message : "Save failed");
      return null;
    }
  }

  return (
    <div className="flex flex-col gap-6 p-8 pb-24">
      <div className="flex items-center justify-between">
        <Link href="/assessments" className="flex items-center gap-1.5 text-sm font-medium text-muted hover:text-accent">
          <span aria-hidden>←</span> All Assessments
        </Link>
        <div className="flex items-center gap-3 text-xs">
          {saveState === "saving" && <span className="text-muted">Saving…</span>}
          {saveState === "saved" && <span className="text-accent-secondary">Saved ✓</span>}
          {saveState === "error" && <span className="text-danger">{error}</span>}
        </div>
      </div>

      <SectionCard title="Athlete &amp; Screen Details">
        <Field label="Athlete Name">
          <Input value={data.athleteName} onChange={(e) => setTop("athleteName", e.target.value)} placeholder="Full name" />
        </Field>
        <Field label="Clinician">
          <Input value={data.clinician} onChange={(e) => setTop("clinician", e.target.value)} placeholder="Assessor" />
        </Field>
        <Field label="Assessment Date">
          <Input type="date" value={data.assessmentDate} onChange={(e) => setTop("assessmentDate", e.target.value)} />
        </Field>
      </SectionCard>

      <SectionCard title="Mobility">
        {MOBILITY_FIELDS.map(([key, label]) => (
          <Field key={key} label={label}>
            <Select value={data.mobility[key]} onChange={(e) => setMobility(key, e.target.value as Rating)}>
              <option value="">Not assessed</option>
              {(Object.keys(RATING_LABELS) as Exclude<Rating, "">[]).map((r) => (
                <option key={r} value={r}>
                  {RATING_LABELS[r]}
                </option>
              ))}
            </Select>
          </Field>
        ))}
      </SectionCard>

      <SectionCard title="Strength">
        {STRENGTH_FIELDS.map(([key, label]) => (
          <Field key={key} label={label}>
            <Input value={data.strength[key]} onChange={(e) => setValue("strength", key, e.target.value)} />
          </Field>
        ))}
      </SectionCard>

      <SectionCard title="Power">
        {POWER_FIELDS.map(([key, label]) => (
          <Field key={key} label={label}>
            <Input value={data.power[key]} onChange={(e) => setValue("power", key, e.target.value)} />
          </Field>
        ))}
      </SectionCard>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => void save()}
          disabled={saveState === "saving"}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-50"
        >
          Save Screen
        </button>
      </div>
    </div>
  );
}
