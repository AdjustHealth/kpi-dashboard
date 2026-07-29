import { describe, expect, it } from "vitest";
import {
  ADMIN_METRIC_FIELDS,
  ADMIN_SHARED_COMPLIANCE_FIELDS,
  CLINICIAN_METRIC_FIELDS,
  SENIOR_ONLY_METRIC_FIELDS,
  COMPLIANCE_FIELDS,
  metricFieldsForRole,
  kpaGroupsForRole,
  SENIOR_KPA_FIELDS,
  CORE_VALUES_KPA_FIELDS,
  PROVIDER_TASK_KPA_FIELDS,
  CUSTOMER_SERVICE_KPA_FIELDS,
} from "@/lib/providerSchema";

describe("providerSchema", () => {
  it("metricFieldsForRole returns the right field set per role", () => {
    expect(metricFieldsForRole("admin")).toBe(ADMIN_METRIC_FIELDS);
    // Turnover and TPR are senior-physio-only on the meeting sheet — director's
    // call, since seniors already track turnover in depth via the Bonus Tier
    // Tracker and these two read as noise for regular physio/massage/EP.
    const nonSeniorClinicianFields = CLINICIAN_METRIC_FIELDS.filter((f) => f.key !== "turnover" && f.key !== "tpr");
    expect(metricFieldsForRole("physio")).toEqual(nonSeniorClinicianFields);
    expect(metricFieldsForRole("massage")).toEqual(nonSeniorClinicianFields);
    expect(metricFieldsForRole("ep")).toEqual(nonSeniorClinicianFields);
    // Senior physios get the full base clinician fields (incl. turnover/tpr) plus sm_reel/blog.
    const seniorFields = metricFieldsForRole("senior_physio");
    for (const f of CLINICIAN_METRIC_FIELDS) expect(seniorFields).toContainEqual(f);
    for (const f of SENIOR_ONLY_METRIC_FIELDS) expect(seniorFields).toContainEqual(f);
    expect(seniorFields.length).toBe(CLINICIAN_METRIC_FIELDS.length + SENIOR_ONLY_METRIC_FIELDS.length);
  });

  it("kpaGroupsForRole splits Core Values out as its own group for every non-senior role", () => {
    expect(kpaGroupsForRole("senior_physio")).toEqual([{ title: "KPA Scorecard", fields: SENIOR_KPA_FIELDS }]);

    for (const role of ["physio", "massage", "ep"] as const) {
      const groups = kpaGroupsForRole(role);
      expect(groups).toEqual([
        { title: "Core Values", fields: CORE_VALUES_KPA_FIELDS },
        { title: "KPA Scorecard", fields: PROVIDER_TASK_KPA_FIELDS },
      ]);
    }

    expect(kpaGroupsForRole("admin")).toEqual([
      { title: "Customer Service", fields: CUSTOMER_SERVICE_KPA_FIELDS },
      { title: "Culture / Core Values", fields: CORE_VALUES_KPA_FIELDS },
    ]);
  });

  it("field keys are unique within each set", () => {
    for (const set of [
      CLINICIAN_METRIC_FIELDS,
      ADMIN_METRIC_FIELDS,
      ADMIN_SHARED_COMPLIANCE_FIELDS,
      COMPLIANCE_FIELDS,
      SENIOR_KPA_FIELDS,
      CORE_VALUES_KPA_FIELDS,
      PROVIDER_TASK_KPA_FIELDS,
      CUSTOMER_SERVICE_KPA_FIELDS,
    ]) {
      const keys = set.map((f) => f.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it("ADMIN_METRIC_FIELDS no longer includes fields that are shared clinic-wide instead", () => {
    const sharedKeys = new Set(ADMIN_SHARED_COMPLIANCE_FIELDS.map((f) => f.key));
    for (const f of ADMIN_METRIC_FIELDS) expect(sharedKeys.has(f.key)).toBe(false);
  });
});
