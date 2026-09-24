"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Checkbox } from "@/components/ui/Checkbox";
import type {
  ConsultFormData,
  ConsultNote,
  GeneratedReport,
} from "@/lib/consultationTemplates/types";

type Section = keyof Pick<
  ConsultNote,
  "subjective" | "objective" | "clinicalReasoning"
>;

const SUBJECTIVE_FIELDS: [keyof ConsultNote["subjective"], string, string?][] =
  [
    [
      "hpcBodyChart",
      "HPC / Body Chart",
      "HPC, PNN, AGGS, EASES, 24hr, clicking/catching/locking",
    ],
    ["pastHistory", "Past History"],
    ["imagingRedFlags", "Imaging / Red Flags"],
    ["pmhxSurgeryMeds", "PMHx / Surgery / Medications"],
    ["occupationSocial", "Occupation / Social"],
  ];

const OBJECTIVE_FIELDS: [keyof ConsultNote["objective"], string][] = [
  ["obs", "Observation"],
  ["functionalTesting", "Functional Testing"],
  ["rom", "Range of Motion"],
  ["isokineticTesting", "Isokinetic Testing (VALD)"],
  ["functionalFindingsVald", "Functional Findings (VALD)"],
  ["specialTests", "Special Tests"],
  ["ndts", "Neurodynamic Tests"],
  ["jointMobility", "Joint Mobility"],
  ["palpation", "Palpation"],
];

const REASONING_FIELDS: [
  keyof ConsultNote["clinicalReasoning"],
  string,
  string?,
][] = [
  [
    "impression",
    "Clinical Impression",
    "Your overall synthesis — how the findings connect and what's actually going on",
  ],
  ["diagnosis", "Diagnosis"],
  ["prognosis", "Prognosis"],
];

type TreatmentPhaseKey = "symptomReduction" | "restorative" | "consolidation";

const TREATMENT_PHASES: [TreatmentPhaseKey, string][] = [
  ["symptomReduction", "Phase 1 — Symptom Reduction"],
  ["restorative", "Phase 2 — Restorative"],
  ["consolidation", "Phase 3 — Consolidation"],
];

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-raised/60 p-6">
      <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-wide text-muted">
        {title}
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

export function ConsultWorkspace({
  consultId = null,
  initialNote,
  initialReport = null,
}: {
  consultId?: string | null;
  initialNote: ConsultNote;
  initialReport?: GeneratedReport | null;
}) {
  const router = useRouter();
  const [id, setId] = useState<string | null>(consultId);
  const [note, setNote] = useState<ConsultNote>(initialNote);
  const [report, setReport] = useState<GeneratedReport | null>(initialReport);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [genState, setGenState] = useState<"idle" | "generating" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

  function setTop<K extends keyof ConsultNote>(key: K, value: ConsultNote[K]) {
    setNote((n) => ({ ...n, [key]: value }));
  }

  function setNested<S extends Section>(
    section: S,
    key: keyof ConsultNote[S],
    value: string,
  ) {
    setNote((n) => ({ ...n, [section]: { ...n[section], [key]: value } }));
  }

  function setPhase(
    phase: TreatmentPhaseKey,
    field: keyof ConsultNote["treatmentPlan"][TreatmentPhaseKey],
    value: string,
  ) {
    setNote((n) => ({
      ...n,
      treatmentPlan: {
        ...n.treatmentPlan,
        [phase]: { ...n.treatmentPlan[phase], [field]: value },
      },
    }));
  }

  function setPlan<
    K extends
      | "estimatedTimeframe"
      | "includeEstimatedTimeframe"
      | "returnToFunctionCriteria"
      | "includeReturnToFunctionCriteria",
  >(field: K, value: ConsultNote["treatmentPlan"][K]) {
    setNote((n) => ({
      ...n,
      treatmentPlan: { ...n.treatmentPlan, [field]: value },
    }));
  }

  async function save(): Promise<string | null> {
    setSaveState("saving");
    setError(null);
    try {
      if (id) {
        const cleanedReport = report
          ? {
              ...report,
              keyFindings: report.keyFindings
                .map((f) => f.trim())
                .filter(Boolean),
            }
          : report;
        const body: ConsultFormData = { note, report: cleanedReport };
        const res = await fetch(`/api/consultation-templates/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Save failed");
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 2000);
        return id;
      } else {
        const res = await fetch("/api/consultation-templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Save failed");
        setId(result.id);
        setSaveState("saved");
        router.replace(`/consultation-templates/${result.id}`);
        return result.id as string;
      }
    } catch (e) {
      setSaveState("error");
      setError(e instanceof Error ? e.message : "Save failed");
      return null;
    }
  }

  async function generate() {
    setGenState("generating");
    setError(null);
    const savedId = await save();
    if (!savedId) {
      setGenState("error");
      return;
    }
    try {
      const res = await fetch(
        `/api/consultation-templates/${savedId}/generate`,
        { method: "POST" },
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Generation failed");
      setReport(result.report);
      setGenState("idle");
    } catch (e) {
      setGenState("error");
      setError(e instanceof Error ? e.message : "Generation failed");
    }
  }

  function updateReportSection(
    index: number,
    field: "heading" | "body",
    value: string,
  ) {
    setReport((r) => {
      if (!r) return r;
      const sections = r.sections.map((s, i) =>
        i === index ? { ...s, [field]: value } : s,
      );
      return { ...r, sections };
    });
  }

  function updateNookalNotes(value: string) {
    setReport((r) => (r ? { ...r, nookalNotes: value } : r));
  }

  function updateFocusArea(value: string) {
    setReport((r) => (r ? { ...r, focusArea: value } : r));
  }

  // Kept as a raw split (blank lines included) rather than trimmed/filtered
  // on every keystroke — filtering live would eat a just-typed blank line
  // the moment someone presses Enter to start the next bullet. Blank
  // entries are filtered at render/save time instead (see ReportDocument
  // and the PATCH body below).
  function updateKeyFindings(value: string) {
    setReport((r) => (r ? { ...r, keyFindings: value.split("\n") } : r));
  }

  async function copyNookalNotes() {
    if (!report) return;
    await navigator.clipboard.writeText(report.nookalNotes);
    setCopyState("copied");
    setTimeout(() => setCopyState("idle"), 2000);
  }

  return (
    <div className="flex flex-col gap-6 p-8 pb-24">
      <div className="flex items-center justify-between">
        <Link
          href="/consultation-templates"
          className="flex items-center gap-1.5 text-sm font-medium text-muted hover:text-accent"
        >
          <span aria-hidden>←</span> All Consultation Templates
        </Link>
        <div className="flex items-center gap-3 text-xs">
          {saveState === "saving" && (
            <span className="text-muted">Saving…</span>
          )}
          {saveState === "saved" && (
            <span className="text-accent-secondary">Saved ✓</span>
          )}
          {saveState === "error" && (
            <span className="text-danger">{error}</span>
          )}
        </div>
      </div>

      <SectionCard title="Client &amp; Consult Details">
        <Field label="Client Name">
          <Input
            value={note.patientName}
            onChange={(e) => setTop("patientName", e.target.value)}
            placeholder="Full name"
          />
        </Field>
        <Field label="Clinician">
          <Input
            value={note.clinician}
            onChange={(e) => setTop("clinician", e.target.value)}
            placeholder="Treating physio"
          />
        </Field>
        <Field label="Consult Date">
          <Input
            type="date"
            value={note.consultDate}
            onChange={(e) => setTop("consultDate", e.target.value)}
          />
        </Field>
        <Field label="Referral Source" hint="Optional">
          <Input
            value={note.referralSource}
            onChange={(e) => setTop("referralSource", e.target.value)}
          />
        </Field>
        <Field
          label="Next Appointment"
          hint="Optional — shown in the patient report and used for the closing line"
        >
          <Input
            value={note.nextAppointment}
            onChange={(e) => setTop("nextAppointment", e.target.value)}
            placeholder="e.g. Friday 23rd October at 1pm"
          />
        </Field>
      </SectionCard>

      <SectionCard title="Subjective">
        {SUBJECTIVE_FIELDS.map(([key, label, hint]) => (
          <div
            key={key}
            className={key === "hpcBodyChart" ? "sm:col-span-2" : undefined}
          >
            <Field label={label} hint={hint}>
              <Textarea
                value={note.subjective[key]}
                onChange={(e) => setNested("subjective", key, e.target.value)}
                style={
                  key === "hpcBodyChart" ? { minHeight: "10rem" } : undefined
                }
              />
            </Field>
          </div>
        ))}
      </SectionCard>

      <SectionCard title="Objective">
        {OBJECTIVE_FIELDS.map(([key, label]) => (
          <Field key={key} label={label}>
            <Textarea
              value={note.objective[key]}
              onChange={(e) => setNested("objective", key, e.target.value)}
            />
          </Field>
        ))}
      </SectionCard>

      <SectionCard title="Clinical Reasoning">
        {REASONING_FIELDS.map(([key, label, hint]) => (
          <Field key={key} label={label} hint={hint}>
            <Textarea
              value={note.clinicalReasoning[key]}
              onChange={(e) =>
                setNested("clinicalReasoning", key, e.target.value)
              }
            />
          </Field>
        ))}
      </SectionCard>

      <div className="rounded-xl border border-border bg-surface-raised/60 p-6">
        <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-wide text-muted">
          Treatment Plan
        </h2>
        <div className="flex flex-col gap-6">
          <div className="rounded-lg border border-border/60 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-xs font-bold uppercase tracking-wide text-foreground">
                Estimated Recovery Timeframe
              </h3>
              <Checkbox
                label="Show on report"
                checked={note.treatmentPlan.includeEstimatedTimeframe}
                onChange={(checked) =>
                  setPlan("includeEstimatedTimeframe", checked)
                }
              />
            </div>
            <Field
              label="Timeframe"
              hint="e.g. 10 to 12 weeks — a single headline figure, separate from each phase's own duration"
            >
              <Input
                value={note.treatmentPlan.estimatedTimeframe}
                onChange={(e) => setPlan("estimatedTimeframe", e.target.value)}
                className="sm:max-w-xs"
              />
            </Field>
          </div>

          {TREATMENT_PHASES.map(([key, label]) => {
            const phase = note.treatmentPlan[key];
            return (
              <div key={key} className="rounded-lg border border-border/60 p-4">
                <h3 className="mb-3 font-display text-xs font-bold uppercase tracking-wide text-foreground">
                  {label}
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Frequency" hint="e.g. 2x per week">
                    <Input
                      value={phase.frequency}
                      onChange={(e) =>
                        setPhase(key, "frequency", e.target.value)
                      }
                    />
                  </Field>
                  <Field label="Duration" hint="e.g. 2 weeks">
                    <Input
                      value={phase.duration}
                      onChange={(e) =>
                        setPhase(key, "duration", e.target.value)
                      }
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field
                      label="Focus / Goal"
                      hint="What this phase is trying to achieve"
                    >
                      <Textarea
                        value={phase.focus}
                        onChange={(e) => setPhase(key, "focus", e.target.value)}
                      />
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Field
                      label="Key Interventions"
                      hint="One per line — shown as a bullet list on the report"
                    >
                      <Textarea
                        value={phase.interventions}
                        onChange={(e) =>
                          setPhase(key, "interventions", e.target.value)
                        }
                      />
                    </Field>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="rounded-lg border border-border/60 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-xs font-bold uppercase tracking-wide text-foreground">
                Return to Function Criteria
              </h3>
              <Checkbox
                label="Show on report"
                checked={note.treatmentPlan.includeReturnToFunctionCriteria}
                onChange={(checked) =>
                  setPlan("includeReturnToFunctionCriteria", checked)
                }
              />
            </div>
            <Field
              label="Criteria"
              hint="One benchmark per line — shown as a checklist on the report, e.g. Pain-free single-leg squat x10"
            >
              <Textarea
                value={note.treatmentPlan.returnToFunctionCriteria}
                onChange={(e) =>
                  setPlan("returnToFunctionCriteria", e.target.value)
                }
              />
            </Field>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => void save()}
          disabled={saveState === "saving"}
          className="rounded-lg border border-border bg-surface-raised px-4 py-2 text-sm font-medium text-foreground hover:border-accent disabled:opacity-50"
        >
          Save Note
        </button>
        <button
          onClick={() => void generate()}
          disabled={genState === "generating"}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-50"
        >
          {genState === "generating"
            ? "Generating…"
            : report
              ? "Regenerate Report"
              : "Generate Report"}
        </button>
        {genState === "error" && (
          <span className="text-xs text-danger">{error}</span>
        )}
      </div>

      {report && (
        <div className="flex flex-col gap-6 border-t border-border pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold uppercase tracking-wide text-foreground">
              Generated Report
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {id && (
                <Link
                  href={`/consultation-templates/${id}/report`}
                  target="_blank"
                  className="rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-xs font-medium text-foreground hover:border-accent"
                >
                  Open Patient Report ↗
                </Link>
              )}
              <button
                onClick={() => void copyNookalNotes()}
                className="rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-xs font-medium text-foreground hover:border-accent"
              >
                {copyState === "copied" ? "Copied ✓" : "Copy Nookal Notes"}
              </button>
              <button
                onClick={() => void save()}
                className="rounded-lg border border-accent/40 bg-accent/15 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/25"
              >
                Save Changes
              </button>
            </div>
          </div>

          <p className="text-xs text-muted">
            Edit any section below — these are the exact words the client will
            see on the PDF (and what gets pasted into Nookal), so tidy up
            anything the AI got slightly off before sending.
          </p>

          <Field
            label="Focus Area"
            hint="Short badge shown at the top of the patient report"
          >
            <Input
              value={report.focusArea}
              onChange={(e) => updateFocusArea(e.target.value)}
              className="sm:max-w-xs"
            />
          </Field>

          <Field
            label="Key Findings"
            hint="One per line — shown as a quick-scan list before the write-up"
          >
            <Textarea
              value={report.keyFindings.join("\n")}
              onChange={(e) => updateKeyFindings(e.target.value)}
              style={{ minHeight: "6rem" }}
            />
          </Field>

          <div className="flex flex-col gap-4">
            {report.sections.map((s, i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-surface-raised/60 p-4"
              >
                <Input
                  value={s.heading}
                  onChange={(e) =>
                    updateReportSection(i, "heading", e.target.value)
                  }
                  className="mb-2 font-display text-sm font-bold uppercase tracking-wide"
                />
                <Textarea
                  value={s.body}
                  onChange={(e) =>
                    updateReportSection(i, "body", e.target.value)
                  }
                  style={{ minHeight: "8rem" }}
                />
              </div>
            ))}
          </div>

          <Field label="Nookal Clinical Documentation">
            <Textarea
              value={report.nookalNotes}
              onChange={(e) => updateNookalNotes(e.target.value)}
              className="font-mono text-xs"
              style={{ minHeight: "12rem" }}
            />
          </Field>
        </div>
      )}
    </div>
  );
}
