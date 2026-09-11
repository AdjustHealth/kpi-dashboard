import { describe, expect, it } from "vitest";
import { isActive } from "@/components/nav/Sidebar";

describe("isActive", () => {
  it("matches a plain page exactly", () => {
    expect(isActive("/gym", "/gym")).toBe(true);
    expect(isActive("/dashboard", "/dashboard")).toBe(true);
  });

  it("does not treat a sibling page one level deeper as active", () => {
    // Regression: adding /gym/dashboard, /gym/mine, /gym/rules alongside the
    // /gym list page previously made "All Members" (/gym) show active on
    // every one of them too, since it used pathname.startsWith(href).
    expect(isActive("/gym/dashboard", "/gym")).toBe(false);
    expect(isActive("/gym/mine", "/gym")).toBe(false);
    expect(isActive("/gym/rules", "/gym")).toBe(false);
  });

  it("still treats a real detail sub-route as active for its list page", () => {
    expect(isActive("/providers/abc123", "/providers")).toBe(true);
    expect(isActive("/senior/xyz", "/senior")).toBe(true);
    expect(isActive("/admin/xyz", "/admin")).toBe(true);
    expect(isActive("/reviews/xyz", "/reviews")).toBe(true);
  });

  it("does not match an unrelated page with the same prefix text", () => {
    expect(isActive("/gymnastics", "/gym")).toBe(false);
  });
});
