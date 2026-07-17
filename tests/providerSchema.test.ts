import { describe, expect, it } from "vitest";
import {
  ADMIN_METRIC_FIELDS,
  CLINICIAN_METRIC_FIELDS,
  COMPLIANCE_FIELDS,
  metricFieldsForRole,
  SYSTEMS_KPA_FIELDS,
} from "@/lib/providerSchema";

describe("providerSchema", () => {
  it("metricFieldsForRole returns admin fields only for admin role", () => {
    expect(metricFieldsForRole("admin")).toBe(ADMIN_METRIC_FIELDS);
    expect(metricFieldsForRole("senior_physio")).toBe(CLINICIAN_METRIC_FIELDS);
    expect(metricFieldsForRole("physio")).toBe(CLINICIAN_METRIC_FIELDS);
  });

  it("field keys are unique within each set", () => {
    for (const set of [CLINICIAN_METRIC_FIELDS, ADMIN_METRIC_FIELDS, COMPLIANCE_FIELDS, SYSTEMS_KPA_FIELDS]) {
      const keys = set.map((f) => f.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});
