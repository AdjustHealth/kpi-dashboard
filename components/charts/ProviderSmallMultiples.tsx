import { LineTrendChart, ChartFormat } from "@/components/charts/LineTrendChart";

const ROLE_COLOR_INDEX: Record<string, number> = {
  senior_physio: 0, // blue
  physio: 6, // violet
  massage: 2, // magenta
  ep: 5, // orange
};

export interface SmallMultipleSeries {
  providerName: string;
  role: string;
  points: { week_ending: string; value: number | null }[];
}

/**
 * One mini trend chart per provider — small multiples instead of cramming
 * every clinician onto one line chart, where more than a handful of series
 * stops being legible (and blows past the categorical palette's safe
 * count). Colored by role tier for a quick visual grouping.
 */
export function ProviderSmallMultiples({ series, format = "decimal", decimals = 1 }: { series: SmallMultipleSeries[]; format?: ChartFormat; decimals?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {series.map((s) => (
        <LineTrendChart
          key={s.providerName}
          title={s.providerName}
          data={s.points}
          format={format}
          decimals={decimals}
          colorIndex={ROLE_COLOR_INDEX[s.role] ?? 0}
          height={100}
        />
      ))}
    </div>
  );
}
