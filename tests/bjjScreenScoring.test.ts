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

  it("returns a value with no score when there's no benchmark for the selected sex (e.g. female pull-ups)", () => {
    const data = screen({
      sex: "female",
      bodyweightKg: "60",
      strength: { ...emptyBjjScreen().strength, maxPullUps: "8" },
    });
    const result = scoreBjjScreen(data);
    expect(result.maxPullUps?.value).toBe(8);
    expect(result.maxPullUps?.score).toBeNull();
  });

  it("scores female IMTP against Adjust's own general-population threshold (2.5x bodyweight)", () => {
    const data = screen({ sex: "female", bodyweightKg: "60", strength: { ...emptyBjjScreen().strength, imtp: "150" } });
    const result = scoreBjjScreen(data);
    expect(result.imtp?.percentOfElite).toBe(100);
    expect(result.imtp?.score).toBe(10);
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
    const data = screen({
      mobility: { shoulderErIr: "good", hipErIr: "poor", lumbarFlexExt: "", txRotation: "", cervicalRotation: "", ankleDfKneeToWallCm: "" },
    });
    const result = scoreBjjScreen(data);
    expect(result.mobilityScore).toBe(6); // (10 + 2) / 2
  });

  it("includes cervical rotation alongside the other qualitative mobility ratings", () => {
    const data = screen({
      mobility: { shoulderErIr: "", hipErIr: "", lumbarFlexExt: "", txRotation: "", cervicalRotation: "good", ankleDfKneeToWallCm: "" },
    });
    const result = scoreBjjScreen(data);
    expect(result.mobilityScore).toBe(10);
  });

  it("scores the ASH-Y shoulder test (Newtons) against Adjust's own Performance report general-population threshold", () => {
    const data = screen({ sex: "male", strength: { ...emptyBjjScreen().strength, standingShoulderY: "180" } });
    const result = scoreBjjScreen(data);
    expect(result.standingShoulderY?.percentOfElite).toBe(100);
    expect(result.standingShoulderY?.score).toBe(10);
  });

  it("scores max push ups against the elite benchmark (chin ups no longer exists as a field)", () => {
    const data = screen({ sex: "male", strength: { ...emptyBjjScreen().strength, maxPushUps: "47" } });
    const result = scoreBjjScreen(data);
    expect(result.maxPushUps?.percentOfElite).toBe(100);
    expect(result.maxPushUps?.score).toBe(10);
    expect((data.strength as Record<string, unknown>).maxChinUps).toBeUndefined();
  });

  it("scores Drop Jump RSI Mod against the single >1.50 threshold, matching the clinic's Performance/Youth report convention", () => {
    const data = screen({ sex: "female", power: { cmjHeight: "", dropJumpRsi: "1.5" } });
    const result = scoreBjjScreen(data);
    expect(result.dropJumpRsi?.percentOfElite).toBe(100);
    expect(result.dropJumpRsi?.score).toBe(10);
  });

  it("scores the Watt Bike 3-min test against Adjust's own Performance report general-population threshold", () => {
    const data = screen({ sex: "male", conditioning: { wattBike3MinAvgWatts: "400" } });
    const result = scoreBjjScreen(data);
    expect(result.wattBike3MinAvgWatts?.percentOfElite).toBe(100);
    expect(result.wattBike3MinAvgWatts?.score).toBe(10);
    expect(result.categoryScores.conditioning).toBe(10);
  });

  it("overall score averages mobility as one item, not one per rating, so it doesn't outweigh the numeric tests", () => {
    // One perfect numeric test (CMJ=10) + mobility averaging to 10 (all "good") -> overall should be 10, not skewed toward 5 mobility entries.
    const data = screen({
      sex: "male",
      power: { cmjHeight: "39.6", dropJumpRsi: "" },
      mobility: {
        shoulderErIr: "good",
        hipErIr: "good",
        lumbarFlexExt: "good",
        txRotation: "good",
        cervicalRotation: "good",
        ankleDfKneeToWallCm: "",
      },
    });
    const result = scoreBjjScreen(data);
    expect(result.overall).toBe(10);
  });

  it("computes per-domain category scores, averaging only the tests scored in that domain", () => {
    const data = screen({
      sex: "male",
      bodyweightKg: "80",
      strength: { imtp: "264", standingShoulderY: "180", maxPullUps: "", maxPushUps: "", gripStrengthKg: "" },
      power: { cmjHeight: "19.8", dropJumpRsi: "" },
    });
    const result = scoreBjjScreen(data);
    expect(result.categoryScores.strength).toBe(10); // avg(imtp=10, standingShoulderY=10)
    expect(result.categoryScores.power).toBe(5); // cmjHeight only, score 5
    expect(result.categoryScores.mobility).toBeNull();
    expect(result.categoryScores.conditioning).toBeNull();
  });

  it("overall is the average of domain scores, so a domain with many tests doesn't outweigh one with few", () => {
    // Strength has 2 perfect tests (domain score 10); Power has 1 test at half elite (domain score 5).
    // A flat average across all raw tests would be (10+10+5)/3 = 8.3; the domain average is (10+5)/2 = 7.5.
    const data = screen({
      sex: "male",
      bodyweightKg: "80",
      strength: { imtp: "264", standingShoulderY: "180", maxPullUps: "", maxPushUps: "", gripStrengthKg: "" },
      power: { cmjHeight: "19.8", dropJumpRsi: "" },
    });
    const result = scoreBjjScreen(data);
    expect(result.overall).toBe(7.5);
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
      mobility: { shoulderErIr: "", hipErIr: "", lumbarFlexExt: "", txRotation: "", cervicalRotation: "", ankleDfKneeToWallCm: "15" },
    });
    const result = scoreBjjScreen(data);
    expect(result.ankleDfKneeToWallCm?.percentOfElite).toBe(100);
    expect(result.mobilityScore).toBeNull(); // no Poor/Demonstrated/Good ratings were set
  });

  it("returns a null overall score when nothing has been entered yet", () => {
    expect(scoreBjjScreen(emptyBjjScreen()).overall).toBeNull();
  });
});
