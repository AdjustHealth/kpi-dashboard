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

/** Short "vs ___" reference line, matching tool.html's own srefRow convention. */
function refLine(result: MetricResult | null): string {
  if (!result) return "Not recorded";
  if (!result.benchmark) return "No elite benchmark for this test";
  const kind = result.benchmark.confidence === "combat" ? "combat-sport" : "general elite";
  return `vs ${result.benchmark.value} (${kind} data)`;
}

function formatValue(value: number | undefined, decimals = 1): string {
  if (value === undefined || value === null) return "—";
  return value.toFixed(decimals);
}

type TestRowData = { label: string; displayValue: string; result: MetricResult | null };

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
      <div style={{ flex: 1, padding: "4px 44px 36px", display: "flex", flexDirection: "column", gap: 22 }}>{children}</div>
    </div>
  );
}

function DomainHero({ label, score }: { label: string; score: number | null }) {
  return (
    <div style={{ background: PANEL, border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 24, padding: "20px 28px" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: COND, fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: MUTED, marginBottom: 4 }}>{label}</div>
        <div style={{ fontFamily: COND, fontSize: 52, fontWeight: 900, color: bandColor(score), lineHeight: 1 }}>{score !== null ? score.toFixed(1) : "—"}</div>
        <div style={{ fontSize: 10, color: MUTED }}>out of 10</div>
      </div>
      <div style={{ flex: 1, fontSize: 12, color: TEXT, lineHeight: 1.6 }}>
        {score !== null
          ? score >= 7.5
            ? "Strong domain — at or above elite reference data across what was tested here."
            : score >= 5
              ? "Solid foundation — some room to close the gap to elite reference data."
              : "Clear development priority — well below elite reference data on the tests recorded."
          : "Nothing scored in this domain yet — fill in the tests on the assessment form."}
      </div>
    </div>
  );
}

function TestRow({ row }: { row: TestRowData }) {
  const color = row.result?.score !== null && row.result?.score !== undefined ? bandColor(row.result.score) : "#3a4f63";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: `1px solid ${BORDER}` }}>
      <div style={{ width: 9, height: 9, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: COND, fontSize: 13, fontWeight: 700, textTransform: "uppercase", color: "#ffffff" }}>{row.label}</div>
        <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{refLine(row.result)}</div>
      </div>
      <div style={{ fontFamily: COND, fontSize: 22, fontWeight: 700, color: "#ffffff", textAlign: "right", minWidth: 70 }}>{row.displayValue}</div>
      {row.result?.percentOfElite !== null && row.result?.percentOfElite !== undefined && (
        <div style={{ fontFamily: COND, fontSize: 13, fontWeight: 700, color, textAlign: "right", minWidth: 56 }}>{row.result.percentOfElite}%</div>
      )}
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

/** Inline SVG radar — translated directly from public/tool.html's own radar generator, so this reads as the exact same report system, not a different one. */
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
    const lx = (cx + (maxR + 16) * Math.cos(a)).toFixed(1);
    const ly = (cy + (maxR + 16) * Math.sin(a) + 4).toFixed(1);
    return (
      <text key={i} x={lx} y={ly} textAnchor="middle" fill={TEXT} fontSize={10} fontFamily={COND} fontWeight={600}>
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
    <svg width={252} height={252} viewBox="0 0 236 240">
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

  const mobilityRows: TestRowData[] = [
    { label: "Shoulder ER/IR", displayValue: data.mobility.shoulderErIr ? data.mobility.shoulderErIr[0].toUpperCase() + data.mobility.shoulderErIr.slice(1) : "—", result: null },
    { label: "Hip ER/IR", displayValue: data.mobility.hipErIr ? data.mobility.hipErIr[0].toUpperCase() + data.mobility.hipErIr.slice(1) : "—", result: null },
    { label: "Lumbar Flexion/Extension", displayValue: data.mobility.lumbarFlexExt ? data.mobility.lumbarFlexExt[0].toUpperCase() + data.mobility.lumbarFlexExt.slice(1) : "—", result: null },
    { label: "Thoracic (Tx) Rotation", displayValue: data.mobility.txRotation ? data.mobility.txRotation[0].toUpperCase() + data.mobility.txRotation.slice(1) : "—", result: null },
    { label: "Cervical Rotation", displayValue: data.mobility.cervicalRotation ? data.mobility.cervicalRotation[0].toUpperCase() + data.mobility.cervicalRotation.slice(1) : "—", result: null },
    { label: "Ankle DF — Knee to Wall", displayValue: data.mobility.ankleDfKneeToWallCm ? `${data.mobility.ankleDfKneeToWallCm}cm` : "—", result: score.ankleDfKneeToWallCm },
  ];
  const strengthRows: TestRowData[] = [
    { label: "IMTP (vs. bodyweight)", displayValue: score.imtp ? `${formatValue(score.imtp.value, 2)}×` : "—", result: score.imtp },
    { label: "Standing Shoulder Y (ASH-Y)", displayValue: data.strength.standingShoulderY ? `${data.strength.standingShoulderY}N` : "—", result: score.standingShoulderY },
    { label: "Max Pull Ups", displayValue: data.strength.maxPullUps ? `${data.strength.maxPullUps} reps` : "—", result: score.maxPullUps },
    { label: "Max Push Ups", displayValue: data.strength.maxPushUps ? `${data.strength.maxPushUps} reps` : "—", result: score.maxPushUps },
    { label: "Grip Strength", displayValue: data.strength.gripStrengthKg ? `${data.strength.gripStrengthKg}kg` : "—", result: score.gripStrengthKg },
  ];
  const powerRows: TestRowData[] = [
    { label: "CMJ — Jump Height", displayValue: data.power.cmjHeight ? `${data.power.cmjHeight}cm` : "—", result: score.cmjHeight },
    { label: "RSI Mod (Drop Jump)", displayValue: data.power.dropJumpRsi ? formatValue(Number(data.power.dropJumpRsi), 2) : "—", result: score.dropJumpRsi },
  ];
  const conditioningRows: TestRowData[] = [
    { label: "3-Min Watt Bike — Avg Power", displayValue: data.conditioning.wattBike3MinAvgWatts ? `${data.conditioning.wattBike3MinAvgWatts}w` : "—", result: score.wattBike3MinAvgWatts !== null ? ({ value: score.wattBike3MinAvgWatts, percentOfElite: null, score: null, benchmark: null } as MetricResult) : null },
  ];

  // Key Development Areas — the lowest-scoring recorded tests, same purpose
  // as tool.html's own development-priority list on the summary page.
  const allScored: { label: string; result: MetricResult }[] = [
    { label: "IMTP", result: score.imtp },
    { label: "CMJ Jump Height", result: score.cmjHeight },
    { label: "RSI Mod (Drop Jump)", result: score.dropJumpRsi },
    { label: "Standing Shoulder Y (ASH-Y)", result: score.standingShoulderY },
    { label: "Max Pull Ups", result: score.maxPullUps },
    { label: "Max Push Ups", result: score.maxPushUps },
    { label: "Ankle DF — Knee to Wall", result: score.ankleDfKneeToWallCm },
    { label: "Grip Strength", result: score.gripStrengthKg },
  ].filter((r): r is { label: string; result: MetricResult } => r.result !== null && r.result.score !== null)
    .sort((a, b) => (a.result.score as number) - (b.result.score as number))
    .slice(0, 3)
    .filter((r) => (r.result.score as number) < 7.5);

  const domains = [
    { label: "Mobility", score: score.categoryScores.mobility },
    { label: "Strength", score: score.categoryScores.strength },
    { label: "Power", score: score.categoryScores.power },
    { label: "Conditioning", score: score.categoryScores.conditioning },
  ];

  let pageNum = 1; // page 1 is the cover, rendered separately below
  const mobilityPage = ++pageNum;
  const strengthPage = ++pageNum;
  const powerPage = ++pageNum;
  const conditioningPage = ++pageNum;
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
          <div style={{ fontFamily: COND, fontSize: 26, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase", color: "#ffffff" }}>{name}</div>
          <div style={{ marginTop: 10, display: "flex", gap: 18, fontSize: 13, color: TEXT }}>
            {data.assessmentDate && <span>{formatDate(data.assessmentDate)}</span>}
            {data.clinician && <span>Assessed by {data.clinician}</span>}
          </div>
        </div>
        <span style={{ fontFamily: COND, fontSize: 9, fontWeight: 700, letterSpacing: 3, color: LIME, textTransform: "uppercase" }}>Get Better. Get Moving. Get Strong.</span>
      </div>

      {/* ---- Mobility ---- */}
      <PageShell title="Mobility" subtitle="Poor / Demonstrated / Good, plus measured ankle dorsiflexion" pageNum={mobilityPage}>
        <DomainHero label="Mobility" score={score.categoryScores.mobility} />
        <div>{mobilityRows.map((r) => <TestRow key={r.label} row={r} />)}</div>
      </PageShell>

      {/* ---- Strength ---- */}
      <PageShell title="Strength" subtitle="Vs. elite &amp; combat-sport reference data" pageNum={strengthPage}>
        <DomainHero label="Strength" score={score.categoryScores.strength} />
        <div>{strengthRows.map((r) => <TestRow key={r.label} row={r} />)}</div>
      </PageShell>

      {/* ---- Power ---- */}
      <PageShell title="Power" subtitle="Vs. elite &amp; combat-sport reference data" pageNum={powerPage}>
        <DomainHero label="Power" score={score.categoryScores.power} />
        <div>{powerRows.map((r) => <TestRow key={r.label} row={r} />)}</div>
      </PageShell>

      {/* ---- Conditioning ---- */}
      <PageShell title="Conditioning" subtitle="Recorded for tracking — no published elite benchmark exists" pageNum={conditioningPage}>
        <DomainHero label="Conditioning" score={score.categoryScores.conditioning} />
        <div>{conditioningRows.map((r) => <TestRow key={r.label} row={r} />)}</div>
        <p style={{ fontSize: 11, color: MUTED, lineHeight: 1.6, maxWidth: "60ch" }}>
          No published combat-sport or BJJ-specific benchmark exists for a 3-minute all-out Watt Bike test, so it isn&rsquo;t scored against a made-up number — track this athlete&rsquo;s own number over time instead.
        </p>
      </PageShell>

      {/* ---- Summary ---- */}
      <PageShell title="Summary" subtitle="Performance profile — vs. combat-sport &amp; general elite reference data" pageNum={summaryPage}>
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
              : "Not enough data yet to score"}
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
              Combat-sport data where it exists; best available general elite-athlete data otherwise. <span style={{ color: GREEN }}>Strong</span> ≥7.5 · <span style={{ color: AMBER }}>Avg</span> 5–7.4 · <span style={{ color: RED }}>Focus</span> &lt;5
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontFamily: COND, fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: MUTED, marginBottom: 8, alignSelf: "flex-start" }}>Radar Profile</div>
            <RadarProfile domains={domains} />
          </div>
        </div>

        <div>
          <div style={{ fontFamily: COND, fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: MUTED, marginBottom: 12 }}>Key Development Areas</div>
          {allScored.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {allScored.map((d, i) => (
                <div key={d.label} style={{ background: PANEL, borderLeft: `4px solid ${LIME}`, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: LIME, color: "#0d1117", fontFamily: COND, fontSize: 16, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div>
                    <div style={{ fontFamily: COND, fontSize: 14, fontWeight: 700, textTransform: "uppercase", color: "#ffffff" }}>{d.label}</div>
                    <div style={{ fontSize: 11, color: TEXT, marginTop: 2 }}>{d.result.percentOfElite}% of elite — {refLine(d.result)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: PANEL, border: `1px solid ${BORDER}`, padding: 18, color: MUTED, fontSize: 11 }}>
              Nothing below elite reference data yet — or not enough tests recorded to tell.
            </div>
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
