import { describe, expect, it } from "vitest";
import { scoreBjjScreen } from "@/lib/bjjInjuryScreen/scoring";
import { emptyBjjScreen, type BjjScreenFormData } from "@/lib/bjjInjuryScreen/types";

function screen(overrides: Partial<BjjScreenFormData> = {}): BjjScreenFormData {
  return { ...emptyBjjScreen(), ...overrides };
}

describe("scoreBjjScreen", () => {
  it("scores IMTP directly as entered (already bodyweight-relative off the ForceDecks), matching the elite ratio exactly at 100%", () => {
    const data = screen({ sex: "male", strength: { ...emptyBjjScreen().strength, imtp: "3.3" } });
    const result = scoreBjjScreen(data);
    expect(result.imtp?.percentOfElite).toBe(100);
    expect(result.imtp?.score).toBe(10);
  });

  it("scores IMTP with no Bodyweight entered — it no longer needs one, unlike the Watt Bike test", () => {
    const data = screen({ sex: "male", bodyweightKg: "", strength: { ...emptyBjjScreen().strength, imtp: "3.3" } });
    const result = scoreBjjScreen(data);
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
      strength: { ...emptyBjjScreen().strength, maxPullUps: "8" },
    });
    const result = scoreBjjScreen(data);
    expect(result.maxPullUps?.value).toBe(8);
    expect(result.maxPullUps?.score).toBeNull();
  });

  it("scores female IMTP against Adjust's own general-population threshold (2.5x bodyweight)", () => {
    const data = screen({ sex: "female", strength: { ...emptyBjjScreen().strength, imtp: "2.5" } });
    const result = scoreBjjScreen(data);
    expect(result.imtp?.percentOfElite).toBe(100);
    expect(result.imtp?.score).toBe(10);
  });

  it("never scores anything numeric without a sex set, but still records the value", () => {
    const data = screen({ power: { cmjHeight: "35", dropJumpRsi: "" } });
    const result = scoreBjjScreen(data);
    expect(result.cmjHeight?.value).toBe(35);
    expect(result.cmjHeight?.score).toBeNull();
  });

  it("averages mobility ratings into a single 0-10 score (poor=2, demonstrated=6, good=10)", () => {
    const data = screen({
      mobility: { shoulderErIr: "good", hipErIr: "poor", lumbarFlexExt: "", txRotation: "", cervicalRotation: "", ankleDfKneeToWallCmLeft: "", ankleDfKneeToWallCmRight: "" },
    });
    const result = scoreBjjScreen(data);
    expect(result.mobilityScore).toBe(6); // (10 + 2) / 2
  });

  it("includes cervical rotation alongside the other qualitative mobility ratings", () => {
    const data = screen({
      mobility: { shoulderErIr: "", hipErIr: "", lumbarFlexExt: "", txRotation: "", cervicalRotation: "good", ankleDfKneeToWallCmLeft: "", ankleDfKneeToWallCmRight: "" },
    });
    const result = scoreBjjScreen(data);
    expect(result.mobilityScore).toBe(10);
  });

  it("scores the ASH-Y shoulder test (Newtons) per side against Adjust's own Performance report general-population threshold", () => {
    const data = screen({ sex: "male", strength: { ...emptyBjjScreen().strength, standingShoulderYLeft: "180", standingShoulderYRight: "90" } });
    const result = scoreBjjScreen(data);
    expect(result.standingShoulderYLeft?.percentOfElite).toBe(100);
    expect(result.standingShoulderYLeft?.score).toBe(10);
    expect(result.standingShoulderYRight?.percentOfElite).toBe(50);
    expect(result.standingShoulderYRight?.score).toBe(5);
  });

  it("computes a Limb Symmetry Index (deficit) between the two ASH-Y sides", () => {
    const data = screen({ sex: "male", strength: { ...emptyBjjScreen().strength, standingShoulderYLeft: "180", standingShoulderYRight: "90" } });
    const result = scoreBjjScreen(data);
    expect(result.standingShoulderYLsi).toBe(50); // (1 - min(180,90)/max(180,90)) * 100 = 50%
  });

  it("scores max push ups against the elite benchmark (chin ups no longer exists as a field)", () => {
    const data = screen({ sex: "male", strength: { ...emptyBjjScreen().strength, maxPushUps: "47" } });
    const result = scoreBjjScreen(data);
    expect(result.maxPushUps?.percentOfElite).toBe(100);
    expect(result.maxPushUps?.score).toBe(10);
    expect((data.strength as Record<string, unknown>).maxChinUps).toBeUndefined();
  });

  it("scores Drop Jump RSI Mod against the clinic's own sex-specific Performance/Youth report thresholds (male 1.5, female 1.2)", () => {
    const male = scoreBjjScreen(screen({ sex: "male", power: { cmjHeight: "", dropJumpRsi: "1.5" } }));
    expect(male.dropJumpRsi?.percentOfElite).toBe(100);
    expect(male.dropJumpRsi?.score).toBe(10);

    const female = scoreBjjScreen(screen({ sex: "female", power: { cmjHeight: "", dropJumpRsi: "1.2" } }));
    expect(female.dropJumpRsi?.percentOfElite).toBe(100);
    expect(female.dropJumpRsi?.score).toBe(10);
  });

  it("scores the Watt Bike 3-min test as watts ÷ bodyweight against Wattbike's own 'Amateur' power-to-weight tier (3.7 W/kg)", () => {
    const data = screen({ sex: "male", bodyweightKg: "100", conditioning: { wattBike3MinAvgWatts: "370" } });
    const result = scoreBjjScreen(data);
    expect(result.wattBike3MinAvgWatts?.percentOfElite).toBe(100);
    expect(result.wattBike3MinAvgWatts?.score).toBe(10);
    expect(result.categoryScores.conditioning).toBe(10);
  });

  it("never scores the Watt Bike test without a bodyweight entered, unlike IMTP", () => {
    const data = screen({ sex: "male", conditioning: { wattBike3MinAvgWatts: "370" } });
    expect(scoreBjjScreen(data).wattBike3MinAvgWatts).toBeNull();
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
        ankleDfKneeToWallCmLeft: "",
        ankleDfKneeToWallCmRight: "",
      },
    });
    const result = scoreBjjScreen(data);
    expect(result.overall).toBe(10);
  });

  it("computes per-domain category scores, averaging only the tests scored in that domain", () => {
    const data = screen({
      sex: "male",
      strength: { imtp: "3.3", standingShoulderYLeft: "180", standingShoulderYRight: "", maxPullUps: "", maxPushUps: "", gripStrengthKg: "" },
      power: { cmjHeight: "19.8", dropJumpRsi: "" },
    });
    const result = scoreBjjScreen(data);
    expect(result.categoryScores.strength).toBe(10); // avg(imtp=10, standingShoulderYLeft=10)
    expect(result.categoryScores.power).toBe(5); // cmjHeight only, score 5
    expect(result.categoryScores.mobility).toBeNull();
    expect(result.categoryScores.conditioning).toBeNull();
  });

  it("overall is the average of domain scores, so a domain with many tests doesn't outweigh one with few", () => {
    // Strength has 2 perfect tests (domain score 10); Power has 1 test at half elite (domain score 5).
    // A flat average across all raw tests would be (10+10+5)/3 = 8.3; the domain average is (10+5)/2 = 7.5.
    const data = screen({
      sex: "male",
      strength: { imtp: "3.3", standingShoulderYLeft: "180", standingShoulderYRight: "", maxPullUps: "", maxPushUps: "", gripStrengthKg: "" },
      power: { cmjHeight: "19.8", dropJumpRsi: "" },
    });
    const result = scoreBjjScreen(data);
    expect(result.overall).toBe(7.5);
  });

  it("scores grip strength (kg) against the elite judo benchmark", () => {
    const data = screen({ sex: "male", strength: { ...emptyBjjScreen().strength, gripStrengthKg: "47.0" } });
    const result = scoreBjjScreen(data);
    expect(result.gripStrengthKg?.percentOfElite).toBe(100);
    expect(result.gripStrengthKg?.score).toBe(10);
  });

  it("scores the knee-to-wall ankle dorsiflexion test per side, not part of the qualitative mobility score", () => {
    const data = screen({
      sex: "male",
      mobility: { shoulderErIr: "", hipErIr: "", lumbarFlexExt: "", txRotation: "", cervicalRotation: "", ankleDfKneeToWallCmLeft: "15", ankleDfKneeToWallCmRight: "" },
    });
    const result = scoreBjjScreen(data);
    expect(result.ankleDfLeft?.percentOfElite).toBe(100);
    expect(result.ankleDfRight).toBeNull();
    expect(result.mobilityScore).toBeNull(); // no Poor/Demonstrated/Good ratings were set
  });

  it("computes a Limb Symmetry Index (deficit) between the two ankle DF sides — 0% is perfectly symmetric, higher is a bigger gap", () => {
    const data = screen({
      sex: "male",
      mobility: { shoulderErIr: "", hipErIr: "", lumbarFlexExt: "", txRotation: "", cervicalRotation: "", ankleDfKneeToWallCmLeft: "15", ankleDfKneeToWallCmRight: "12" },
    });
    const result = scoreBjjScreen(data);
    expect(result.ankleDfLsi).toBe(20); // (1 - min(15,12)/max(15,12)) * 100 = 20%
  });

  it("leaves the ankle DF LSI null when only one side was measured", () => {
    const data = screen({
      sex: "male",
      mobility: { shoulderErIr: "", hipErIr: "", lumbarFlexExt: "", txRotation: "", cervicalRotation: "", ankleDfKneeToWallCmLeft: "15", ankleDfKneeToWallCmRight: "" },
    });
    expect(scoreBjjScreen(data).ankleDfLsi).toBeNull();
  });

  it("returns a null overall score when nothing has been entered yet", () => {
    expect(scoreBjjScreen(emptyBjjScreen()).overall).toBeNull();
  });
});
