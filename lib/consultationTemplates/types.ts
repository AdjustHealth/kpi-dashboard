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
    symptomReduction: string;
    restorative: string;
    consolidation: string;
  };
  nextAppointment: string;
};

/** Pre-filled with the clinic's own HPC/Body Chart labels so a new note
 * starts looking like the template physios already fill in in Nookal. */
const HPC_BODY_CHART_TEMPLATE = "HPC:\nPNN:\nAGGS:\nEASES:\n24HR:\nCLICKING/CATCHING/LOCKING:";

export function emptyConsultNote(): ConsultNote {
  return {
    patientName: "",
    clinician: "",
    consultDate: "",
    referralSource: "",
    goals: { whyNow: "", todayGoal: "", longTermGoal: "", roadblockPerceived: "" },
    subjective: { hpcBodyChart: HPC_BODY_CHART_TEMPLATE, pastHistory: "", imagingRedFlags: "", pmhxSurgeryMeds: "", occupationSocial: "" },
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
    clinicalReasoning: { impression: "", workingClinicalModel: "", diagnosis: "", prognosis: "" },
    treatmentPlan: { symptomReduction: "", restorative: "", consolidation: "" },
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
