import { CATEGORICAL } from "@/components/charts/palette";

/**
 * JBV partner businesses as a coloured tile grid instead of a plain
 * wrapped list of names — each tile gets an initial-letter badge and an
 * accent colour cycling through the categorical palette, purely as a
 * visual grouping device (colour has no other meaning here).
 */
export function JbvPartnerGrid({ partners }: { partners: string[] }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
      {partners.map((name, i) => {
        const color = CATEGORICAL[i % CATEGORICAL.length];
        return (
          <div
            key={name}
            className="flex items-center gap-2.5 rounded-lg border border-border bg-surface-raised px-3 py-2.5 transition-colors hover:border-accent"
          >
            <span
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: color }}
            >
              {name.charAt(0).toUpperCase()}
            </span>
            <span className="text-xs font-medium leading-tight text-foreground">{name}</span>
          </div>
        );
      })}
    </div>
  );
}
