"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import type { BjjScreenFormData, InjuryResult, Rating, Sex } from "@/lib/bjjInjuryScreen/types";
import { scoreBjjScreen, type MetricResult } from "@/lib/bjjInjuryScreen/scoring";

type ValueSection = "mobility" | "strength" | "power" | "conditioning";

const INJURY_REGIONS: [keyof Omit<BjjScreenFormData["injuryScreen"], "comments">, string][] = [
  ["neck", "Neck"],
  ["back", "Back"],
  ["shoulders", "Shoulders"],
  ["upperLimb", "Upper Limb"],
  ["hips", "Hips"],
  ["knees", "Knees"],
  ["ankles", "Ankles"],
];

const MOBILITY_FIELDS: [keyof BjjScreenFormData["mobility"], string][] = [
  ["shoulderErIr", "Shoulder ER/IR"],
  ["hipErIr", "Hip ER/IR"],
  ["lumbarFlexExt", "Lumbar Flexion/Extension"],
  ["txRotation", "Thoracic (Tx) Rotation"],
  ["cervicalRotation", "Cervical Rotation"],
];

const STRENGTH_FIELDS: [keyof BjjScreenFormData["strength"], string, string?][] = [
  ["imtp", "IMTP — Peak Force ÷ BW", "×BW, from ForceDecks"],
  ["standingShoulderYLeft", "Standing Shoulder Y — Left (ASH-Y)", "N — dynamometer"],
  ["standingShoulderYRight", "Standing Shoulder Y — Right (ASH-Y)", "N — dynamometer"],
  ["maxPullUps", "Max Pull Ups", "reps"],
  ["maxPushUps", "Max Push Ups", "reps"],
  ["gripStrengthKg", "Grip Strength (dominant hand)", "kg — dynamometer"],
];

const POWER_FIELDS: [keyof BjjScreenFormData["power"], string, string?][] = [
  ["cmjHeight", "CMJ — Jump Height", "cm"],
  ["dropJumpRsi", "RSI Mod (Drop Jump)", "unitless, 2dp"],
];

const RATING_LABELS: Record<Exclude<Rating, "">, string> = {
  poor: "Poor",
  demonstrated: "Demonstrated",
  good: "Good",
};

function SectionCard({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface-raised/60 p-6">
      <h2 className="font-display text-sm font-bold uppercase tracking-wide text-muted">{title}</h2>
      {hint && <p className="mb-4 mt-1 text-xs text-muted">{hint}</p>}
      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${hint ? "" : "mt-4"}`}>{children}</div>
    </div>
  );
}

function scoreTone(score: number | null): "neutral" | "good" | "warning" | "critical" {
  if (score == null) return "neutral";
  if (score >= 7.5) return "good";
  if (score >= 5) return "warning";
  return "critical";
}

function MetricResultRow({ label, result, sex }: { label: string; result: MetricResult | null; sex: Sex }) {
  if (!result) return null;
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-foreground">{label}</span>
        {result.score !== null ? (
          <Badge tone={scoreTone(result.score)}>{result.percentOfElite}% of elite</Badge>
        ) : (
          <Badge>No benchmark</Badge>
        )}
      </div>
      {result.benchmark ? (
        <p className="text-[11px] text-muted">
          vs {result.benchmark.value} ({result.benchmark.confidence === "combat" ? "combat-sport data" : "general elite athletes"}) — {result.benchmark.source}
        </p>
      ) : (
        sex && <p className="text-[11px] text-muted">No {sex} reference standard available yet — value is recorded but not scored.</p>
      )}
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

  const score = useMemo(() => scoreBjjScreen(data), [data]);

  function setTop<K extends keyof BjjScreenFormData>(key: K, value: BjjScreenFormData[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  function setMobility(key: keyof BjjScreenFormData["mobility"], value: Rating) {
    setData((d) => ({ ...d, mobility: { ...d.mobility, [key]: value } }));
  }

  function setInjury(key: keyof BjjScreenFormData["injuryScreen"], value: string) {
    setData((d) => ({ ...d, injuryScreen: { ...d.injuryScreen, [key]: value } }));
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
        <Field label="Sex" hint="Needed for the elite comparisons below — they differ by sex.">
          <Select value={data.sex} onChange={(e) => setTop("sex", e.target.value as Sex)}>
            <option value="">Not set</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </Select>
        </Field>
        <Field label="Bodyweight" hint="kg — needed to normalise the Watt Bike test against elite data">
          <Input value={data.bodyweightKg} onChange={(e) => setTop("bodyweightKg", e.target.value)} placeholder="e.g. 82" />
        </Field>
      </SectionCard>

      <SectionCard title="Injury Screen" hint="Pass or Fail per region — same quick regional screen used on the Youth/Performance report, not scored into the 0-10 domains below.">
        {INJURY_REGIONS.map(([key, label]) => (
          <Field key={key} label={label}>
            <Select value={data.injuryScreen[key]} onChange={(e) => setInjury(key, e.target.value as InjuryResult)}>
              <option value="">Not tested</option>
              <option value="pass">Pass</option>
              <option value="fail">Fail</option>
            </Select>
          </Field>
        ))}
        <Field label="Screening Comments" tag={<span className="text-muted">(optional)</span>}>
          <Textarea
            value={data.injuryScreen.comments}
            onChange={(e) => setInjury("comments", e.target.value)}
            placeholder="Note any failed regions, current complaints or precautions..."
          />
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
        <Field label="Ankle DF — Knee to Wall (Left)" hint="cm from wall to big toe, knee touching the wall">
          <Input
            value={data.mobility.ankleDfKneeToWallCmLeft}
            onChange={(e) => setValue("mobility", "ankleDfKneeToWallCmLeft", e.target.value)}
          />
        </Field>
        <Field label="Ankle DF — Knee to Wall (Right)" hint="cm from wall to big toe, knee touching the wall">
          <Input
            value={data.mobility.ankleDfKneeToWallCmRight}
            onChange={(e) => setValue("mobility", "ankleDfKneeToWallCmRight", e.target.value)}
          />
        </Field>
      </SectionCard>

      <SectionCard title="Strength">
        {STRENGTH_FIELDS.map(([key, label, unit]) => (
          <Field key={key} label={label} hint={unit}>
            <Input value={data.strength[key]} onChange={(e) => setValue("strength", key, e.target.value)} />
          </Field>
        ))}
      </SectionCard>

      <SectionCard title="Power">
        {POWER_FIELDS.map(([key, label, unit]) => (
          <Field key={key} label={label} hint={unit}>
            <Input value={data.power[key]} onChange={(e) => setValue("power", key, e.target.value)} />
          </Field>
        ))}
      </SectionCard>

      <SectionCard title="Conditioning">
        <Field label="3-Min Watt Bike — Average Power" hint="watts — also needs Bodyweight above (unlike the other tests, this one is scored per kg)">
          <Input value={data.conditioning.wattBike3MinAvgWatts} onChange={(e) => setValue("conditioning", "wattBike3MinAvgWatts", e.target.value)} />
        </Field>
      </SectionCard>

      <div className="rounded-xl border border-accent/30 bg-accent/[0.04] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-foreground">Vs. Elite</h2>
          <Badge tone={scoreTone(score.overall)}>{score.overall !== null ? `${score.overall}/10 overall` : "Not enough data yet"}</Badge>
        </div>
        {!data.sex && (
          <p className="mb-4 text-xs text-muted">Set Sex above to compare against elite reference data — mobility ratings score regardless.</p>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <MetricResultRow label="IMTP (vs. bodyweight)" result={score.imtp} sex={data.sex} />
          <MetricResultRow label="CMJ Jump Height" result={score.cmjHeight} sex={data.sex} />
          <MetricResultRow label="RSI Mod (Drop Jump)" result={score.dropJumpRsi} sex={data.sex} />
          <MetricResultRow label="Standing Shoulder Y — Left (ASH-Y)" result={score.standingShoulderYLeft} sex={data.sex} />
          <MetricResultRow label="Standing Shoulder Y — Right (ASH-Y)" result={score.standingShoulderYRight} sex={data.sex} />
          {score.standingShoulderYLsi !== null && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2">
              <span className="text-xs font-medium text-foreground">ASH-Y — L/R Deficit (LSI)</span>
              <Badge tone={score.standingShoulderYLsi <= 10 ? "good" : score.standingShoulderYLsi <= 15 ? "warning" : "critical"}>{score.standingShoulderYLsi}%</Badge>
            </div>
          )}
          <MetricResultRow label="Max Pull Ups" result={score.maxPullUps} sex={data.sex} />
          <MetricResultRow label="Max Push Ups" result={score.maxPushUps} sex={data.sex} />
          <MetricResultRow label="Ankle DF — Knee to Wall (L)" result={score.ankleDfLeft} sex={data.sex} />
          <MetricResultRow label="Ankle DF — Knee to Wall (R)" result={score.ankleDfRight} sex={data.sex} />
          {score.ankleDfLsi !== null && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2">
              <span className="text-xs font-medium text-foreground">Ankle DF — L/R Deficit (LSI)</span>
              <Badge tone={score.ankleDfLsi <= 10 ? "good" : score.ankleDfLsi <= 15 ? "warning" : "critical"}>{score.ankleDfLsi}%</Badge>
            </div>
          )}
          <MetricResultRow label="Grip Strength" result={score.gripStrengthKg} sex={data.sex} />
          <MetricResultRow label="3-Min Watt Bike" result={score.wattBike3MinAvgWatts} sex={data.sex} />
          {score.mobilityScore !== null && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2">
              <span className="text-xs font-medium text-foreground">Mobility (qualitative)</span>
              <Badge tone={scoreTone(score.mobilityScore)}>{score.mobilityScore}/10</Badge>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => void save()}
          disabled={saveState === "saving"}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-50"
        >
          Save Screen
        </button>
        {id && (
          <Link
            href={`/bjj-injury-screen/${id}/report`}
            target="_blank"
            className="rounded-lg border border-border bg-surface-raised px-4 py-2 text-sm font-medium text-foreground hover:border-accent"
          >
            Open Report ↗
          </Link>
        )}
      </div>
    </div>
  );
}
