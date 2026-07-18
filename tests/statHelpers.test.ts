import { describe, expect, it } from "vitest";
import { providerSeriesToWideRows } from "@/components/dashboard/statHelpers";
import { CATEGORICAL } from "@/components/charts/palette";
import { ProviderCvaSeries } from "@/lib/clinicData";

describe("providerSeriesToWideRows", () => {
  it("pivots one series per provider into wide rows keyed by provider name", () => {
    const series: ProviderCvaSeries[] = [
      { providerName: "Alice", role: "physio", tier: "new_grad", points: [{ week_ending: "2026-07-04", value: 4 }] },
      { providerName: "Bob", role: "massage", tier: "massage", points: [{ week_ending: "2026-07-04", value: 6 }] },
    ];
    const { rows, keys } = providerSeriesToWideRows(series);
    expect(keys).toEqual(["Alice", "Bob"]);
    expect(rows).toHaveLength(1);
    expect(rows[0].Alice).toBe(4);
    expect(rows[0].Bob).toBe(6);
  });

  it("gives same-tier providers the same colour, and different tiers different colours", () => {
    const series: ProviderCvaSeries[] = [
      { providerName: "Alice", role: "physio", tier: "2_5yr", points: [{ week_ending: "2026-07-04", value: 4 }] },
      { providerName: "Bob", role: "physio", tier: "2_5yr", points: [{ week_ending: "2026-07-04", value: 5 }] },
      { providerName: "Carol", role: "senior_physio", tier: "senior", points: [{ week_ending: "2026-07-04", value: 7 }] },
    ];
    const { colors } = providerSeriesToWideRows(series);
    expect(colors[0]).toBe(colors[1]);
    expect(colors[2]).not.toBe(colors[0]);
  });

  it("falls back to a colour for a provider with no tier set yet, without throwing", () => {
    const series: ProviderCvaSeries[] = [
      { providerName: "Dana", role: "physio", tier: null, points: [{ week_ending: "2026-07-04", value: 4 }] },
    ];
    const { colors } = providerSeriesToWideRows(series);
    expect(CATEGORICAL).toContain(colors[0]);
  });

  it("returns empty rows/keys/colors for an empty series list", () => {
    expect(providerSeriesToWideRows([])).toEqual({ rows: [], keys: [], colors: [] });
  });
});
