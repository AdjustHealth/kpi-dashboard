"use client";

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { CATEGORICAL, CHART_CHROME } from "@/components/charts/palette";
import { KpaRating } from "@/lib/providerSchema";

const RATING_SCORE: Record<KpaRating, number> = { not_met: 1, demonstrated: 2, above_and_beyond: 3 };
const SCORE_LABEL: Record<number, string> = { 1: "Not Met", 2: "Demonstrated", 3: "Above & Beyond" };

export interface RadarRow {
  behaviour: string;
  ratingsByWindow: Record<string, KpaRating | null>;
}

/** The "shape" of a KPA group at a glance — every behaviour as an axis, one overlay per rolling window, instead of scanning a table row by row. */
export function KpaRadarChart({ rows, windows }: { rows: RadarRow[]; windows: { key: string; label: string }[] }) {
  const data = rows.map((row) => {
    const point: Record<string, unknown> = { behaviour: row.behaviour };
    for (const w of windows) {
      const rating = row.ratingsByWindow[w.key];
      point[w.label] = rating ? RATING_SCORE[rating] : null;
    }
    return point;
  });

  return (
    <div style={{ height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke={CHART_CHROME.gridline} />
          <PolarAngleAxis dataKey="behaviour" tick={{ fill: CHART_CHROME.mutedInk, fontSize: 10 }} />
          <PolarRadiusAxis domain={[1, 3]} tickCount={3} tickFormatter={(v) => SCORE_LABEL[v] ?? ""} tick={{ fill: CHART_CHROME.mutedInk, fontSize: 9 }} />
          {windows.map((w, i) => (
            <Radar
              key={w.key}
              name={w.label}
              dataKey={w.label}
              stroke={CATEGORICAL[i % CATEGORICAL.length]}
              fill={CATEGORICAL[i % CATEGORICAL.length]}
              fillOpacity={0.15}
              connectNulls
            />
          ))}
          <Tooltip
            contentStyle={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
            formatter={(v) => (typeof v === "number" ? SCORE_LABEL[v] ?? "—" : "—")}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: CHART_CHROME.secondaryInk }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
