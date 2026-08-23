/**
 * Simple least-squares linear regression over evenly-spaced points (x = 0, 1,
 * 2, ...), used to draw a trendline overlay on a chart. Null values are
 * skipped entirely (not treated as 0) so a week not yet reported doesn't
 * drag the line down. Returns null when there are fewer than 2 real points
 * to fit a line through.
 */
export function linearRegression(values: (number | null)[]): { slope: number; intercept: number } | null {
  const points = values.map((v, x) => ({ x, v })).filter((p): p is { x: number; v: number } => p.v !== null);
  if (points.length < 2) return null;

  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.v, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.v, 0);
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return null; // all points at the same x — can't happen here, but guards divide-by-zero

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

/** The regression line's value at every index of the original series, for overlaying alongside the real data. */
export function trendlineSeries(values: (number | null)[]): (number | null)[] | null {
  const fit = linearRegression(values);
  if (!fit) return null;
  return values.map((_, x) => fit.slope * x + fit.intercept);
}
