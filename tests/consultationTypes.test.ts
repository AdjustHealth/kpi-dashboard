import { describe, expect, it } from "vitest";
import {
  emptyConsultNote,
  mergeConsultNote,
} from "@/lib/consultationTemplates/types";

describe("mergeConsultNote", () => {
  it("returns a fresh empty note when given null or undefined", () => {
    expect(mergeConsultNote(null)).toEqual(emptyConsultNote());
    expect(mergeConsultNote(undefined)).toEqual(emptyConsultNote());
  });

  it("backfills a record saved before the treatment plan's timeframe/return-to-function fields existed", () => {
    // Shape as it would have been saved by an older version of the app —
    // treatmentPlan has the three phases but none of the newer scalar fields.
    const legacy = {
      patientName: "Jane Doe",
      treatmentPlan: {
        symptomReduction: {
          frequency: "2x/week",
          duration: "2 weeks",
          focus: "Calm it down",
          interventions: "Manual therapy",
        },
        restorative: {
          frequency: "1x/week",
          duration: "4 weeks",
          focus: "",
          interventions: "",
        },
        consolidation: {
          frequency: "",
          duration: "",
          focus: "",
          interventions: "",
        },
      },
    } as unknown as Parameters<typeof mergeConsultNote>[0];

    const merged = mergeConsultNote(legacy);

    expect(merged.patientName).toBe("Jane Doe");
    expect(merged.treatmentPlan.symptomReduction.frequency).toBe("2x/week");
    expect(merged.treatmentPlan.estimatedTimeframe).toBe("");
    expect(merged.treatmentPlan.includeEstimatedTimeframe).toBe(true);
    expect(merged.treatmentPlan.returnToFunctionCriteria).toBe("");
    expect(merged.treatmentPlan.includeReturnToFunctionCriteria).toBe(true);
  });

  it("backfills a record saved before treatmentPlan existed as an object at all", () => {
    const veryOld = { patientName: "Old Record" } as unknown as Parameters<
      typeof mergeConsultNote
    >[0];
    const merged = mergeConsultNote(veryOld);
    expect(merged.treatmentPlan.symptomReduction).toEqual({
      frequency: "",
      duration: "",
      focus: "",
      interventions: "",
    });
    expect(merged.treatmentPlan.estimatedTimeframe).toBe("");
  });

  it("keeps an explicitly empty string rather than overwriting it with the default template", () => {
    const saved = {
      subjective: { hpcBodyChart: "" },
    } as unknown as Parameters<typeof mergeConsultNote>[0];
    const merged = mergeConsultNote(saved);
    expect(merged.subjective.hpcBodyChart).toBe("");
  });

  it("preserves a fully up-to-date note unchanged", () => {
    const full = emptyConsultNote();
    full.patientName = "Complete Record";
    full.treatmentPlan.estimatedTimeframe = "10 weeks";
    expect(mergeConsultNote(full)).toEqual(full);
  });
});
