import { describe, expect, it } from "vitest";
import {
  CLINIC_SCHEMA,
  getClinicField,
  getClinicFieldsByCategory,
  getClinicHeaders,
  getManualClinicFields,
} from "@/lib/schema";

describe("CLINIC_SCHEMA", () => {
  it("has unique, sequential idx values starting at 1", () => {
    const idxs = CLINIC_SCHEMA.map((f) => f.idx);
    expect(idxs).toEqual([...idxs].sort((a, b) => a - b));
    expect(new Set(idxs).size).toBe(idxs.length);
    expect(idxs[0]).toBe(1);
  });

  it("has unique field ids", () => {
    const ids = CLINIC_SCHEMA.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("preserves the original EXPORT_SCHEMA.js ids", () => {
    // m_mscred (Move Strong Credits) deliberately removed — no longer tracked.
    const originalIds = [
      "week", "total_rev", "total_consults", "total_nc", "clinic_occ",
      "physio_occ", "massage_occ", "ep_occ", "m_glofox", "m_gym3p",
      "gym_total", "m_mems", "m_pod_rev", "m_pod_c",
      "m_pod_ytd", "total_adjust_pod_rev", "cx_cancels", "cx_pct",
      "cx_dnas", "cx_nr", "cx_nr_pct", "cx_rsx_pct", "cx_in7_pct",
    ];
    const ids = new Set(CLINIC_SCHEMA.map((f) => f.id));
    for (const id of originalIds) expect(ids.has(id)).toBe(true);
    expect(ids.has("m_mscred")).toBe(false);
  });

  it("getClinicField finds a known field", () => {
    expect(getClinicField("total_rev")?.label).toBe("Total Revenue");
    expect(getClinicField("does_not_exist")).toBeUndefined();
  });

  it("getClinicFieldsByCategory filters correctly", () => {
    const gym = getClinicFieldsByCategory("Gym");
    expect(gym.every((f) => f.category === "Gym")).toBe(true);
    expect(gym.map((f) => f.id)).toContain("gym_total");
  });

  it("getManualClinicFields only returns manual-source fields", () => {
    const manual = getManualClinicFields();
    expect(manual.every((f) => f.source === "manual")).toBe(true);
    expect(manual.map((f) => f.id)).not.toContain("gym_total");
  });

  it("getClinicHeaders returns one label per field", () => {
    expect(getClinicHeaders().length).toBe(CLINIC_SCHEMA.length);
  });
});
