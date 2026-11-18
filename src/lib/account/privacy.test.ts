import { describe, expect, it } from "vitest";
import { deleteAccount, exportAccount } from "@/lib/account/privacy";
import { createMemberRecord, readUserByToken } from "@/lib/auth/users";
import { joinBond, openSlots } from "@/lib/bonds/join";
import { createBond, getBondDetail } from "@/lib/bonds/service";
import { northStar } from "@/lib/metrics";
import { createTestDb } from "@/lib/db/client";
import { bonds } from "@/lib/db/schema";

describe("account privacy", () => {
  it("exports the person's bonds without share secrets and deletion revokes access", () => {
    const db = createTestDb();
    const organizer = createMemberRecord(db, "Avery Lane", "UTC");
    const mina = createMemberRecord(db, "Mina Cole", "UTC");
    if (!organizer.ok || !mina.ok) throw new Error("setup");
    const created = createBond(db, organizer.user.id, {
      title: "<script>alert(1)</script>",
      purpose: "A literal title, not markup.",
      people: [{ name: "Mina Cole" }],
      commitments: [{ title: "Buy oat milk", assigneeIndex: 0, dueLocal: "2026-12-01T18:00" }],
    });
    if (!created.ok) throw new Error(created.message);
    const token = created.data.sharePath.replace("/b/", "");
    const slot = openSlots(db, token)?.slots[0];
    if (!slot) throw new Error("slot");
    joinBond(db, mina.user.id, {
      token,
      slotId: slot.id,
      decision: "accept",
      commitmentIds: slot.commitments.map((task) => task.id),
    });

    const exported = exportAccount(db, organizer.user.id);
    const serialized = JSON.stringify(exported);
    expect(exported?.bonds[0]?.title).toBe("<script>alert(1)</script>");
    expect(serialized).not.toContain("shareNonce");
    expect(serialized).not.toContain("shareToken");
    expect(serialized).not.toContain(token);
    expect(northStar(db).bondsWithTwoAcceptsIn48Hours).toBe(1);

    expect(deleteAccount(db, mina.user.id).ok).toBe(true);
    expect(readUserByToken(db, mina.token)).toBeNull();
    expect(getBondDetail(db, created.data.bondId, mina.user.id, "UTC")).toBeNull();
    expect(exportAccount(db, mina.user.id)).toBeNull();
    expect(db.select().from(bonds).all().some((bond) => bond.id === created.data.bondId)).toBe(true);
  });
});
