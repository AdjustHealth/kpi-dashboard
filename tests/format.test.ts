import { describe, expect, it } from "vitest";
import { formatAxisTick } from "@/lib/format";

describe("formatAxisTick", () => {
  it("abbreviates currency into k/m so it fits a narrow chart axis", () => {
    expect(formatAxisTick(40000, "currency")).toBe("$40k");
    expect(formatAxisTick(8500, "currency")).toBe("$8.5k");
    expect(formatAxisTick(1500000, "currency")).toBe("$1.5m");
    expect(formatAxisTick(500, "currency")).toBe("$500");
  });

  it("abbreviates plain numbers the same way, without a $ prefix", () => {
    expect(formatAxisTick(40000, "number")).toBe("40k");
    expect(formatAxisTick(500, "number")).toBe("500");
  });

  it("keeps negative values signed", () => {
    expect(formatAxisTick(-40000, "currency")).toBe("-$40k");
  });

  it("leaves percent/decimal alone — already short", () => {
    expect(formatAxisTick(0.3, "percent")).toBe("30.0%");
    expect(formatAxisTick(7.5, "decimal", 1)).toBe("7.5");
  });
});
