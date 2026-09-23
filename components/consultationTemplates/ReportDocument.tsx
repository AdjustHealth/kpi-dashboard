import { PrintButton } from "./PrintButton";
import type { ConsultNote, GeneratedReport } from "@/lib/consultationTemplates/types";

const PHASES: [keyof ConsultNote["treatmentPlan"], string, string][] = [
  ["symptomReduction", "Symptom Reduction", "M4 12h8M12 8v8"],
  ["restorative", "Restorative", "M12 3v4M12 17v4M3 12h4M17 12h4M7.05 7.05l2.83 2.83M14.12 14.12l2.83 2.83M7.05 16.95l2.83-2.83M14.12 9.88l2.83-2.83"],
  ["consolidation", "Consolidation", "M5 21V9l7-6 7 6v12M9 21v-6h6v6"],
];

function formatDate(value: string): string {
  if (!value) return "";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || "";
}

/** The one thing pulled straight from the client's own words rather than the
 * AI narrative — a direct callback to what they told us they wanted, so the
 * report visibly answers a client-centred consult instead of just reciting
 * exam findings. Prefers what they wanted from today, since that's the most
 * concrete and specific of the four goal prompts. */
function pickClientQuote(note: ConsultNote): string {
  return note.goals.todayGoal.trim() || note.goals.longTermGoal.trim() || note.goals.whyNow.trim() || note.goals.roadblockPerceived.trim();
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
  const quote = pickClientQuote(note);
  const name = firstName(note.patientName) || "there";

  return (
    <div style={{ background: "#eef1ee", minHeight: "100vh" }}>
      <style>{`
        @page { size: A4; margin: 0; }
        @media print {
          .no-print { display: none !important; }
          body { background: #fdfcfa !important; }
          .report-page { box-shadow: none !important; margin: 0 !important; border-radius: 0 !important; }
          .report-hero { border-radius: 0 !important; }
          .report-block { break-inside: avoid; }
          .journey-track { break-inside: avoid; }
        }
      `}</style>

      <PrintButton />

      <div className="report-page mx-auto max-w-[820px] overflow-hidden" style={{ margin: "32px auto", borderRadius: "24px", boxShadow: "0 24px 70px rgba(10,14,23,0.16)" }}>
        {/* ---- Hero ---- */}
        <div className="report-hero relative overflow-hidden px-10 pb-10 pt-9 sm:px-14 sm:pb-14 sm:pt-11" style={{ background: "linear-gradient(160deg,#0a0e17 0%,#0d1f19 62%,#0f2a20 100%)" }}>
          <div style={{ position: "absolute", inset: "0 0 auto 0", height: 5, background: "linear-gradient(90deg,#a6e22e,#34d399)" }} />
          <div
            aria-hidden
            style={{
              position: "absolute",
              right: "-90px",
              top: "-90px",
              width: 320,
              height: 320,
              borderRadius: "999px",
              background: "radial-gradient(circle,rgba(166,226,46,0.16),transparent 70%)",
            }}
          />

          <div className="relative flex items-start justify-between gap-6">
            <div>
              <div
                className="font-display text-lg font-black uppercase tracking-wide"
                style={{ background: "linear-gradient(90deg,#c7f26a,#5ee6ab)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}
              >
                Adjust Health
              </div>
              <div className="mt-0.5 text-[10.5px] font-medium uppercase tracking-[0.18em]" style={{ color: "rgba(244,246,248,0.5)" }}>
                Get Better · Get Moving · Get Strong
              </div>
            </div>
            <div className="text-right text-[10.5px] font-semibold uppercase tracking-[0.2em]" style={{ color: "#8fe8b8" }}>
              Your Recovery
              <br />
              Roadmap
            </div>
          </div>

          <h1 className="relative mt-9 font-display font-black leading-[1.05] text-white" style={{ fontSize: "clamp(30px,4vw,42px)", textWrap: "balance" }}>
            {name}, here&rsquo;s your path forward.
          </h1>

          <div className="relative mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13.5px]" style={{ color: "rgba(244,246,248,0.72)" }}>
            {note.consultDate && <span>{formatDate(note.consultDate)}</span>}
            {note.clinician && <span>Seen by {note.clinician}</span>}
          </div>

          {report.focusArea && (
            <div
              className="relative mt-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-semibold"
              style={{ background: "rgba(166,226,46,0.14)", border: "1px solid rgba(166,226,46,0.3)", color: "#d4f4a0" }}
            >
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <circle cx="12" cy="12" r="9" opacity="0.4" />
              </svg>
              {report.focusArea}
            </div>
          )}
        </div>

        <div style={{ background: "#fdfcfa" }}>
          {/* ---- Client's own words ---- */}
          {quote && (
            <div className="report-block px-10 pb-2 pt-10 sm:px-14 sm:pt-12">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.18em]" style={{ color: "#5f9e56" }}>
                What You Told Us
              </div>
              <p className="relative mt-3 pl-6 font-display text-[21px] font-semibold leading-snug" style={{ color: "#0a0e17", borderLeft: "3px solid #a6e22e" }}>
                &ldquo;{quote}&rdquo;
              </p>
              <p className="mt-2 pl-6 text-[12px]" style={{ color: "#8b93a5" }}>
                — in your own words, at check-in
              </p>
            </div>
          )}

          {/* ---- Narrative sections ---- */}
          <div className="flex flex-col px-10 sm:px-14">
            {report.sections.map((s, i) => (
              <div key={i} className="report-block py-7" style={{ borderTop: "1px solid #ece9e2" }}>
                <h2 className="font-display text-[13px] font-bold uppercase tracking-[0.06em]" style={{ color: "#0f9e6e" }}>
                  {String(i + 1).padStart(2, "0")} — {s.heading}
                </h2>
                <div className="mt-2.5 whitespace-pre-line text-[15px] leading-[1.7]" style={{ color: "#2c3341", maxWidth: "62ch" }}>
                  {s.body}
                </div>
              </div>
            ))}
          </div>

          {/* ---- Treatment journey ---- */}
          {hasPhases && (
            <div className="report-block px-10 pb-2 pt-10 sm:px-14" style={{ borderTop: "1px solid #ece9e2" }}>
              <h2 className="font-display text-[13px] font-bold uppercase tracking-[0.06em]" style={{ color: "#0f9e6e" }}>
                Your Treatment Journey
              </h2>
              <div className="journey-track relative mt-8 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-3">
                <div
                  aria-hidden
                  className="hidden sm:block"
                  style={{ position: "absolute", left: "16.5%", right: "16.5%", top: 19, height: 2, background: "linear-gradient(90deg,#a6e22e,#34d399)", opacity: 0.35 }}
                />
                {PHASES.map(([key, label, icon], i) => {
                  const text = note.treatmentPlan[key];
                  if (!text?.trim()) return null;
                  return (
                    <div key={key} className="relative">
                      <div
                        className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full text-white shadow-sm"
                        style={{ background: "linear-gradient(135deg,#a6e22e,#34d399)" }}
                      >
                        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#0a0e17" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d={icon} />
                        </svg>
                      </div>
                      <div className="mt-3 font-display text-[10.5px] font-bold uppercase tracking-[0.1em]" style={{ color: "#8b93a5" }}>
                        Phase {i + 1}
                      </div>
                      <div className="font-display text-[15px] font-bold" style={{ color: "#0a0e17" }}>
                        {label}
                      </div>
                      <p className="mt-2 whitespace-pre-line text-[12.5px] leading-relaxed" style={{ color: "#5b6478" }}>
                        {text}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ---- Next appointment ---- */}
          {note.nextAppointment && (
            <div className="px-10 pb-2 pt-10 sm:px-14">
              <div className="report-block flex items-center gap-4 rounded-2xl px-6 py-5" style={{ background: "#0a0e17" }}>
                <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full" style={{ background: "rgba(166,226,46,0.16)" }}>
                  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="#a6e22e" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                </div>
                <div>
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.18em]" style={{ color: "#8fe8b8" }}>
                    Your Next Appointment
                  </div>
                  <div className="font-display text-lg font-bold text-white">{note.nextAppointment}</div>
                </div>
              </div>
            </div>
          )}

          {/* ---- Sign-off ---- */}
          <div className="px-10 pb-12 pt-10 sm:px-14">
            <p className="text-[14px] leading-relaxed" style={{ color: "#2c3341", maxWidth: "52ch" }}>
              Thank you for choosing to work with us at Adjust — it means a lot, and we&rsquo;re genuinely looking forward to helping you get there.
            </p>
            <p className="mt-5 font-display text-[15px] font-bold" style={{ color: "#0a0e17" }}>
              Warmly, {note.clinician || "your Adjust Health team"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
