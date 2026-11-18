import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createMemberRecord } from "@/lib/auth/users";
import { publicPreview } from "@/lib/bonds/preview";
import { SAMPLE_BOND_ID } from "@/lib/bonds/sample";
import { createBond, getBondDetail, listHome, sampleSharePath, syncBondStatus } from "@/lib/bonds/service";
import { createTestDb } from "@/lib/db/client";
import { seedDemo } from "@/lib/db/seed";
import { bondEvents, bonds, commitments } from "@/lib/db/schema";

function member(name = "Nora Alvarez", timezone = "America/Los_Angeles") {
  const db = createTestDb();
  const created = createMemberRecord(db, name, timezone);
  if (!created.ok) throw new Error(created.message);
  return { db, user: created.user };
}

const input = {
  title: "Saturday groceries",
  purpose: "Split the shop for the flat.",
  people: [{ name: "Mina Cole" }],
  commitments: [
    { title: "Buy oat milk", assigneeIndex: 0, dueLocal: "2026-12-01T18:00" },
    { title: "Book the table", assigneeIndex: null, dueLocal: "2026-12-02T12:00" },
  ],
};

describe("bonds", () => {
  it("persists a bond the organizer can open again", () => {
    const { db, user } = member();
    const created = createBond(db, user.id, input, "key-12345678");
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const again = createBond(db, user.id, input, "key-12345678");
    expect(again.ok && again.data.bondId).toBe(created.data.bondId);
    expect(again.ok && again.data.reused).toBe(true);

    const detail = getBondDetail(db, created.data.bondId, user.id, user.timezone);
    expect(detail?.title).toBe("Saturday groceries");
    expect(detail?.commitments[0]?.dueLabel).toContain("18:00");
    expect(detail?.commitments[0]?.dueLabel).toContain("America/Los_Angeles");
    expect(detail?.commitments[0]?.dueAt).toBe("2026-12-02T02:00:00.000Z");
    expect(detail?.members.map((person) => person.status).sort()).toEqual(["accepted", "invited"]);
    expect(detail?.events.some((line) => line.includes("started this bond"))).toBe(true);

    const home = listHome(db, user.id, user.timezone);
    expect(home.active).toHaveLength(1);
    expect(home.upcoming.map((item) => item.title)).toEqual(["Buy oat milk", "Book the table"]);

    const stranger = createMemberRecord(db, "Other Person", "UTC");
    if (!stranger.ok) throw new Error(stranger.message);
    expect(getBondDetail(db, created.data.bondId, stranger.user.id, "UTC")).toBeNull();
  });

  it("keeps private activity out of the guest preview", () => {
    const { db, user } = member();
    const created = createBond(db, user.id, input);
    if (!created.ok) throw new Error(created.message);
    db.insert(bondEvents)
      .values({
        id: "22222222-2222-4222-8222-222222222222",
        bondId: created.data.bondId,
        actorId: user.id,
        eventType: "note_added",
        payloadJson: JSON.stringify({ note: "private-fridge-code-8821" }),
        createdAt: "2026-12-01T00:00:00.000Z",
      })
      .run();
    const token = created.data.sharePath.replace("/b/", "");
    const preview = publicPreview(db, token);
    const serialized = JSON.stringify(preview);
    expect(preview?.title).toBe("Saturday groceries");
    expect(preview?.namesOnTheCard).toEqual(expect.arrayContaining(["Mina Cole"]));
    expect(serialized).not.toContain(user.id);
    expect(serialized).not.toContain("private-fridge-code-8821");
    expect(serialized).not.toContain("started this bond");
    expect(serialized).not.toContain("timezone");
    expect(preview && "events" in preview).toBe(false);
    expect(getBondDetail(db, created.data.bondId, user.id, "UTC")?.events.join(" ")).not.toContain(
      "private-fridge-code-8821",
    );
  });

  it("rejects a bad date and marks a fully done bond completed", () => {
    const { db, user } = member("Nora Alvarez", "UTC");
    const rejected = createBond(db, user.id, {
      ...input,
      commitments: [{ title: "Buy oat milk", assigneeIndex: 0, dueLocal: "2026-02-31T18:00" }],
    });
    expect(rejected.ok).toBe(false);
    const created = createBond(db, user.id, {
      ...input,
      commitments: [{ title: "Buy oat milk", assigneeIndex: null, dueLocal: "2026-12-01T18:00" }],
    });
    if (!created.ok) throw new Error(created.message);
    db.update(commitments)
      .set({ status: "done" })
      .where(eq(commitments.bondId, created.data.bondId))
      .run();
    expect(syncBondStatus(db, created.data.bondId)).toBe("completed");
    expect(db.select().from(bonds).where(eq(bonds.id, created.data.bondId)).get()?.status).toBe("completed");
    expect(listHome(db, user.id, "UTC").completed).toHaveLength(1);
    expect(listHome(db, user.id, "UTC").active).toHaveLength(0);
  });

  it("serves the labeled sample without making the visitor a member", () => {
    const db = createTestDb();
    seedDemo(db);
    const token = sampleSharePath().replace("/b/", "");
    const sample = publicPreview(db, token);
    expect(sample?.demo).toBe(true);
    expect(sample?.title).toBe("Saturday groceries");
    const visitor = createMemberRecord(db, "Visitor", "UTC");
    if (!visitor.ok) throw new Error(visitor.message);
    expect(getBondDetail(db, SAMPLE_BOND_ID, visitor.user.id, "UTC")).toBeNull();
  });
});
