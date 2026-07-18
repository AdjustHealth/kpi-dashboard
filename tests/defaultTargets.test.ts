import { describe, expect, it } from "vitest";
import { getEffectiveTargets } from "@/lib/defaultTargets";

describe("getEffectiveTargets", () => {
  it("falls back to hardcoded defaults when no role_targets group exists yet", () => {
    const targets = getEffectiveTargets({ role: "physio", targets: { experience_tier: "new_grad" } });
    expect(targets.dnas).toBe(0);
    expect(targets.cancellations).toBe(20);
    expect(targets.ucva).toBe(4);
  });

  it("a role_targets group value overrides the hardcoded default", () => {
    const roleTargets = { providers: { dnas: 3, cva_target_new_grad: 5 } };
    const targets = getEffectiveTargets({ role: "physio", targets: { experience_tier: "new_grad" } }, roleTargets);
    expect(targets.dnas).toBe(3);
    expect(targets.ucva).toBe(5);
  });

  it("an explicit provider.targets override wins over its role_targets group", () => {
    const roleTargets = { providers: { dnas: 3 } };
    const targets = getEffectiveTargets({ role: "physio", targets: { dnas: 7 } }, roleTargets);
    expect(targets.dnas).toBe(7);
  });

  it("senior_physio pulls its shared flat targets from the 'senior' group and CVA from 'senior' tier target", () => {
    const roleTargets = { senior: { fba: 3, cva_target_senior: 8 } };
    const targets = getEffectiveTargets({ role: "senior_physio", targets: {} }, roleTargets);
    expect(targets.fba).toBe(3);
    expect(targets.ucva).toBe(8);
  });

  it("admin pulls its shared flat targets from the 'admin' group and never gets a CVA target", () => {
    const roleTargets = { admin: { obv_not_sent: 1 } };
    const targets = getEffectiveTargets({ role: "admin", targets: {} }, roleTargets);
    expect(targets.obv_not_sent).toBe(1);
    expect(targets.ucva).toBeUndefined();
  });

  it("a physio manually tagged tier 'senior' gets flat targets from 'providers' but CVA from 'senior' group", () => {
    const roleTargets = { providers: { fba: 3 }, senior: { cva_target_senior: 9 } };
    const targets = getEffectiveTargets({ role: "physio", targets: { experience_tier: "senior" } }, roleTargets);
    expect(targets.fba).toBe(3);
    expect(targets.ucva).toBe(9);
  });

  it("cva_target_* keys never leak into the returned targets object as their own field", () => {
    const roleTargets = { providers: { cva_target_new_grad: 5, cva_target_2_5yr: 6 } };
    const targets = getEffectiveTargets({ role: "physio", targets: { experience_tier: "new_grad" } }, roleTargets);
    expect(targets.cva_target_new_grad).toBeUndefined();
    expect(targets.cva_target_2_5yr).toBeUndefined();
  });
});
