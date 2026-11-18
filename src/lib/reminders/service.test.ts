import { describe, expect, it } from "vitest";
import { createMemberRecord } from "@/lib/auth/users";
import { createBond } from "@/lib/bonds/service";
import { createTestDb } from "@/lib/db/client";
import { reminders } from "@/lib/db/schema";
import { setReminderOptIn, syncReminders } from "./service";

describe("reminders", () => {
  it("uses each person's timezone and stays off until they opt in", () => {
    const db = createTestDb();
    const losAngeles = createMemberRecord(db, "Avery Lane", "America/Los_Angeles");
    const tokyo = createMemberRecord(db, "Mina Cole", "Asia/Tokyo");
    if (!losAngeles.ok || !tokyo.ok) throw new Error("setup");
    const now = new Date("2026-07-16T00:30:00.000Z");
    const west = createBond(db, losAngeles.user.id, {
      title: "Night shift",
      purpose: "Cover the late hour.",
      people: [],
      commitments: [{ title: "Lock the door", assigneeIndex: null, dueLocal: "2026-07-15T18:00" }],
    });
    const east = createBond(db, tokyo.user.id, {
      title: "Morning shift",
      purpose: "Cover the early hour.",
      people: [],
      commitments: [{ title: "Open the door", assigneeIndex: null, dueLocal: "2026-07-16T10:00" }],
    });
    if (!west.ok || !east.ok) throw new Error("bond");

    expect(syncReminders(db, losAngeles.user.id, now)).toEqual([]);
    setReminderOptIn(db, losAngeles.user.id, true);
    setReminderOptIn(db, tokyo.user.id, true);
    const westRows = syncReminders(db, losAngeles.user.id, now);
    const eastRows = syncReminders(db, tokyo.user.id, now);
    expect(westRows.map((row) => row.dueOn)).toEqual(["2026-07-15"]);
    expect(eastRows.map((row) => row.dueOn)).toEqual(["2026-07-16"]);
    expect(westRows[0]?.kind).toBe("due_soon");

    setReminderOptIn(db, losAngeles.user.id, false);
    expect(syncReminders(db, losAngeles.user.id, now)).toEqual([]);
    expect(db.select().from(reminders).all().some((row) => row.userId === losAngeles.user.id)).toBe(false);
    expect(db.select().from(reminders).all().some((row) => row.userId === tokyo.user.id)).toBe(true);
  });
});
