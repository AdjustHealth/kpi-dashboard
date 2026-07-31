import { TrendPoint } from "@/components/charts/LineTrendChart";
import { targetColor } from "@/lib/targetColor";

/** Most recent non-null point — trend charts can have trailing/leading nulls (a week not yet reported). */
export function latestTrendValue(data: TrendPoint[]): number | null {
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i].value !== null) return data[i].value;
  }
  return null;
}

/** Green/red for a single-series trend chart's line, based on its latest point vs target — same convention as targetColor() for table cells/stat tiles. */
export function trendTargetColor(
  data: TrendPoint[],
  target: number | null | undefined,
  betterWhen: "higher" | "lower" | undefined
): string | undefined {
  if (typeof target !== "number" || !betterWhen) return undefined;
  return targetColor(latestTrendValue(data), target, betterWhen);
}
