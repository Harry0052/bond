import { describe, expect, it } from "vitest";
import { profileBodySchema } from "./profile";

describe("profile", () => {
  it("accepts a name and timezone and rejects an email", () => {
    expect(profileBodySchema.safeParse({ displayName: "Nora Alvarez", timezone: "Europe/London" }).success).toBe(
      true,
    );
    const email = profileBodySchema.safeParse({ displayName: "nora@example.com", timezone: "UTC" });
    expect(email.success).toBe(false);
    const zone = profileBodySchema.safeParse({ displayName: "Nora", timezone: "Not/AZone" });
    expect(zone.success).toBe(false);
  });
});
