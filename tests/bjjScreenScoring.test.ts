import { describe, expect, it } from "vitest";
import { scoreBjjScreen } from "@/lib/bjjInjuryScreen/scoring";
import { emptyBjjScreen, type BjjScreenFormData } from "@/lib/bjjInjuryScreen/types";

function screen(overrides: Partial<BjjScreenFormData> = {}): BjjScreenFormData {
  return { ...emptyBjjScreen(), ...overrides };
}

describe("scoreBjjScreen", () => {
  it("scores IMTP as exactly 100% of elite when peak force ÷ bodyweight matches the benchmark ratio (3.3)", () => {
    const data = screen({ sex: "male", bodyweightKg: "80", strength: { ...emptyBjjScreen().strength, imtp: "264" } });
    const result = scoreBjjScreen(data);
    expect(result.imtp?.percentOfElite).toBe(100);
    expect(result.imtp?.score).toBe(10);
  });

  it("scores CMJ proportionally below elite", () => {
    // Elite male CMJ benchmark is 39.6cm — 19.8cm is exactly half.
    const data = screen({ sex: "male", power: { cmjHeight: "19.8", dropJumpRsi: "" } });
    const result = scoreBjjScreen(data);
    expect(result.cmjHeight?.percentOfElite).toBe(50);
    expect(result.cmjHeight?.score).toBe(5);
  });

  it("caps a score at 10 even when the athlete beats the elite benchmark", () => {
    const data = screen({ sex: "male", power: { cmjHeight: "60", dropJumpRsi: "" } });
    const result = scoreBjjScreen(data);
    expect(result.cmjHeight?.score).toBe(10);
  });

  it("returns a value with no score when there's no benchmark for the selected sex (e.g. female IMTP/pull-ups)", () => {
    const data = screen({
      sex: "female",
      bodyweightKg: "60",
      strength: { ...emptyBjjScreen().strength, imtp: "180", maxPullUps: "8" },
    });
    const result = scoreBjjScreen(data);
    expect(result.imtp?.value).toBeCloseTo(3, 5);
    expect(result.imtp?.score).toBeNull();
    expect(result.maxPullUps?.value).toBe(8);
    expect(result.maxPullUps?.score).toBeNull();
  });

  it("never scores the IMTP ratio without a bodyweight entered", () => {
    const data = screen({ sex: "male", strength: { ...emptyBjjScreen().strength, imtp: "264" } });
    expect(scoreBjjScreen(data).imtp).toBeNull();
  });

  it("never scores anything numeric without a sex set, but still records the value", () => {
    const data = screen({ power: { cmjHeight: "35", dropJumpRsi: "" } });
    const result = scoreBjjScreen(data);
    expect(result.cmjHeight?.value).toBe(35);
    expect(result.cmjHeight?.score).toBeNull();
  });

  it("averages mobility ratings into a single 0-10 score (poor=2, demonstrated=6, good=10)", () => {
    const data = screen({ mobility: { shoulderErIr: "good", hipErIr: "poor", lumbarFlexExt: "", txRotation: "", ankleDfKneeToWallCm: "" } });
    const result = scoreBjjScreen(data);
    expect(result.mobilityScore).toBe(6); // (10 + 2) / 2
  });

  it("the Watt Bike test is always recorded but never scored — no published benchmark exists", () => {
    const data = screen({ sex: "male", conditioning: { wattBike3MinAvgWatts: "250" } });
    const result = scoreBjjScreen(data);
    expect(result.wattBike3MinAvgWatts).toBe(250);
  });

  it("overall score averages mobility as one item, not one per rating, so it doesn't outweigh the numeric tests", () => {
    // One perfect numeric test (CMJ=10) + mobility averaging to 10 (all "good") -> overall should be 10, not skewed toward 4 mobility entries.
    const data = screen({
      sex: "male",
      power: { cmjHeight: "39.6", dropJumpRsi: "" },
      mobility: { shoulderErIr: "good", hipErIr: "good", lumbarFlexExt: "good", txRotation: "good", ankleDfKneeToWallCm: "" },
    });
    const result = scoreBjjScreen(data);
    expect(result.overall).toBe(10);
  });

  it("scores grip strength against the elite judo benchmark", () => {
    const data = screen({ sex: "male", strength: { ...emptyBjjScreen().strength, gripStrengthKg: "47" } });
    const result = scoreBjjScreen(data);
    expect(result.gripStrengthKg?.percentOfElite).toBe(100);
    expect(result.gripStrengthKg?.score).toBe(10);
  });

  it("scores the knee-to-wall ankle dorsiflexion test as its own numeric metric, not part of the qualitative mobility score", () => {
    const data = screen({
      sex: "male",
      mobility: { shoulderErIr: "", hipErIr: "", lumbarFlexExt: "", txRotation: "", ankleDfKneeToWallCm: "15" },
    });
    const result = scoreBjjScreen(data);
    expect(result.ankleDfKneeToWallCm?.percentOfElite).toBe(100);
    expect(result.mobilityScore).toBeNull(); // no Poor/Demonstrated/Good ratings were set
  });

  it("returns a null overall score when nothing has been entered yet", () => {
    expect(scoreBjjScreen(emptyBjjScreen()).overall).toBeNull();
  });
});
