import { PrintButton } from "@/components/consultationTemplates/PrintButton";
import type { BjjScreenFormData } from "@/lib/bjjInjuryScreen/types";
import { scoreBjjScreen, type MetricResult } from "@/lib/bjjInjuryScreen/scoring";

/**
 * The BJJ Performance Assessment's print report — built to match Adjust's
 * existing Performance/Youth assessment report exactly (see public/tool.html's
 * page/radar/domain-bar system): dark theme, Barlow Condensed, lime #c6f135
 * accent, a cover page, per-domain pages, and a closing summary page with a
 * radar profile — rather than the lighter Adjust-brand style used for the
 * Consultation Templates patient report, which is a different document for
 * a different audience (a patient, not a competitive athlete/coach).
 *
 * Only domains that actually have a test entered get a page, a domain bar,
 * or a radar axis — same rule the Youth/Performance report now follows: a
 * section nobody ran (e.g. Conditioning) isn't shown as an empty gap.
 */

const BG = "#06090d";
const PANEL = "#131b24";
const BORDER = "#1c2733";
const LIME = "#c6f135";
const MUTED = "#7a8fa6";
const TEXT = "#b8c8d8";
const GREEN = "#4cdb7a";
const AMBER = "#f5a623";
const RED = "#e05252";
const COND = "'Barlow Condensed',sans-serif";

function bandColor(score: number | null): string {
  if (score === null) return "#3a4f63";
  if (score >= 7.5) return GREEN;
  if (score >= 5) return AMBER;
  return RED;
}

function bandLabel(score: number | null): string {
  if (score === null) return "—";
  if (score >= 7.5) return "Strong";
  if (score >= 5) return "Avg";
  return "Focus";
}

function formatDate(value: string): string {
  if (!value) return "";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || "Athlete";
}

type TestRowData = { label: string; displayValue: string; result: MetricResult | null; unit?: string };

/** Elite/Avg/Focus reference values derived from the same 7.5/5 score bands everything else uses, so a reader can see not just this athlete's band but the actual numbers either side of it. */
function bandThresholds(result: MetricResult, unit: string): { focus: string; avg: string; strong: string } | null {
  if (!result.benchmark) return null;
  const b = result.benchmark.value;
  const fmt = (n: number) => (Number.isInteger(n) ? n.toString() : n.toFixed(1));
  const lo = b * 0.5;
  const hi = b * 0.75;
  return { focus: `<${fmt(lo)}${unit}`, avg: `${fmt(lo)}–${fmt(hi)}${unit}`, strong: `≥${fmt(hi)}${unit}` };
}

/** Short "vs ___" line under a test's label — plain reference data, not commentary. */
function refLine(row: TestRowData): string {
  const result = row.result;
  if (!result) return "Not recorded";
  if (!result.benchmark) return "";
  const kind = result.benchmark.confidence === "combat" ? "Combat-sport data" : "General elite standard";
  return `${kind} — target ${result.benchmark.value}`;
}

const RATING_COLOR: Record<"poor" | "demonstrated" | "good", string> = { poor: RED, demonstrated: AMBER, good: GREEN };
const RATING_LABEL: Record<"poor" | "demonstrated" | "good", string> = { poor: "Poor", demonstrated: "Demonstrated", good: "Good" };

/** Same treatment Adjust's Youth report uses for Poor/Demonstrated/Good ratings: the badge carries the rating word itself in its band colour, plus a 3-segment bar — no separate plain-white restatement of the word. */
function RatingRow({ label, rating }: { label: string; rating: "poor" | "demonstrated" | "good" }) {
  const color = RATING_COLOR[rating];
  return (
    <div style={{ padding: "13px 0", borderBottom: `1px solid ${BORDER}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontFamily: COND, fontSize: 14, fontWeight: 700, textTransform: "uppercase", color: "#ffffff" }}>{label}</span>
        <span
          style={{
            fontFamily: COND,
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: 1,
            textTransform: "uppercase",
            padding: "4px 10px",
            borderRadius: 3,
            background: `${color}26`,
            color,
            flexShrink: 0,
          }}
        >
          {RATING_LABEL[rating]}
        </span>
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {(["poor", "demonstrated", "good"] as const).map((seg) => (
          <div key={seg} style={{ flex: 1, height: 11, borderRadius: 3, background: seg === rating ? RATING_COLOR[seg] : BORDER }} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontSize: 8, color: MUTED }}>Poor</span>
        <span style={{ fontSize: 8, color: MUTED }}>Demonstrated</span>
        <span style={{ fontSize: 8, color: MUTED }}>Good</span>
      </div>
    </div>
  );
}

function PageShell({
  title,
  subtitle,
  pageNum,
  children,
}: {
  title: string;
  subtitle: string;
  pageNum: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="bjj-report-page"
      style={{
        background: BG,
        color: "#ffffff",
        width: "210mm",
        minHeight: "297mm",
        margin: "24px auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ height: 4, background: LIME, flexShrink: 0 }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", padding: "32px 44px 18px" }}>
        <div>
          <div style={{ fontFamily: COND, fontSize: 42, fontWeight: 900, textTransform: "uppercase", color: "#ffffff", lineHeight: 1 }}>{title}</div>
          <div style={{ fontFamily: COND, fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: MUTED, marginTop: 5 }}>{subtitle}</div>
        </div>
        <div
          style={{
            background: LIME,
            color: "#0d1117",
            fontFamily: COND,
            fontSize: 9,
            fontWeight: 900,
            letterSpacing: 2,
            textTransform: "uppercase",
            padding: "4px 10px",
            borderRadius: 2,
          }}
        >
          Page {pageNum}
        </div>
      </div>
      <div style={{ flex: 1, padding: "4px 44px 36px", display: "flex", flexDirection: "column", gap: 20 }}>{children}</div>
    </div>
  );
}

function DomainHero({ label, score, note }: { label: string; score: number | null; note: string }) {
  return (
    <div style={{ background: PANEL, border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 24, padding: "20px 28px" }}>
      <div style={{ textAlign: "center", minWidth: 90 }}>
        <div style={{ fontFamily: COND, fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: MUTED, marginBottom: 4 }}>{label}</div>
        <div style={{ fontFamily: COND, fontSize: 52, fontWeight: 900, color: bandColor(score), lineHeight: 1 }}>{score !== null ? score.toFixed(1) : "—"}</div>
        <div style={{ fontSize: 10, color: MUTED }}>out of 10</div>
      </div>
      <div style={{ width: 1, alignSelf: "stretch", background: BORDER }} />
      <div style={{ flex: 1, fontSize: 13, color: TEXT, lineHeight: 1.6 }}>{note}</div>
      {score !== null && (
        <span
          style={{
            fontFamily: COND,
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: 1,
            textTransform: "uppercase",
            padding: "6px 14px",
            borderRadius: 4,
            background: `${bandColor(score)}26`,
            color: bandColor(score),
            flexShrink: 0,
          }}
        >
          {bandLabel(score)}
        </span>
      )}
    </div>
  );
}

function TestRow({ row }: { row: TestRowData }) {
  const score = row.result?.score ?? null;
  const color = bandColor(score);
  const pct = row.result?.percentOfElite !== null && row.result?.percentOfElite !== undefined ? Math.min(100, row.result.percentOfElite) : null;
  const thresholds = row.result ? bandThresholds(row.result, row.unit ?? "") : null;
  return (
    <div style={{ padding: "13px 0", borderBottom: `1px solid ${BORDER}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: COND, fontSize: 14, fontWeight: 700, textTransform: "uppercase", color: "#ffffff" }}>{row.label}</div>
          {refLine(row) && <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{refLine(row)}</div>}
        </div>
        <div style={{ fontFamily: COND, fontSize: 24, fontWeight: 700, color: "#ffffff", textAlign: "right", minWidth: 76 }}>{row.displayValue}</div>
        <span
          style={{
            fontFamily: COND,
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: 1,
            textTransform: "uppercase",
            padding: "4px 10px",
            borderRadius: 3,
            background: `${color}26`,
            color,
            minWidth: 56,
            textAlign: "center",
            flexShrink: 0,
          }}
        >
          {bandLabel(score)}
        </span>
      </div>
      {pct !== null && (
        <div style={{ height: 5, borderRadius: 3, background: BORDER, overflow: "hidden", marginTop: 9 }}>
          <div style={{ height: "100%", borderRadius: 3, width: `${pct}%`, background: color }} />
        </div>
      )}
      {thresholds && (
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <span style={{ flex: 1, textAlign: "center", padding: "5px 6px", borderRadius: 3, background: `${RED}1a`, border: `1px solid ${RED}40`, fontSize: 9.5, color: RED, fontWeight: 600 }}>
            Focus {thresholds.focus}
          </span>
          <span style={{ flex: 1, textAlign: "center", padding: "5px 6px", borderRadius: 3, background: `${AMBER}1a`, border: `1px solid ${AMBER}40`, fontSize: 9.5, color: AMBER, fontWeight: 600 }}>
            Avg {thresholds.avg}
          </span>
          <span style={{ flex: 1, textAlign: "center", padding: "5px 6px", borderRadius: 3, background: `${GREEN}1a`, border: `1px solid ${GREEN}40`, fontSize: 9.5, color: GREEN, fontWeight: 600 }}>
            Strong {thresholds.strong}
          </span>
        </div>
      )}
    </div>
  );
}

function InterpretationBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: PANEL, borderLeft: `4px solid ${LIME}`, padding: "16px 22px" }}>
      <div style={{ fontFamily: COND, fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: LIME, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 12.5, color: TEXT, lineHeight: 1.7 }}>{children}</div>
    </div>
  );
}

function ProtocolBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: PANEL, border: `1px solid ${BORDER}`, padding: "16px 22px" }}>
      <div style={{ fontFamily: COND, fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: MUTED, marginBottom: 8 }}>How These Are Tested</div>
      <div style={{ fontSize: 12.5, color: TEXT, lineHeight: 1.7 }}>{children}</div>
    </div>
  );
}

function DomainBar({ label, score }: { label: string; score: number | null }) {
  const color = bandColor(score);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 110, fontFamily: COND, fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: TEXT }}>{label}</div>
      <div style={{ flex: 1, height: 11, borderRadius: 5, background: BORDER, overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 5, width: `${score !== null ? score * 10 : 0}%`, background: color }} />
      </div>
      <div style={{ width: 64, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
        <span style={{ fontFamily: COND, fontSize: 16, fontWeight: 700, color }}>
          {score !== null ? score.toFixed(1) : "—"}
          <span style={{ fontSize: 9, color: MUTED }}>/10</span>
        </span>
      </div>
      <span
        style={{
          fontFamily: COND,
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 1,
          textTransform: "uppercase",
          padding: "2px 7px",
          borderRadius: 3,
          background: `${color}26`,
          color,
          width: 48,
          textAlign: "center",
        }}
      >
        {bandLabel(score)}
      </span>
    </div>
  );
}

/** Inline SVG radar — translated from public/tool.html's own radar generator, with a dynamic axis count: only domains with a test entered get an axis (an untested domain isn't plotted as a collapsed zero-point). */
function RadarProfile({ domains }: { domains: { label: string; score: number | null }[] }) {
  const cx = 118;
  const cy = 118;
  const maxR = 90;
  const n = domains.length;
  const rings = [2, 4, 6, 8, 10].map((v) => {
    const r = (v / 10) * maxR;
    const pts = Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
    }).join(" ");
    return <polygon key={v} points={pts} fill="none" stroke={BORDER} strokeWidth={1} />;
  });
  const axes = domains.map((_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const ex = (cx + maxR * Math.cos(a)).toFixed(1);
    const ey = (cy + maxR * Math.sin(a)).toFixed(1);
    return <line key={i} x1={cx} y1={cy} x2={ex} y2={ey} stroke="#2a3a4a" strokeWidth={1} />;
  });
  const labels = domains.map((d, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const cos = Math.cos(a);
    const lx = (cx + (maxR + 16) * cos).toFixed(1);
    const ly = (cy + (maxR + 16) * Math.sin(a) + 4).toFixed(1);
    // Anchor away from the nearest viewBox edge instead of always centering,
    // so a long label on the leftmost/rightmost axis extends back toward
    // the chart instead of off the edge of the SVG.
    const anchor = cos < -0.15 ? "start" : cos > 0.15 ? "end" : "middle";
    return (
      <text key={i} x={lx} y={ly} textAnchor={anchor} fill={TEXT} fontSize={10} fontFamily={COND} fontWeight={600}>
        {d.label}
      </text>
    );
  });
  const polyPts = domains
    .map((d, i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      const r = ((d.score ?? 0) / 10) * maxR;
      return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
    })
    .join(" ");
  const points = domains.map((d, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const r = ((d.score ?? 0) / 10) * maxR;
    return <circle key={i} cx={(cx + r * Math.cos(a)).toFixed(1)} cy={(cy + r * Math.sin(a)).toFixed(1)} r={4} fill={LIME} stroke="#0d1117" strokeWidth={1.5} />;
  });
  return (
    <svg width={252} height={252} viewBox="-6 0 248 240">
      {rings}
      {axes}
      <polygon points={polyPts} fill="rgba(198,241,53,0.12)" stroke={LIME} strokeWidth={2} />
      {points}
      {labels}
    </svg>
  );
}

export function BjjReportDocument({ data, athleteName }: { data: BjjScreenFormData; athleteName: string }) {
  const score = scoreBjjScreen(data);
  const name = firstName(athleteName);

  const hasMobility =
    [data.mobility.shoulderErIr, data.mobility.hipErIr, data.mobility.lumbarFlexExt, data.mobility.txRotation, data.mobility.cervicalRotation].some(
      (r) => r !== ""
    ) || data.mobility.ankleDfKneeToWallCm !== "";
  const hasStrength = [data.strength.imtp, data.strength.standingShoulderY, data.strength.maxPullUps, data.strength.maxPushUps, data.strength.gripStrengthKg].some(
    (v) => v !== ""
  );
  const hasPower = [data.power.cmjHeight, data.power.dropJumpRsi].some((v) => v !== "");
  const hasConditioning = data.conditioning.wattBike3MinAvgWatts !== "";

  const mobilityRatingRows = (
    [
      { label: "Shoulder ER/IR", rating: data.mobility.shoulderErIr },
      { label: "Hip ER/IR", rating: data.mobility.hipErIr },
      { label: "Lumbar Flexion/Extension", rating: data.mobility.lumbarFlexExt },
      { label: "Thoracic (Tx) Rotation", rating: data.mobility.txRotation },
      { label: "Cervical Rotation", rating: data.mobility.cervicalRotation },
    ] as { label: string; rating: "" | "poor" | "demonstrated" | "good" }[]
  ).filter((r): r is { label: string; rating: "poor" | "demonstrated" | "good" } => r.rating !== "");

  const ankleDfRow: TestRowData | null = data.mobility.ankleDfKneeToWallCm
    ? { label: "Ankle DF — Knee to Wall", displayValue: `${data.mobility.ankleDfKneeToWallCm}cm`, result: score.ankleDfKneeToWallCm, unit: "cm" }
    : null;

  const strengthRows: TestRowData[] = [
    { label: "IMTP (vs. bodyweight)", displayValue: score.imtp ? `${score.imtp.value.toFixed(2)}×` : "—", result: score.imtp, unit: "×" },
    { label: "Standing Shoulder Y (ASH-Y)", displayValue: data.strength.standingShoulderY ? `${data.strength.standingShoulderY}N` : "—", result: score.standingShoulderY, unit: "N" },
    { label: "Max Pull Ups", displayValue: data.strength.maxPullUps ? `${data.strength.maxPullUps} reps` : "—", result: score.maxPullUps, unit: " reps" },
    { label: "Max Push Ups", displayValue: data.strength.maxPushUps ? `${data.strength.maxPushUps} reps` : "—", result: score.maxPushUps, unit: " reps" },
    { label: "Grip Strength", displayValue: data.strength.gripStrengthKg ? `${data.strength.gripStrengthKg}kg` : "—", result: score.gripStrengthKg, unit: "kg" },
  ].filter((r) => r.displayValue !== "—");

  const powerRows: TestRowData[] = [
    { label: "CMJ — Jump Height", displayValue: data.power.cmjHeight ? `${data.power.cmjHeight}cm` : "—", result: score.cmjHeight, unit: "cm" },
    { label: "RSI Mod (Drop Jump)", displayValue: data.power.dropJumpRsi ? Number(data.power.dropJumpRsi).toFixed(2) : "—", result: score.dropJumpRsi, unit: "" },
  ].filter((r) => r.displayValue !== "—");

  const conditioningRows: TestRowData[] = [
    { label: "3-Min Watt Bike — Avg Power", displayValue: data.conditioning.wattBike3MinAvgWatts ? `${data.conditioning.wattBike3MinAvgWatts}w` : "—", result: score.wattBike3MinAvgWatts, unit: "w" },
  ].filter((r) => r.displayValue !== "—");

  const domains = [
    hasMobility && { label: "Mobility", score: score.categoryScores.mobility },
    hasStrength && { label: "Strength", score: score.categoryScores.strength },
    hasPower && { label: "Power", score: score.categoryScores.power },
    hasConditioning && { label: "Conditioning", score: score.categoryScores.conditioning },
  ].filter((d): d is { label: string; score: number | null } => Boolean(d));

  // Key Development Areas — the lowest-scoring recorded tests.
  const allScored: { label: string; result: MetricResult }[] = (
    [
      { label: "IMTP", result: score.imtp },
      { label: "CMJ Jump Height", result: score.cmjHeight },
      { label: "RSI Mod (Drop Jump)", result: score.dropJumpRsi },
      { label: "Standing Shoulder Y (ASH-Y)", result: score.standingShoulderY },
      { label: "Max Pull Ups", result: score.maxPullUps },
      { label: "Max Push Ups", result: score.maxPushUps },
      { label: "Ankle DF — Knee to Wall", result: score.ankleDfKneeToWallCm },
      { label: "Grip Strength", result: score.gripStrengthKg },
      { label: "3-Min Watt Bike", result: score.wattBike3MinAvgWatts },
    ] as { label: string; result: MetricResult | null }[]
  )
    .filter((r): r is { label: string; result: MetricResult } => r.result !== null && r.result.score !== null)
    .sort((a, b) => (a.result.score as number) - (b.result.score as number));
  const focusAreas = allScored.filter((r) => (r.result.score as number) < 7.5).slice(0, 3);

  let pageNum = 1; // page 1 is the cover, rendered separately below
  const mobilityPage = hasMobility ? ++pageNum : null;
  const strengthPage = hasStrength ? ++pageNum : null;
  const powerPage = hasPower ? ++pageNum : null;
  const conditioningPage = hasConditioning ? ++pageNum : null;
  const summaryPage = ++pageNum;

  return (
    <div style={{ background: "#000000", minHeight: "100vh" }}>
      <style>{`
        @page { size: A4; margin: 0; }
        @media print {
          .no-print { display: none !important; }
          .bjj-report-page { margin: 0 !important; box-shadow: none !important; break-after: page; }
        }
      `}</style>

      <PrintButton />

      {/* ---- Cover ---- */}
      <div className="bjj-report-page" style={{ background: BG, width: "210mm", minHeight: "297mm", margin: "24px auto", boxShadow: "0 20px 60px rgba(0,0,0,0.55)", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 56px" }}>
        <div style={{ fontFamily: COND, fontSize: 13, fontWeight: 700, letterSpacing: 5, textTransform: "uppercase", color: LIME }}>Adjust Health</div>
        <div>
          <div style={{ fontFamily: COND, fontSize: 80, fontWeight: 900, textTransform: "uppercase", color: "#ffffff", lineHeight: 1.02, letterSpacing: -1 }}>BJJ</div>
          <div style={{ fontFamily: COND, fontSize: 80, fontWeight: 900, textTransform: "uppercase", color: "#ffffff", lineHeight: 1.02, letterSpacing: -1 }}>Performance</div>
          <div style={{ fontFamily: COND, fontSize: 80, fontWeight: 900, textTransform: "uppercase", color: LIME, lineHeight: 1.02, letterSpacing: -1, marginBottom: 40 }}>Report</div>
          <div style={{ border: `2px solid ${LIME}`, padding: "14px 40px", display: "inline-block", marginBottom: 12 }}>
            <div style={{ fontFamily: COND, fontSize: 26, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase", color: "#ffffff" }}>{name}</div>
          </div>
          <div style={{ display: "flex", gap: 18, fontSize: 11, color: MUTED, letterSpacing: 1 }}>
            {data.assessmentDate && <span>{formatDate(data.assessmentDate)}</span>}
            {data.clinician && <span>Assessed by {data.clinician}</span>}
          </div>
        </div>
        <span style={{ fontFamily: COND, fontSize: 9, fontWeight: 700, letterSpacing: 3, color: LIME, textTransform: "uppercase" }}>Get Better. Get Moving. Get Strong.</span>
      </div>

      {/* ---- Mobility ---- */}
      {mobilityPage && (
        <PageShell title="Mobility" subtitle="Poor / Demonstrated / Good, plus measured ankle dorsiflexion" pageNum={mobilityPage}>
          <DomainHero
            label="Mobility"
            score={score.categoryScores.mobility}
            note={
              score.categoryScores.mobility !== null
                ? score.categoryScores.mobility >= 7.5
                  ? "Full, functional range across what was tested — no restriction limiting output here."
                  : score.categoryScores.mobility >= 5
                    ? "Workable range with some restriction — worth revisiting alongside strength work."
                    : "Restricted range is the clearest limiter here — prioritise this before loading strength/power on top of it."
                : "Set Sex above to compare the measured tests against reference data."
            }
          />
          <div>
            {mobilityRatingRows.map((r) => <RatingRow key={r.label} label={r.label} rating={r.rating} />)}
            {ankleDfRow && <TestRow row={ankleDfRow} />}
          </div>
          <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
            <ProtocolBox>
              Shoulder/hip/thoracic/cervical rotation: the clinician moves each joint through range and rates it Poor, Demonstrated or Good against age and sport-appropriate expectations. Ankle DF (knee-to-wall): foot flat, knee driven over the toes without the heel lifting — distance from the wall to the big toe at end-range is recorded in cm.
            </ProtocolBox>
            <InterpretationBox title="Mobility Interpretation">
              Restricted rotation anywhere in this chain tends to push load onto the lumbar spine during grappling-specific positions — a Focus rating here is worth acting on before it shows up as a strength or power ceiling.
            </InterpretationBox>
          </div>
        </PageShell>
      )}

      {/* ---- Strength ---- */}
      {strengthPage && (
        <PageShell title="Strength" subtitle="Vs. elite &amp; general-population reference data" pageNum={strengthPage}>
          <DomainHero
            label="Strength"
            score={score.categoryScores.strength}
            note={
              score.categoryScores.strength !== null
                ? score.categoryScores.strength >= 7.5
                  ? "Strong across the board — force production is not the limiting factor right now."
                  : score.categoryScores.strength >= 5
                    ? "Solid base — targeted loading will close the gap to elite reference data."
                    : "Clear development priority — build a base here before adding volume elsewhere."
                : "Set Sex above to compare these tests against reference data."
            }
          />
          <div>{strengthRows.map((r) => <TestRow key={r.label} row={r} />)}</div>
          <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
            <ProtocolBox>
              IMTP: maximal two-handed pull against an immovable bar on a force plate, held 3–5 seconds, peak force ÷ bodyweight. ASH-Y: dynamometer pull in the Y position of the Athletic Shoulder Test, dominant arm. Pull-ups/push-ups: max unbroken reps to standard. Grip: max isometric squeeze on a hand dynamometer, dominant hand.
            </ProtocolBox>
            <InterpretationBox title="Strength Interpretation">
              IMTP is normalised against bodyweight (peak force ÷ bodyweight) since raw force alone doesn&rsquo;t compare fairly across weight classes. Combat-sport-specific data is used where it exists (IMTP, grip); the rest are compared against the best available general-population standard.
            </InterpretationBox>
          </div>
        </PageShell>
      )}

      {/* ---- Power ---- */}
      {powerPage && (
        <PageShell title="Power" subtitle="Vs. elite &amp; general-population reference data" pageNum={powerPage}>
          <DomainHero
            label="Power"
            score={score.categoryScores.power}
            note={
              score.categoryScores.power !== null
                ? score.categoryScores.power >= 7.5
                  ? "Elite-level rate of force development — translates directly to explosive scrambles and takedowns."
                  : score.categoryScores.power >= 5
                    ? "Good power output with room to develop — plyometric and ballistic work will move this."
                    : "Power is the clearest development priority — low jump height/RSI usually means force is there but isn't being expressed quickly."
                : "Set Sex above to compare these tests against reference data."
            }
          />
          <div>{powerRows.map((r) => <TestRow key={r.label} row={r} />)}</div>
          <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
            <ProtocolBox>
              CMJ: hands on hips, drop straight into a quarter squat and jump for maximum height — no countermovement pause or arm swing, measured on a force plate or jump mat. RSI Mod (drop jump): step off a box, rebound off the floor as high and as fast as possible; RSI Mod = jump height ÷ ground contact time.
            </ProtocolBox>
            <InterpretationBox title="Power Interpretation">
              CMJ height reflects raw lower-body power; RSI Mod reflects how quickly that power is expressed — the same &ldquo;RSI Mod, &gt;1.50 excellent&rdquo; threshold used on every Adjust assessment report.
            </InterpretationBox>
          </div>
        </PageShell>
      )}

      {/* ---- Conditioning ---- */}
      {conditioningPage && (
        <PageShell title="Conditioning" subtitle="Vs. general-population reference data" pageNum={conditioningPage}>
          <DomainHero
            label="Conditioning"
            score={score.categoryScores.conditioning}
            note={
              score.categoryScores.conditioning !== null
                ? score.categoryScores.conditioning >= 7.5
                  ? "Strong aerobic/anaerobic base — unlikely to be the first thing that fades in a long match."
                  : score.categoryScores.conditioning >= 5
                    ? "Workable engine — interval work will lift this further."
                    : "Conditioning is a development priority — technique tends to break down first when this is the limiter."
                : "Set Sex above to compare this test against reference data."
            }
          />
          <div>{conditioningRows.map((r) => <TestRow key={r.label} row={r} />)}</div>
          <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
            <ProtocolBox>
              3-Min Watt Bike: seated, all-out effort sustained for 3 minutes on an air/watt bike — average power output across the full 3 minutes is recorded.
            </ProtocolBox>
            <InterpretationBox title="Conditioning Interpretation">
              Scored against the same 3-minute all-out Watt Bike standard used on Adjust&rsquo;s Performance assessment report.
            </InterpretationBox>
          </div>
        </PageShell>
      )}

      {/* ---- Summary ---- */}
      <PageShell title="Summary" subtitle="Performance profile — vs. elite &amp; general-population reference data" pageNum={summaryPage}>
        <div style={{ background: PANEL, border: `1px solid ${BORDER}`, display: "flex", overflow: "hidden" }}>
          <div style={{ padding: "22px 30px", textAlign: "center", borderRight: `1px solid ${BORDER}` }}>
            <div style={{ fontFamily: COND, fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: MUTED }}>Overall</div>
            <div style={{ fontFamily: COND, fontSize: 56, fontWeight: 900, color: bandColor(score.overall), lineHeight: 1 }}>{score.overall !== null ? score.overall.toFixed(1) : "—"}</div>
            <div style={{ fontSize: 10, color: MUTED }}>out of 10</div>
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", padding: "0 28px", fontFamily: COND, fontSize: 17, fontWeight: 700, textTransform: "uppercase", color: "#ffffff" }}>
            {score.overall !== null
              ? score.overall >= 7.5
                ? "Strong overall athlete"
                : score.overall >= 5
                  ? "Good foundation — targeted development will drive gains"
                  : "Key areas identified for focused development"
              : "Complete assessment"}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 24 }}>
          <div>
            <div style={{ fontFamily: COND, fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: MUTED, marginBottom: 12 }}>Domain Scores</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {domains.map((d) => (
                <DomainBar key={d.label} label={d.label} score={d.score} />
              ))}
            </div>
            <div style={{ marginTop: 10, padding: "8px 12px", background: "#1c2733", fontSize: 9.5, color: MUTED }}>
              Combat-sport data where it exists; best available elite/general-population standard otherwise. <span style={{ color: GREEN }}>Strong</span> ≥7.5 · <span style={{ color: AMBER }}>Avg</span> 5–7.4 · <span style={{ color: RED }}>Focus</span> &lt;5
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontFamily: COND, fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: MUTED, marginBottom: 8, alignSelf: "flex-start" }}>Radar Profile</div>
            {domains.length >= 3 ? (
              <RadarProfile domains={domains} />
            ) : (
              <div style={{ width: 236, height: 240, display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, fontSize: 11, textAlign: "center", padding: 20 }}>
                Complete at least 3 domains for a radar profile.
              </div>
            )}
          </div>
        </div>

        <div>
          <div style={{ fontFamily: COND, fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: MUTED, marginBottom: 12 }}>Key Development Areas</div>
          {focusAreas.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {focusAreas.map((d, i) => (
                <div key={d.label} style={{ background: PANEL, borderLeft: `4px solid ${LIME}`, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: LIME, color: "#0d1117", fontFamily: COND, fontSize: 16, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: COND, fontSize: 14, fontWeight: 700, textTransform: "uppercase", color: "#ffffff" }}>{d.label}</div>
                    <div style={{ fontSize: 11, color: TEXT, marginTop: 2 }}>{d.result.percentOfElite}% of target</div>
                  </div>
                  <span style={{ fontFamily: COND, fontSize: 18, fontWeight: 900, color: bandColor(d.result.score) }}>{(d.result.score as number).toFixed(1)}</span>
                </div>
              ))}
            </div>
          ) : allScored.length > 0 ? (
            <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderLeft: `4px solid ${GREEN}`, padding: 18, color: TEXT, fontSize: 12 }}>
              Every tested metric is at or above the Strong band — no focus areas identified.
            </div>
          ) : (
            <div style={{ background: PANEL, border: `1px solid ${BORDER}`, padding: 18, color: MUTED, fontSize: 11 }}>—</div>
          )}
        </div>

        <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
          <div style={{ fontSize: 10, color: MUTED }}>Assessed by {data.clinician || "—"} on {data.assessmentDate ? formatDate(data.assessmentDate) : "—"}</div>
          <div style={{ fontFamily: COND, fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: LIME }}>Get Better. Get Moving. Get Strong.</div>
        </div>
      </PageShell>
    </div>
  );
}
