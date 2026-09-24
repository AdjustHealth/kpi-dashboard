/** The Initial Consultation / Client-Centred Consult note — fields mirror the
 * clinic's own real note template (Subjective -> Objective -> Clinical
 * Reasoning -> Treatment) so physios fill it out the same way they already
 * take notes, nothing new to learn. The "3 things" agenda-setting questions
 * are spoken scripting for the start of the consult, not something captured
 * as a form field. */
export type ConsultNote = {
  patientName: string;
  clinician: string;
  consultDate: string;
  referralSource: string;
  subjective: {
    hpcBodyChart: string;
    pastHistory: string;
    imagingRedFlags: string;
    pmhxSurgeryMeds: string;
    occupationSocial: string;
  };
  objective: {
    obs: string;
    functionalTesting: string;
    rom: string;
    isokineticTesting: string;
    functionalFindingsVald: string;
    specialTests: string;
    ndts: string;
    jointMobility: string;
    palpation: string;
  };
  clinicalReasoning: {
    impression: string;
    diagnosis: string;
    prognosis: string;
  };
  treatmentPlan: {
    symptomReduction: TreatmentPhase;
    restorative: TreatmentPhase;
    consolidation: TreatmentPhase;
    /** e.g. "10 to 12 weeks" — a single headline figure, separate from each phase's own duration */
    estimatedTimeframe: string;
    /** Lets the physio type a timeframe and still keep it off the report — e.g. filled in for internal reference but not ready to commit to with the client yet */
    includeEstimatedTimeframe: boolean;
    /** One benchmark per line — rendered as a checklist. e.g. "Pain-free single-leg squat x10" */
    returnToFunctionCriteria: string;
    includeReturnToFunctionCriteria: boolean;
  };
  nextAppointment: string;
};

/** Split out so the plan can actually be laid out with real structure (a
 * cadence badge, a stated goal, a list of what's done) instead of one
 * freeform blob per phase — this is the section clients care most about. */
export type TreatmentPhase = {
  /** e.g. "2x per week" */
  frequency: string;
  /** e.g. "2 weeks" */
  duration: string;
  /** What this phase is actually trying to achieve */
  focus: string;
  /** One item per line — rendered as a bullet list */
  interventions: string;
};

function emptyPhase(): TreatmentPhase {
  return { frequency: "", duration: "", focus: "", interventions: "" };
}

/** Pre-filled with the clinic's own HPC/Body Chart labels so a new note
 * starts looking like the template physios already fill in in Nookal. */
const HPC_BODY_CHART_TEMPLATE =
  "HPC:\nPNN:\nAGGS:\nEASES:\n24HR:\nCLICKING/CATCHING/LOCKING:";

export function emptyConsultNote(): ConsultNote {
  return {
    patientName: "",
    clinician: "",
    consultDate: "",
    referralSource: "",
    subjective: {
      hpcBodyChart: HPC_BODY_CHART_TEMPLATE,
      pastHistory: "",
      imagingRedFlags: "",
      pmhxSurgeryMeds: "",
      occupationSocial: "",
    },
    objective: {
      obs: "",
      functionalTesting: "",
      rom: "",
      isokineticTesting: "",
      functionalFindingsVald: "",
      specialTests: "",
      ndts: "",
      jointMobility: "",
      palpation: "",
    },
    clinicalReasoning: {
      impression: "",
      diagnosis: "",
      prognosis: "",
    },
    treatmentPlan: {
      symptomReduction: emptyPhase(),
      restorative: emptyPhase(),
      consolidation: emptyPhase(),
      estimatedTimeframe: "",
      includeEstimatedTimeframe: true,
      returnToFunctionCriteria: "",
      includeReturnToFunctionCriteria: true,
    },
    nextAppointment: "",
  };
}

/** Old saved notes can be missing fields the shape has grown since they were
 * created (the treatment plan's timeframe/return-to-function fields, most
 * recently) — every place that loads a saved note runs it through this
 * first, so the rest of the app never has to guard against a field simply
 * not being there. */
export function mergeConsultNote(
  saved: Partial<ConsultNote> | null | undefined,
): ConsultNote {
  const base = emptyConsultNote();
  if (!saved) return base;
  return {
    patientName: saved.patientName ?? base.patientName,
    clinician: saved.clinician ?? base.clinician,
    consultDate: saved.consultDate ?? base.consultDate,
    referralSource: saved.referralSource ?? base.referralSource,
    subjective: { ...base.subjective, ...saved.subjective },
    objective: { ...base.objective, ...saved.objective },
    clinicalReasoning: {
      ...base.clinicalReasoning,
      ...saved.clinicalReasoning,
    },
    treatmentPlan: {
      symptomReduction: {
        ...base.treatmentPlan.symptomReduction,
        ...saved.treatmentPlan?.symptomReduction,
      },
      restorative: {
        ...base.treatmentPlan.restorative,
        ...saved.treatmentPlan?.restorative,
      },
      consolidation: {
        ...base.treatmentPlan.consolidation,
        ...saved.treatmentPlan?.consolidation,
      },
      estimatedTimeframe:
        saved.treatmentPlan?.estimatedTimeframe ??
        base.treatmentPlan.estimatedTimeframe,
      includeEstimatedTimeframe:
        saved.treatmentPlan?.includeEstimatedTimeframe ??
        base.treatmentPlan.includeEstimatedTimeframe,
      returnToFunctionCriteria:
        saved.treatmentPlan?.returnToFunctionCriteria ??
        base.treatmentPlan.returnToFunctionCriteria,
      includeReturnToFunctionCriteria:
        saved.treatmentPlan?.includeReturnToFunctionCriteria ??
        base.treatmentPlan.includeReturnToFunctionCriteria,
    },
    nextAppointment: saved.nextAppointment ?? base.nextAppointment,
  };
}

export type ReportSection = { heading: string; body: string };

/** Spelling/grammar/capitalization-only copy-edit of a phase's free-text
 * fields — the treatment plan is rendered on the report straight from the
 * physio's own typed note (no AI pass), so this is what catches things
 * like "tehcnique" or a lowercase sentence start before a client sees it. */
export type CleanedPhase = { focus: string; interventions: string[] };

export type PlanCleanup = {
  symptomReduction: CleanedPhase;
  restorative: CleanedPhase;
  consolidation: CleanedPhase;
  returnToFunctionCriteria: string[];
};

export type GeneratedReport = {
  focusArea: string;
  /** 3-5 short scannable phrases, shown as a quick-scan list ahead of the
   * fuller prose sections — breaks up what would otherwise be an unbroken
   * run of paragraphs. */
  keyFindings: string[];
  sections: ReportSection[];
  nookalNotes: string;
  /** null if the model didn't return it — report still renders fine,
   * just falls back to the physio's raw typed text for the plan fields. */
  planCleanup: PlanCleanup | null;
  generatedAt: string;
};

/** form_data shape for assess_type = "initial_consult" rows in the shared
 * Assessment Tool `assessments` table (see lib/assessmentTool/db.ts) — same
 * table as the scored assessments, just a different form_data shape. */
export type ConsultFormData = {
  note: ConsultNote;
  report: GeneratedReport | null;
};
