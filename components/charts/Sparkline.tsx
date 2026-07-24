"use client";

import { LineChart, Line, ResponsiveContainer } from "recharts";
import { CATEGORICAL } from "@/components/charts/palette";

/** A tiny inline trend line — no axes, no grid, just shape — for showing direction of travel next to a single number. */
export function Sparkline({ values, colorIndex = 0 }: { values: (number | null)[]; colorIndex?: number }) {
  if (values.filter((v) => v !== null).length < 2) return null;
  const data = values.map((v, i) => ({ i, v }));
  const color = CATEGORICAL[colorIndex % CATEGORICAL.length];

  return (
    <div style={{ width: 56, height: 22 }} className="inline-block align-middle">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
