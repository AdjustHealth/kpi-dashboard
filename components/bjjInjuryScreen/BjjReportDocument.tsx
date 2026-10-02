import { PrintButton } from "@/components/consultationTemplates/PrintButton";
import type { BjjScreenFormData } from "@/lib/bjjInjuryScreen/types";
import { scoreBjjScreen, type MetricResult } from "@/lib/bjjInjuryScreen/scoring";

function formatDate(value: string): string {
  if (!value) return "";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || "";
}

const RATING_DISPLAY: Record<string, string> = { poor: "Poor", demonstrated: "Demonstrated", good: "Good" };

function scoreColor(score: number | null): string {
  if (score === null) return "#8b93a5";
  if (score >= 7.5) return "#34d399";
  if (score >= 5) return "#f2b84a";
  return "#ef6a5f";
}

type Category = {
  label: string;
  tests: { label: string; value: string | null; unit?: string; result: MetricResult | null }[];
};

function StatCard({ label, value, unit, result }: { label: string; value: string | null; unit?: string; result: MetricResult | null }) {
  const hasValue = value !== null && value !== "";
  return (
    <div className="flex flex-col gap-1.5 rounded-xl px-4 py-3" style={{ background: "#f4f6f3", border: "1px solid #e4e8e1" }}>
      <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#8b93a5" }}>
        {label}
      </span>
      <span className="font-display text-xl font-black" style={{ color: "#0a0e17" }}>
        {hasValue ? `${value}${unit ? ` ${unit}` : ""}` : "—"}
      </span>
      {result?.score !== null && result?.score !== undefined ? (
        <span className="text-[12px] font-semibold" style={{ color: scoreColor(result.score) }}>
          {result.percentOfElite}% of elite
        </span>
      ) : result ? (
        <span className="text-[11px]" style={{ color: "#8b93a5" }}>
          No elite benchmark for this test
        </span>
      ) : null}
    </div>
  );
}

/**
 * The BJJ Performance Assessment's own print-friendly report — same visual
 * language as ReportDocument.tsx (Consultation Templates' patient report),
 * a stats-and-benchmarks layout instead of an AI narrative since there's
 * nothing to narrate here, just real numbers against real reference data.
 */
export function BjjReportDocument({ data, athleteName }: { data: BjjScreenFormData; athleteName: string }) {
  const score = scoreBjjScreen(data);
  const name = firstName(athleteName) || "Athlete";

  const categories: Category[] = [
    {
      label: "Mobility",
      tests: [
        { label: "Shoulder ER/IR", value: RATING_DISPLAY[data.mobility.shoulderErIr] ?? null, result: null },
        { label: "Hip ER/IR", value: RATING_DISPLAY[data.mobility.hipErIr] ?? null, result: null },
        { label: "Lumbar Flexion/Extension", value: RATING_DISPLAY[data.mobility.lumbarFlexExt] ?? null, result: null },
        { label: "Thoracic (Tx) Rotation", value: RATING_DISPLAY[data.mobility.txRotation] ?? null, result: null },
        { label: "Ankle DF — Knee to Wall", value: data.mobility.ankleDfKneeToWallCm || null, unit: "cm", result: score.ankleDfKneeToWallCm },
      ],
    },
    {
      label: "Strength",
      tests: [
        { label: "IMTP — Peak Force", value: data.strength.imtp || null, unit: "kg", result: score.imtp },
        { label: "Standing Shoulder Y", value: data.strength.standingShoulderY || null, unit: "cm", result: score.standingShoulderY },
        { label: "Max Pull Ups", value: data.strength.maxPullUps || null, unit: "reps", result: score.maxPullUps },
        { label: "Max Chin Ups", value: data.strength.maxChinUps || null, unit: "reps", result: score.maxChinUps },
        { label: "Grip Strength", value: data.strength.gripStrengthKg || null, unit: "kg", result: score.gripStrengthKg },
      ],
    },
    {
      label: "Power",
      tests: [
        { label: "CMJ — Jump Height", value: data.power.cmjHeight || null, unit: "cm", result: score.cmjHeight },
        { label: "Drop Jump — RSI", value: data.power.dropJumpRsi || null, result: score.dropJumpRsi },
      ],
    },
    {
      label: "Conditioning",
      tests: [
        {
          label: "3-Min Watt Bike — Avg Power",
          value: data.conditioning.wattBike3MinAvgWatts || null,
          unit: "w",
          result: score.wattBike3MinAvgWatts !== null ? ({ value: score.wattBike3MinAvgWatts, percentOfElite: null, score: null, benchmark: null } as MetricResult) : null,
        },
      ],
    },
  ];

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
        }
      `}</style>

      <PrintButton />

      <div className="report-page mx-auto max-w-[820px] overflow-hidden" style={{ margin: "32px auto", borderRadius: "24px", boxShadow: "0 24px 70px rgba(10,14,23,0.16)" }}>
        {/* ---- Hero ---- */}
        <div
          className="report-hero relative overflow-hidden px-10 pb-10 pt-9 sm:px-14 sm:pb-14 sm:pt-11"
          style={{ background: "linear-gradient(160deg,#0a0e17 0%,#0d1f19 62%,#0f2a20 100%)" }}
        >
          <div style={{ position: "absolute", inset: "0 0 auto 0", height: 5, background: "linear-gradient(90deg,#a6e22e,#34d399)" }} />
          <div
            aria-hidden
            style={{ position: "absolute", right: "-90px", top: "-90px", width: 320, height: 320, borderRadius: "999px", background: "radial-gradient(circle,rgba(166,226,46,0.16),transparent 70%)" }}
          />

          <div className="relative">
            <div
              className="font-display text-lg font-black uppercase italic tracking-wide"
              style={{ background: "linear-gradient(90deg,#c7f26a,#5ee6ab)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}
            >
              Adjust Health
            </div>
            <div className="mt-0.5 text-[10.5px] font-medium uppercase tracking-[0.18em]" style={{ color: "rgba(244,246,248,0.5)" }}>
              Get Better · Get Moving · Get Strong
            </div>
          </div>

          <h1 className="relative mt-9 font-display font-black italic leading-[1.03] text-white" style={{ fontSize: "clamp(32px,4.6vw,48px)", textWrap: "balance" }}>
            {name}&rsquo;s BJJ Performance Assessment
          </h1>

          <div className="relative mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13.5px]" style={{ color: "rgba(244,246,248,0.72)" }}>
            {data.assessmentDate && <span>{formatDate(data.assessmentDate)}</span>}
            {data.clinician && <span>Assessed by {data.clinician}</span>}
          </div>

          <div
            className="relative mt-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-semibold"
            style={{ background: "rgba(166,226,46,0.14)", border: "1px solid rgba(166,226,46,0.3)", color: "#d4f4a0" }}
          >
            {score.overall !== null ? `${score.overall}/10 vs. Elite` : "Not enough data yet to score"}
          </div>
        </div>

        <div style={{ background: "#fdfcfa" }}>
          <div className="px-10 pt-10 sm:px-14 sm:pt-12">
            <div className="relative">
              <div
                aria-hidden
                className="hidden sm:block"
                style={{ position: "absolute", left: 21, top: 22, bottom: 22, width: 2, background: "linear-gradient(180deg,#a6e22e,#34d399)", opacity: 0.3 }}
              />
              <div className="flex flex-col gap-9">
                {categories.map((cat, i) => (
                  <div key={cat.label} className="report-block relative flex gap-5">
                    <div
                      className="relative z-10 flex h-11 w-11 flex-none items-center justify-center rounded-full text-white shadow-sm"
                      style={{ background: "linear-gradient(135deg,#a6e22e,#34d399)" }}
                    >
                      <span className="font-display text-base font-black" style={{ color: "#0a0e17" }}>
                        {i + 1}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 pb-1 pt-1">
                      <h2 className="font-display text-[19px] font-bold" style={{ color: "#0a0e17" }}>
                        {cat.label}
                      </h2>
                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {cat.tests.map((t) => (
                          <StatCard key={t.label} label={t.label} value={t.value} unit={t.unit} result={t.result} />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="px-10 pb-4 pt-10 sm:px-14">
            <p className="text-[11.5px] leading-relaxed" style={{ color: "#8b93a5", maxWidth: "64ch" }}>
              Elite reference values are combat-sport-specific (judo/national-team combat athletes) where that data exists; where it doesn&rsquo;t, the best available general elite-athlete figures are shown instead and are not BJJ-specific. No published reference exists for the 3-Min Watt Bike test, so it&rsquo;s recorded for tracking only.
            </p>
          </div>

          <div className="px-10 pb-12 pt-4 sm:px-14">
            <p className="mt-2 font-display text-[15px] font-bold" style={{ color: "#0a0e17" }}>
              Adjust Health Performance Team
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
