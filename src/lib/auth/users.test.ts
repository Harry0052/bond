import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createTestDb } from "@/lib/db/client";
import { sessions } from "@/lib/db/schema";
import { createMemberRecord, hashToken, readUserByToken, updateProfile } from "./users";

describe("members", () => {
  it("stores a hash of the session token and restores the name", () => {
    const db = createTestDb();
    const created = createMemberRecord(db, "Nora Alvarez", "America/Chicago");
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const stored = db.select().from(sessions).where(eq(sessions.userId, created.user.id)).get();
    expect(stored?.tokenHash).toBe(hashToken(created.token));
    expect(stored?.tokenHash).not.toBe(created.token);
    expect(readUserByToken(db, created.token)?.timezone).toBe("America/Chicago");
    expect(readUserByToken(db, "not-a-session")).toBeNull();
  });

  it("updates the same person and rejects an email-shaped name", () => {
    const db = createTestDb();
    const created = createMemberRecord(db, "Nora Alvarez", "UTC");
    if (!created.ok) throw new Error(created.message);
    const renamed = updateProfile(db, created.user.id, "Nora A.", "Asia/Tokyo");
    expect(renamed.ok && renamed.user.displayName).toBe("Nora A.");
    expect(renamed.ok && renamed.user.timezone).toBe("Asia/Tokyo");
    const rejected = updateProfile(db, created.user.id, "nora@example.com", "UTC");
    expect(rejected.ok).toBe(false);
    expect(readUserByToken(db, created.token)?.displayName).toBe("Nora A.");
  });
});
