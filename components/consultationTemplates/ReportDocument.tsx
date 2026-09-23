import { PrintButton } from "./PrintButton";
import type { ConsultNote, GeneratedReport } from "@/lib/consultationTemplates/types";

const PHASES: [keyof ConsultNote["treatmentPlan"], string][] = [
  ["symptomReduction", "Symptom Reduction"],
  ["restorative", "Restorative"],
  ["consolidation", "Consolidation"],
];

function formatDate(value: string): string {
  if (!value) return "";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * The actual patient-facing document — a light, print-optimised page
 * deliberately independent of the app's dark theme (this gets saved/printed
 * as a PDF a client receives, not viewed as part of the hub's own UI).
 * "Save as PDF" is the browser's native print-to-PDF against this page's
 * own print stylesheet, not a server-rendered file — same mechanism the
 * legacy Assessment Tool already relies on, just with a purpose-built,
 * professionally designed template instead of a dumped print of a form.
 */
export function ReportDocument({ note, report }: { note: ConsultNote; report: GeneratedReport }) {
  const hasPhases = PHASES.some(([key]) => note.treatmentPlan[key]?.trim());

  return (
    <div style={{ background: "#eef1f5", minHeight: "100vh" }}>
      <style>{`
        @page { size: A4; margin: 16mm 14mm; }
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .report-page { box-shadow: none !important; margin: 0 !important; border-radius: 0 !important; }
          .report-card { break-inside: avoid; }
          .phase-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
      `}</style>

      <PrintButton />

      <div
        className="report-page mx-auto max-w-[820px] overflow-hidden"
        style={{ background: "#ffffff", margin: "32px auto", borderRadius: "20px", boxShadow: "0 20px 60px rgba(10,14,23,0.12)" }}
      >
        <div style={{ height: 8, background: "linear-gradient(90deg,#a6e22e,#34d399)" }} />

        <div className="px-10 pb-8 pt-8 sm:px-14 sm:pt-10">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="font-display text-xl font-black uppercase tracking-wide" style={{ background: "linear-gradient(90deg,#5fa50f,#0f9e6e)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
                Adjust Health
              </div>
              <div className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.15em]" style={{ color: "#8b93a5" }}>
                Get Better · Get Moving · Get Strong
              </div>
            </div>
            <div className="text-right text-[11px] font-medium uppercase tracking-[0.15em]" style={{ color: "#8b93a5" }}>
              Consultation Summary &amp;
              <br />
              Treatment Pathway
            </div>
          </div>

          <div className="mt-8 border-t pt-6" style={{ borderColor: "#e6e9ee" }}>
            <h1 className="font-display text-3xl font-bold" style={{ color: "#0a0e17" }}>
              {note.patientName || "Your Consultation Summary"}
            </h1>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm" style={{ color: "#5b6478" }}>
              {note.consultDate && <span>{formatDate(note.consultDate)}</span>}
              {note.clinician && <span>Seen by {note.clinician}</span>}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5 px-10 pb-10 sm:px-14">
          {report.sections.map((s, i) => (
            <div key={i} className="report-card flex gap-4 rounded-2xl p-6" style={{ background: "#f7f9fb" }}>
              <div className="mt-0.5 h-full w-1 flex-none rounded-full" style={{ background: "linear-gradient(180deg,#a6e22e,#34d399)" }} />
              <div>
                <h2 className="font-display text-base font-bold uppercase tracking-wide" style={{ color: "#0a0e17" }}>
                  {s.heading}
                </h2>
                <div className="mt-2 whitespace-pre-line text-[14.5px] leading-relaxed" style={{ color: "#333c4d" }}>
                  {s.body}
                </div>
              </div>
            </div>
          ))}

          {hasPhases && (
            <div className="report-card rounded-2xl p-6" style={{ background: "#f7f9fb" }}>
              <h2 className="font-display text-base font-bold uppercase tracking-wide" style={{ color: "#0a0e17" }}>
                Your Treatment Journey
              </h2>
              <div className="phase-grid mt-5 grid grid-cols-1 gap-6 sm:grid-cols-3">
                {PHASES.map(([key, label], i) => {
                  const text = note.treatmentPlan[key];
                  if (!text?.trim()) return null;
                  return (
                    <div key={key} className="relative">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-8 w-8 flex-none items-center justify-center rounded-full font-display text-sm font-bold text-white"
                          style={{ background: "linear-gradient(135deg,#a6e22e,#34d399)" }}
                        >
                          {i + 1}
                        </div>
                        <div className="font-display text-sm font-bold uppercase tracking-wide" style={{ color: "#0a0e17" }}>
                          {label}
                        </div>
                      </div>
                      <p className="mt-3 whitespace-pre-line text-[13px] leading-relaxed" style={{ color: "#5b6478" }}>
                        {text}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {note.nextAppointment && (
            <div className="report-card flex items-center gap-4 rounded-2xl p-6" style={{ background: "linear-gradient(90deg,rgba(166,226,46,0.12),rgba(52,211,153,0.12))" }}>
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full" style={{ background: "#0a0e17" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              </div>
              <div>
                <div className="text-[11px] font-medium uppercase tracking-[0.15em]" style={{ color: "#5b6478" }}>
                  Your Next Appointment
                </div>
                <div className="font-display text-lg font-bold" style={{ color: "#0a0e17" }}>
                  {note.nextAppointment}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-10 pb-10 pt-2 sm:px-14">
          <div className="border-t pt-6 text-center text-[12px]" style={{ borderColor: "#e6e9ee", color: "#8b93a5" }}>
            Thank you for choosing Adjust Health — we&rsquo;re looking forward to helping you get better.
          </div>
        </div>
      </div>
    </div>
  );
}
