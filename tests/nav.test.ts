import { describe, expect, it } from "vitest";
import { buildNav } from "@/lib/nav";
import { AccessContext } from "@/lib/auth/access";

function access(overrides: Partial<AccessContext> = {}): AccessContext {
  return { isDirector: false, allowedProviderRoles: [], allowedSections: [], ...overrides };
}

function labels(nav: ReturnType<typeof buildNav>) {
  return nav.map((g) => g.label);
}

describe("buildNav", () => {
  it("gives a director every group, including Configuration", () => {
    const nav = buildNav(access({ isDirector: true }));
    expect(labels(nav)).toEqual(["Overview", "Data Entry", "Clinic Reports", "Meetings", "Team", "Adjust Gym", "Assessment Tool", "Configuration"]);
  });

  it("gives a login with no grants only Overview", () => {
    const nav = buildNav(access());
    expect(labels(nav)).toEqual(["Overview"]);
  });

  it("never shows Configuration to a non-director, no matter what sections are granted", () => {
    const nav = buildNav(access({ allowedSections: ["data_entry", "clinic_reports", "meetings", "team", "adjust_gym", "assessment_tool"] }));
    expect(labels(nav)).not.toContain("Configuration");
  });

  it("shows only the sections a restricted login was actually granted", () => {
    const nav = buildNav(access({ allowedSections: ["adjust_gym"] }));
    expect(labels(nav)).toEqual(["Overview", "Adjust Gym"]);
  });

  it("Marcio-style partial Meetings access shows only Providers, not Senior Physio or Admin", () => {
    const nav = buildNav(access({ allowedProviderRoles: ["physio", "massage", "ep"] }));
    const meetings = nav.find((g) => g.label === "Meetings");
    expect(meetings?.items.map((i) => i.label)).toEqual(["Providers"]);
  });

  it("full 'meetings' section access unlocks Providers, Senior Physio, and Admin together", () => {
    const nav = buildNav(access({ allowedSections: ["meetings"] }));
    const meetings = nav.find((g) => g.label === "Meetings");
    expect(meetings?.items.map((i) => i.label)).toEqual(["Providers", "Senior Physio", "Admin"]);
  });

  it("omits Meetings entirely when there's no role or section access to any of its pages", () => {
    const nav = buildNav(access({ allowedSections: ["team"] }));
    expect(labels(nav)).not.toContain("Meetings");
  });

  it("puts the clinic-wide Dashboard under Clinic Reports, not Overview", () => {
    const nav = buildNav(access({ isDirector: true }));
    const overview = nav.find((g) => g.label === "Overview")!;
    const clinicReports = nav.find((g) => g.label === "Clinic Reports")!;
    expect(overview.items.map((i) => i.href)).toEqual(["/home"]);
    expect(clinicReports.items.map((i) => i.href)).toContain("/dashboard");
  });
});
