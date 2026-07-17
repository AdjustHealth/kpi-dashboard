import { describe, expect, it } from "vitest";
import {
  ADMIN_METRIC_FIELDS,
  CLINICIAN_METRIC_FIELDS,
  SENIOR_ONLY_METRIC_FIELDS,
  COMPLIANCE_FIELDS,
  metricFieldsForRole,
  SYSTEMS_KPA_FIELDS,
} from "@/lib/providerSchema";

describe("providerSchema", () => {
  it("metricFieldsForRole returns the right field set per role", () => {
    expect(metricFieldsForRole("admin")).toBe(ADMIN_METRIC_FIELDS);
    expect(metricFieldsForRole("physio")).toBe(CLINICIAN_METRIC_FIELDS);
    expect(metricFieldsForRole("massage")).toBe(CLINICIAN_METRIC_FIELDS);
    expect(metricFieldsForRole("ep")).toBe(CLINICIAN_METRIC_FIELDS);
    // Senior physios get the base clinician fields plus sm_reel/blog.
    const seniorFields = metricFieldsForRole("senior_physio");
    for (const f of CLINICIAN_METRIC_FIELDS) expect(seniorFields).toContainEqual(f);
    for (const f of SENIOR_ONLY_METRIC_FIELDS) expect(seniorFields).toContainEqual(f);
    expect(seniorFields.length).toBe(CLINICIAN_METRIC_FIELDS.length + SENIOR_ONLY_METRIC_FIELDS.length);
  });

  it("field keys are unique within each set", () => {
    for (const set of [CLINICIAN_METRIC_FIELDS, ADMIN_METRIC_FIELDS, COMPLIANCE_FIELDS, SYSTEMS_KPA_FIELDS]) {
      const keys = set.map((f) => f.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});
