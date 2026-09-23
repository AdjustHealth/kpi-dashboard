/** The Initial Consultation / Client-Centred Consult note — fields mirror the
 * clinic's own real note template (Goals -> Subjective -> Objective ->
 * Clinical Reasoning -> Treatment) so physios fill it out the same way they
 * already take notes, nothing new to learn. */
export type ConsultNote = {
  patientName: string;
  clinician: string;
  consultDate: string;
  referralSource: string;
  goals: {
    whyNow: string;
    todayGoal: string;
    longTermGoal: string;
    roadblockPerceived: string;
  };
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
    workingClinicalModel: string;
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
    goals: {
      whyNow: "",
      todayGoal: "",
      longTermGoal: "",
      roadblockPerceived: "",
    },
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
      workingClinicalModel: "",
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

export type ReportSection = { heading: string; body: string };

export type GeneratedReport = {
  focusArea: string;
  sections: ReportSection[];
  nookalNotes: string;
  generatedAt: string;
};

/** form_data shape for assess_type = "initial_consult" rows in the shared
 * Assessment Tool `assessments` table (see lib/assessmentTool/db.ts) — same
 * table as the scored assessments, just a different form_data shape. */
export type ConsultFormData = {
  note: ConsultNote;
  report: GeneratedReport | null;
};
