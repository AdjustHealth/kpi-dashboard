/** The Initial Consultation / Client-Centred Consult note — fields mirror the
 * clinic's own CCC scripting structure (Subjective -> Objective -> Clinical
 * Reasoning -> Treatment) so physios fill it out the same way they already
 * take notes, nothing new to learn. */
export type ConsultNote = {
  patientName: string;
  clinician: string;
  consultDate: string;
  referralSource: string;
  subjective: {
    hpc: string;
    aggs: string;
    eases: string;
    pnn: string;
    redFlags: string;
    ix: string;
    pmhx: string;
    roadblocks: string;
    shxWork: string;
    exercise: string;
  };
  objective: {
    obs: string;
    functionGait: string;
    rom: string;
    mmt: string;
    specialTests: string;
    ndts: string;
    paivmsPams: string;
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

export function emptyConsultNote(): ConsultNote {
  return {
    patientName: "",
    clinician: "",
    consultDate: "",
    referralSource: "",
    subjective: { hpc: "", aggs: "", eases: "", pnn: "", redFlags: "", ix: "", pmhx: "", roadblocks: "", shxWork: "", exercise: "" },
    objective: { obs: "", functionGait: "", rom: "", mmt: "", specialTests: "", ndts: "", paivmsPams: "", palpation: "" },
    clinicalReasoning: { impression: "", workingClinicalModel: "", diagnosis: "", prognosis: "" },
    treatmentPlan: { symptomReduction: "", restorative: "", consolidation: "" },
    nextAppointment: "",
  };
}

export type ReportSection = { heading: string; body: string };

export type GeneratedReport = {
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
