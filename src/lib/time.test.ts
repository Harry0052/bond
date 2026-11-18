import { describe, expect, it } from "vitest";
import { formatInZone, localDateInZone, zonedLocalToUtc } from "./time";

describe("time zones", () => {
  it("stores a wall time as UTC and renders it differently for each member", () => {
    const utc = zonedLocalToUtc("2026-07-15T18:00", "America/Los_Angeles");
    expect(utc).toBe("2026-07-16T01:00:00.000Z");
    expect(zonedLocalToUtc("2026-07-15T18:00", "Asia/Tokyo")).toBe("2026-07-15T09:00:00.000Z");

    const instant = "2026-07-16T01:00:00.000Z";
    expect(formatInZone(instant, "America/Los_Angeles")).toContain("15 Jul 2026");
    expect(formatInZone(instant, "America/Los_Angeles")).toContain("18:00");
    expect(formatInZone(instant, "Asia/Tokyo")).toContain("16 Jul 2026");
    expect(formatInZone(instant, "Asia/Tokyo")).toContain("10:00");
    expect(localDateInZone(instant, "America/Los_Angeles")).toBe("2026-07-15");
    expect(localDateInZone(instant, "Asia/Tokyo")).toBe("2026-07-16");
  });

  it("rejects a calendar day that does not exist", () => {
    expect(zonedLocalToUtc("2026-02-31T12:00", "UTC")).toBeNull();
    expect(zonedLocalToUtc("not-a-date", "UTC")).toBeNull();
    expect(zonedLocalToUtc("2026-07-15T18:00", "Not/AZone")).toBeNull();
  });
});
