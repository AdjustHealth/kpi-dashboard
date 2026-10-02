import { PrintButton } from "@/components/consultationTemplates/PrintButton";
import type { BjjScreenFormData, InjuryResult } from "@/lib/bjjInjuryScreen/types";
import { scoreBjjScreen, type MetricResult } from "@/lib/bjjInjuryScreen/scoring";

const INJURY_REGIONS: [keyof Omit<BjjScreenFormData["injuryScreen"], "comments">, string][] = [
  ["neck", "Neck"],
  ["back", "Back"],
  ["shoulders", "Shoulders"],
  ["upperLimb", "Upper Limb"],
  ["hips", "Hips"],
  ["knees", "Knees"],
  ["ankles", "Ankles"],
];

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

/**
 * A domain can average out Strong (≥7.5) while still containing one test
 * down in the Focus band — e.g. one "Poor" mobility rating buried among
 * four "Good"s. Blindly printing the generic "strong" headline in that
 * case reads as "no restriction" right above a row that says otherwise,
 * so the strong-band copy only applies when nothing in the domain is
 * actually flagged; otherwise the outlier gets named directly.
 */
function domainNote(score: number | null, focusLabels: string[], copy: { strong: string; avg: string; focus: string; unset: string }): string {
  if (score === null) return copy.unset;
  if (score >= 7.5) {
    if (focusLabels.length > 0) {
      return `Strong overall, but ${focusLabels.join(" and ")} ${focusLabels.length > 1 ? "stand" : "stands"} out as a clear outlier worth addressing on its own.`;
    }
    return copy.strong;
  }
  if (score >= 5) return copy.avg;
  return copy.focus;
}

function joinWithAnd(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/**
 * Athlete-facing summary of what the scored results actually show for this
 * domain — not an explanation of how the tests work. Built purely from the
 * Focus-band items found, same list the page's own rows and badges are
 * built from, so it can never say something the data on the page disagrees
 * with.
 */
function findingsText(focusLabels: string[], avgLabels: string[], scoredCount: number, domainLabel: string): string {
  if (scoredCount === 0) return `Nothing here could be compared against target yet.`;
  if (focusLabels.length === 0 && avgLabels.length === 0) {
    return `Everything in ${domainLabel.toLowerCase()} came back Strong — not a limiter right now.`;
  }
  if (focusLabels.length > 0) {
    const also = avgLabels.length > 0 ? ` ${joinWithAnd(avgLabels)} ${avgLabels.length > 1 ? "are" : "is"} a step behind too.` : "";
    if (focusLabels.length === scoredCount) return `${joinWithAnd(focusLabels)} all came back below target — the clearest place to spend development time.`;
    return `${joinWithAnd(focusLabels)} ${focusLabels.length > 1 ? "are" : "is"} the clearest gap here — worth prioritising ${focusLabels.length > 1 ? "these" : "this"} on ${focusLabels.length > 1 ? "their" : "its"} own.${also}`;
  }
  return `${joinWithAnd(avgLabels)} ${avgLabels.length > 1 ? "are" : "is"} solid but not yet Strong — room to close that gap.`;
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

type TestRowData = { label: string; displayValue: string; result: MetricResult | null; unit?: string; rawNote?: string };

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
  return `${kind} — target ${result.benchmark.value}${row.unit ?? ""}`;
}

const RATING_COLOR: Record<"poor" | "demonstrated" | "good", string> = { poor: RED, demonstrated: AMBER, good: GREEN };
const RATING_LABEL: Record<"poor" | "demonstrated" | "good", string> = { poor: "Poor", demonstrated: "Demonstrated", good: "Good" };

/** Same treatment Adjust's Youth report uses for Poor/Demonstrated/Good ratings: the badge carries the rating word itself in its band colour, plus a 3-segment bar — no separate plain-white restatement of the word. */
function RatingRow({ label, rating }: { label: string; rating: "poor" | "demonstrated" | "good" }) {
  const color = RATING_COLOR[rating];
  return (
    <div style={{ padding: "16px 0", borderBottom: `1px solid ${BORDER}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
        <span style={{ fontFamily: COND, fontSize: 15, fontWeight: 700, textTransform: "uppercase", color: "#ffffff" }}>{label}</span>
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
          <div key={seg} style={{ flex: 1, height: 13, borderRadius: 3, background: seg === rating ? RATING_COLOR[seg] : BORDER }} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
        <span style={{ fontSize: 9, color: MUTED }}>Poor</span>
        <span style={{ fontSize: 9, color: MUTED }}>Demonstrated</span>
        <span style={{ fontSize: 9, color: MUTED }}>Good</span>
      </div>
    </div>
  );
}

/** Bilateral L/R measurement with a Limb Symmetry Index badge — same pattern as the Youth/Performance report's lrBarRow (e.g. its own Knee-to-Wall test), since a meaningful side-to-side gap is worth flagging on its own, not just averaged away. */
function BilateralRow({ label, left, right, unit }: { label: string; left: MetricResult | null; right: MetricResult | null; unit: string }) {
  if (!left && !right) return null;
  const lsi = left && right ? Math.round((Math.min(left.value, right.value) / Math.max(left.value, right.value)) * 100) : null;
  const lsiColor = lsi === null ? MUTED : lsi >= 90 ? GREEN : lsi >= 85 ? AMBER : RED;
  const side = (res: MetricResult | null, sideLabel: string) => {
    const color = res ? bandColor(res.score) : "#3a4f63";
    const pct = res?.percentOfElite !== null && res?.percentOfElite !== undefined ? Math.min(100, res.percentOfElite) : 0;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ width: 16, fontFamily: COND, fontSize: 10, fontWeight: 900, color: MUTED }}>{sideLabel}</span>
        <div style={{ flex: 1, height: 13, borderRadius: 3, background: BORDER, overflow: "hidden" }}>
          {res && <div style={{ height: "100%", width: `${pct}%`, borderRadius: 3, background: color }} />}
        </div>
        <span style={{ width: 70, textAlign: "right", fontFamily: COND, fontSize: 15, fontWeight: 700, color: res ? "#ffffff" : MUTED }}>{res ? `${res.value.toFixed(1)}${unit}` : "—"}</span>
      </div>
    );
  };
  return (
    <div style={{ padding: "16px 0", borderBottom: `1px solid ${BORDER}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
        <span style={{ fontFamily: COND, fontSize: 15, fontWeight: 700, textTransform: "uppercase", color: "#ffffff" }}>{label}</span>
        <span
          style={{
            fontFamily: COND,
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: 1,
            textTransform: "uppercase",
            padding: "4px 10px",
            borderRadius: 3,
            background: `${lsiColor}26`,
            color: lsiColor,
            flexShrink: 0,
          }}
        >
          LSI {lsi !== null ? `${lsi}%` : "—"}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {side(left, "L")}
        {side(right, "R")}
      </div>
    </div>
  );
}

/** Same pass/fail regional chip tool.html's Athlete Profile page uses for its Injury Screening row. */
function InjuryChip({ label, result }: { label: string; result: InjuryResult }) {
  const pass = result === "pass";
  const fail = result === "fail";
  const color = pass ? GREEN : fail ? RED : "#3a4f63";
  return (
    <div
      style={{
        background: pass ? `${GREEN}1f` : fail ? `${RED}1f` : PANEL,
        border: `1px solid ${pass ? GREEN : fail ? RED : BORDER}`,
        padding: "16px 10px",
        textAlign: "center",
      }}
    >
      <div style={{ width: 11, height: 11, borderRadius: "50%", background: color, margin: "0 auto 8px" }} />
      <div style={{ fontFamily: COND, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: pass || fail ? color : MUTED }}>{label}</div>
      <div style={{ fontSize: 9, color, marginTop: 3 }}>{pass ? "Pass" : fail ? "Fail" : "—"}</div>
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
      <div style={{ flex: 1, padding: "4px 44px 30px", display: "flex", flexDirection: "column", gap: 21 }}>{children}</div>
    </div>
  );
}

function DomainHero({ label, score, note }: { label: string; score: number | null; note: string }) {
  return (
    <div style={{ background: PANEL, border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 28, padding: "22px 30px" }}>
      <div style={{ textAlign: "center", minWidth: 100 }}>
        <div style={{ fontFamily: COND, fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: MUTED, marginBottom: 5 }}>{label}</div>
        <div style={{ fontFamily: COND, fontSize: 54, fontWeight: 900, color: bandColor(score), lineHeight: 1 }}>{score !== null ? score.toFixed(1) : "—"}</div>
        <div style={{ fontSize: 10, color: MUTED }}>out of 10</div>
      </div>
      <div style={{ width: 1, alignSelf: "stretch", background: BORDER }} />
      <div style={{ flex: 1, fontSize: 14, color: TEXT, lineHeight: 1.7 }}>{note}</div>
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
    <div style={{ padding: "14px 0", borderBottom: `1px solid ${BORDER}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: COND, fontSize: 15, fontWeight: 700, textTransform: "uppercase", color: "#ffffff" }}>{row.label}</div>
          {refLine(row) && <div style={{ fontSize: 10.5, color: MUTED, marginTop: 3 }}>{refLine(row)}</div>}
          {row.rawNote && <div style={{ fontSize: 10.5, color: MUTED, marginTop: 1 }}>{row.rawNote}</div>}
        </div>
        <div style={{ fontFamily: COND, fontSize: 28, fontWeight: 700, color: "#ffffff", textAlign: "right", minWidth: 84 }}>{row.displayValue}</div>
        <span
          style={{
            fontFamily: COND,
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: 1,
            textTransform: "uppercase",
            padding: "5px 11px",
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
        <div style={{ height: 6, borderRadius: 3, background: BORDER, overflow: "hidden", marginTop: 9 }}>
          <div style={{ height: "100%", borderRadius: 3, width: `${pct}%`, background: color }} />
        </div>
      )}
      {thresholds && (
        <div style={{ display: "flex", gap: 8, marginTop: 9 }}>
          <span style={{ flex: 1, textAlign: "center", padding: "6px 7px", borderRadius: 3, background: `${RED}1a`, border: `1px solid ${RED}40`, fontSize: 9.5, color: RED, fontWeight: 600 }}>
            Focus {thresholds.focus}
          </span>
          <span style={{ flex: 1, textAlign: "center", padding: "6px 7px", borderRadius: 3, background: `${AMBER}1a`, border: `1px solid ${AMBER}40`, fontSize: 9.5, color: AMBER, fontWeight: 600 }}>
            Avg {thresholds.avg}
          </span>
          <span style={{ flex: 1, textAlign: "center", padding: "6px 7px", borderRadius: 3, background: `${GREEN}1a`, border: `1px solid ${GREEN}40`, fontSize: 9.5, color: GREEN, fontWeight: 600 }}>
            Strong {thresholds.strong}
          </span>
        </div>
      )}
    </div>
  );
}

function InterpretationBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: PANEL, borderLeft: `4px solid ${LIME}`, padding: "20px 26px", marginTop: "auto" }}>
      <div style={{ fontFamily: COND, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: LIME, marginBottom: 10 }}>{title}</div>
      <div style={{ fontSize: 13.5, color: TEXT, lineHeight: 1.8 }}>{children}</div>
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
    const lx = (cx + (maxR + 22) * cos).toFixed(1);
    const ly = (cy + (maxR + 22) * Math.sin(a) + 4).toFixed(1);
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

  const hasInjuryScreen = INJURY_REGIONS.some(([key]) => data.injuryScreen[key] !== "") || data.injuryScreen.comments !== "";
  const hasMobility =
    [data.mobility.shoulderErIr, data.mobility.hipErIr, data.mobility.lumbarFlexExt, data.mobility.txRotation, data.mobility.cervicalRotation].some(
      (r) => r !== ""
    ) || data.mobility.ankleDfKneeToWallCmLeft !== "" || data.mobility.ankleDfKneeToWallCmRight !== "";
  const hasStrength = [
    data.strength.imtp,
    data.strength.standingShoulderYLeft,
    data.strength.standingShoulderYRight,
    data.strength.maxPullUps,
    data.strength.maxPushUps,
    data.strength.gripStrengthN,
  ].some((v) => v !== "");
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

  const strengthRows: TestRowData[] = [
    { label: "IMTP (vs. bodyweight)", displayValue: score.imtp ? `${score.imtp.value.toFixed(2)}×` : "—", result: score.imtp, unit: "×" },
    { label: "Max Pull Ups", displayValue: data.strength.maxPullUps ? `${data.strength.maxPullUps} reps` : "—", result: score.maxPullUps, unit: " reps" },
    { label: "Max Push Ups", displayValue: data.strength.maxPushUps ? `${data.strength.maxPushUps} reps` : "—", result: score.maxPushUps, unit: " reps" },
    { label: "Grip Strength", displayValue: data.strength.gripStrengthN ? `${data.strength.gripStrengthN}N` : "—", result: score.gripStrengthN, unit: "N" },
  ].filter((r) => r.displayValue !== "—");

  const powerRows: TestRowData[] = [
    { label: "CMJ — Jump Height", displayValue: data.power.cmjHeight ? `${data.power.cmjHeight}cm` : "—", result: score.cmjHeight, unit: "cm" },
    { label: "RSI Mod (Drop Jump)", displayValue: data.power.dropJumpRsi ? Number(data.power.dropJumpRsi).toFixed(2) : "—", result: score.dropJumpRsi, unit: "" },
  ].filter((r) => r.displayValue !== "—");

  const conditioningRows: TestRowData[] = [
    {
      label: "3-Min Watt Bike — Avg Power",
      displayValue: score.wattBike3MinAvgWatts ? `${score.wattBike3MinAvgWatts.value.toFixed(2)} W/kg` : "—",
      result: score.wattBike3MinAvgWatts,
      unit: " W/kg",
      rawNote: data.conditioning.wattBike3MinAvgWatts ? `${data.conditioning.wattBike3MinAvgWatts}W measured, 3-min all-out average` : undefined,
    },
  ].filter((r) => r.displayValue !== "—");

  const focusLabelsOf = (rows: TestRowData[]) => rows.filter((r) => r.result?.score !== null && r.result?.score !== undefined && r.result.score < 5).map((r) => r.label);
  const avgLabelsOf = (rows: TestRowData[]) => rows.filter((r) => r.result?.score !== null && r.result?.score !== undefined && r.result.score >= 5 && r.result.score < 7.5).map((r) => r.label);
  const scoredCountOf = (rows: TestRowData[]) => rows.filter((r) => r.result?.score !== null && r.result?.score !== undefined).length;
  const isFocus = (r: MetricResult | null) => r?.score !== null && r?.score !== undefined && r.score < 5;
  const isAvg = (r: MetricResult | null) => r?.score !== null && r?.score !== undefined && r.score >= 5 && r.score < 7.5;
  const isScored = (r: MetricResult | null) => r?.score !== null && r?.score !== undefined;

  const mobilityFocusLabels = [
    ...mobilityRatingRows.filter((r) => r.rating === "poor").map((r) => r.label),
    ...(isFocus(score.ankleDfLeft) ? ["Ankle DF (L)"] : []),
    ...(isFocus(score.ankleDfRight) ? ["Ankle DF (R)"] : []),
  ];
  const mobilityAvgLabels = [
    ...mobilityRatingRows.filter((r) => r.rating === "demonstrated").map((r) => r.label),
    ...(isAvg(score.ankleDfLeft) ? ["Ankle DF (L)"] : []),
    ...(isAvg(score.ankleDfRight) ? ["Ankle DF (R)"] : []),
  ];
  const mobilityScoredCount = mobilityRatingRows.length + (isScored(score.ankleDfLeft) ? 1 : 0) + (isScored(score.ankleDfRight) ? 1 : 0);

  const strengthFocusLabels = [
    ...focusLabelsOf(strengthRows),
    ...(isFocus(score.standingShoulderYLeft) ? ["ASH-Y (L)"] : []),
    ...(isFocus(score.standingShoulderYRight) ? ["ASH-Y (R)"] : []),
  ];
  const strengthAvgLabels = [
    ...avgLabelsOf(strengthRows),
    ...(isAvg(score.standingShoulderYLeft) ? ["ASH-Y (L)"] : []),
    ...(isAvg(score.standingShoulderYRight) ? ["ASH-Y (R)"] : []),
  ];
  const strengthScoredCount = scoredCountOf(strengthRows) + (isScored(score.standingShoulderYLeft) ? 1 : 0) + (isScored(score.standingShoulderYRight) ? 1 : 0);

  const powerFocusLabels = focusLabelsOf(powerRows);
  const powerAvgLabels = avgLabelsOf(powerRows);
  const powerScoredCount = scoredCountOf(powerRows);
  const conditioningFocusLabels = focusLabelsOf(conditioningRows);
  const conditioningAvgLabels = avgLabelsOf(conditioningRows);
  const conditioningScoredCount = scoredCountOf(conditioningRows);

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
      { label: "Standing Shoulder Y (L)", result: score.standingShoulderYLeft },
      { label: "Standing Shoulder Y (R)", result: score.standingShoulderYRight },
      { label: "Max Pull Ups", result: score.maxPullUps },
      { label: "Max Push Ups", result: score.maxPushUps },
      { label: "Ankle DF (L)", result: score.ankleDfLeft },
      { label: "Ankle DF (R)", result: score.ankleDfRight },
      { label: "Grip Strength", result: score.gripStrengthN },
      { label: "3-Min Watt Bike", result: score.wattBike3MinAvgWatts },
    ] as { label: string; result: MetricResult | null }[]
  )
    .filter((r): r is { label: string; result: MetricResult } => r.result !== null && r.result.score !== null)
    .sort((a, b) => (a.result.score as number) - (b.result.score as number));
  const focusAreas = allScored.filter((r) => (r.result.score as number) < 7.5).slice(0, 3);

  let pageNum = 1; // page 1 is the cover, rendered separately below
  const mobilityPage = hasMobility ? ++pageNum : null;
  const strengthPage = hasStrength ? ++pageNum : null;
  // Power and Conditioning share one page — each keeps its own domain score
  // and radar axis, same as tool.html's Energy Systems page combines Speed
  // and Aerobic Capacity onto one page while scoring them separately.
  const powerConditioningPage = hasPower || hasConditioning ? ++pageNum : null;
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
            note={domainNote(score.categoryScores.mobility, mobilityFocusLabels, {
              strong: "Full, functional range across what was tested — no restriction limiting output here.",
              avg: "Workable range with some restriction — worth revisiting alongside strength work.",
              focus: "Restricted range is the clearest limiter here — prioritise this before loading strength/power on top of it.",
              unset: "Set Sex above to compare the measured tests against reference data.",
            })}
          />
          <div>
            {mobilityRatingRows.map((r) => <RatingRow key={r.label} label={r.label} rating={r.rating} />)}
            <BilateralRow label="Ankle DF — Knee to Wall" left={score.ankleDfLeft} right={score.ankleDfRight} unit="cm" />
          </div>
          <InterpretationBox title="Mobility Interpretation">
            {findingsText(mobilityFocusLabels, mobilityAvgLabels, mobilityScoredCount, "Mobility")}
            {score.ankleDfLsi !== null && score.ankleDfLsi < 85 ? ` Left/right ankle DF symmetry is also low (${score.ankleDfLsi}%), worth addressing on its own.` : ""}
          </InterpretationBox>
        </PageShell>
      )}

      {/* ---- Strength ---- */}
      {strengthPage && (
        <PageShell title="Strength" subtitle="Vs. elite &amp; general-population reference data" pageNum={strengthPage}>
          <DomainHero
            label="Strength"
            score={score.categoryScores.strength}
            note={domainNote(score.categoryScores.strength, strengthFocusLabels, {
              strong: "Strong across the board — force production is not the limiting factor right now.",
              avg: "Solid base — targeted loading will close the gap to elite reference data.",
              focus: "Clear development priority — build a base here before adding volume elsewhere.",
              unset: "Set Sex above to compare these tests against reference data.",
            })}
          />
          <div>
            {strengthRows.map((r) => <TestRow key={r.label} row={r} />)}
            <BilateralRow label="Standing Shoulder Y (ASH-Y)" left={score.standingShoulderYLeft} right={score.standingShoulderYRight} unit="N" />
          </div>
          <InterpretationBox title="Strength Interpretation">
            {findingsText(strengthFocusLabels, strengthAvgLabels, strengthScoredCount, "Strength")}
            {score.standingShoulderYLsi !== null && score.standingShoulderYLsi < 85 ? ` Left/right ASH-Y symmetry is also low (${score.standingShoulderYLsi}%), worth addressing on its own.` : ""}
          </InterpretationBox>
        </PageShell>
      )}

      {/* ---- Power & Conditioning ---- */}
      {powerConditioningPage && (
        <PageShell title="Power &amp; Conditioning" subtitle="Vs. elite &amp; general-population reference data" pageNum={powerConditioningPage}>
          {hasPower && (
            <>
              <DomainHero
                label="Power"
                score={score.categoryScores.power}
                note={domainNote(score.categoryScores.power, powerFocusLabels, {
                  strong: "Elite-level rate of force development — translates directly to explosive scrambles and takedowns.",
                  avg: "Good power output with room to develop — plyometric and ballistic work will move this.",
                  focus: "Power is the clearest development priority — low jump height/RSI usually means force is there but isn't being expressed quickly.",
                  unset: "Set Sex above to compare these tests against reference data.",
                })}
              />
              <div>{powerRows.map((r) => <TestRow key={r.label} row={r} />)}</div>
            </>
          )}
          {hasConditioning && (
            <>
              <DomainHero
                label="Conditioning"
                score={score.categoryScores.conditioning}
                note={domainNote(score.categoryScores.conditioning, conditioningFocusLabels, {
                  strong: "Strong aerobic/anaerobic base — unlikely to be the first thing that fades in a long match.",
                  avg: "Workable engine — interval work will lift this further.",
                  focus: "Conditioning is a development priority — technique tends to break down first when this is the limiter.",
                  unset: "Set Sex above to compare this test against reference data.",
                })}
              />
              <div>{conditioningRows.map((r) => <TestRow key={r.label} row={r} />)}</div>
            </>
          )}
          <InterpretationBox title="Power &amp; Conditioning Interpretation">
            {hasPower && findingsText(powerFocusLabels, powerAvgLabels, powerScoredCount, "Power")} {hasConditioning && findingsText(conditioningFocusLabels, conditioningAvgLabels, conditioningScoredCount, "Conditioning")}
          </InterpretationBox>
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

        {hasInjuryScreen && (
          <div>
            <div style={{ fontFamily: COND, fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: MUTED, marginBottom: 10 }}>Injury Screen</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
              {INJURY_REGIONS.map(([key, label]) => (
                <InjuryChip key={key} label={label} result={data.injuryScreen[key]} />
              ))}
            </div>
            {data.injuryScreen.comments && (
              <div style={{ background: "#1c2733", padding: "8px 12px", marginTop: 8, fontSize: 10.5, color: TEXT, lineHeight: 1.6 }}>{data.injuryScreen.comments}</div>
            )}
          </div>
        )}

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
