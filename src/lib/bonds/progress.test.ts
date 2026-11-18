import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createMemberRecord } from "@/lib/auth/users";
import { acceptCommitment, joinBond, openSlots } from "@/lib/bonds/join";
import { completeCommitment, listActivity, removeMember, reviseCommitment } from "@/lib/bonds/progress";
import { createBond, getBondDetail } from "@/lib/bonds/service";
import { createTestDb } from "@/lib/db/client";
import { acceptances, commitments } from "@/lib/db/schema";

const plan = {
  title: "Saturday groceries",
  purpose: "Split the shop for the flat.",
  people: [{ name: "Mina Cole" }],
  commitments: [{ title: "Buy oat milk", assigneeIndex: 0, dueLocal: "2026-12-01T18:00" }],
};

describe("progress and edits", () => {
  it("invalidates an acceptance when the commitment changes", () => {
    const db = createTestDb();
    const organizer = createMemberRecord(db, "Avery Lane", "UTC");
    const mina = createMemberRecord(db, "Mina Cole", "UTC");
    if (!organizer.ok || !mina.ok) throw new Error("setup");
    const created = createBond(db, organizer.user.id, plan);
    if (!created.ok) throw new Error(created.message);
    const token = created.data.sharePath.replace("/b/", "");
    const slot = openSlots(db, token)?.slots[0];
    if (!slot) throw new Error("slot");
    const joined = joinBond(db, mina.user.id, {
      token,
      slotId: slot.id,
      decision: "accept",
      commitmentIds: slot.commitments.map((task) => task.id),
    });
    if (!joined.ok) throw new Error(joined.message);
    const before = getBondDetail(db, created.data.bondId, mina.user.id, "UTC");
    const taskId = before?.commitments[0]?.id ?? "";
    expect(before?.commitments[0]?.acceptedByYou).toBe(true);
    expect(completeCommitment(db, mina.user.id, taskId).ok).toBe(true);
    expect(getBondDetail(db, created.data.bondId, mina.user.id, "UTC")?.status).toBe("completed");

    const people = getBondDetail(db, created.data.bondId, organizer.user.id, "UTC")?.members ?? [];
    const minaMember = people.find((person) => person.name === "Mina Cole");
    const changed = reviseCommitment(db, organizer.user.id, taskId, {
      title: "Buy oat milk and bread",
      dueLocal: "2026-12-03T18:00",
      assigneeMemberId: minaMember?.id ?? "",
    });
    expect(changed.ok && changed.changed).toBe(true);
    const after = getBondDetail(db, created.data.bondId, mina.user.id, "UTC");
    expect(after?.status).toBe("active");
    expect(after?.commitments[0]?.acceptedByYou).toBe(false);
    expect(after?.commitments[0]?.title).toBe("Buy oat milk and bread");
    expect(completeCommitment(db, mina.user.id, taskId).ok).toBe(false);
    const rows = db.select().from(acceptances).where(eq(acceptances.commitmentId, taskId)).all();
    expect(rows.map((row) => row.revision).sort()).toEqual([1]);
    expect(db.select().from(commitments).where(eq(commitments.id, taskId)).get()?.revision).toBe(2);
  });

  it("cannot silently reassign someone who already accepted", () => {
    const db = createTestDb();
    const organizer = createMemberRecord(db, "Avery Lane", "UTC");
    const mina = createMemberRecord(db, "Mina Cole", "UTC");
    if (!organizer.ok || !mina.ok) throw new Error("setup");
    const created = createBond(db, organizer.user.id, {
      ...plan,
      people: [{ name: "Mina Cole" }, { name: "Rio Patel" }],
      commitments: [{ title: "Buy oat milk", assigneeIndex: 0, dueLocal: "2026-12-01T18:00" }],
    });
    if (!created.ok) throw new Error(created.message);
    const token = created.data.sharePath.replace("/b/", "");
    const minaSlot = openSlots(db, token)?.slots.find((slot) => slot.name === "Mina Cole");
    if (!minaSlot) throw new Error("slot");
    joinBond(db, mina.user.id, {
      token,
      slotId: minaSlot.id,
      decision: "accept",
      commitmentIds: minaSlot.commitments.map((task) => task.id),
    });
    const detail = getBondDetail(db, created.data.bondId, organizer.user.id, "UTC");
    const taskId = detail?.commitments[0]?.id ?? "";
    const rio = detail?.members.find((person) => person.name === "Rio Patel");
    const moved = reviseCommitment(db, organizer.user.id, taskId, {
      title: "Buy oat milk",
      dueLocal: "2026-12-01T18:00",
      assigneeMemberId: rio?.id ?? "",
    });
    expect(moved.ok && moved.changed).toBe(true);
    expect(getBondDetail(db, created.data.bondId, mina.user.id, "UTC")?.commitments[0]?.assigneeName).toBe("Rio Patel");
    expect(getBondDetail(db, created.data.bondId, mina.user.id, "UTC")?.commitments[0]?.acceptedByYou).toBe(false);
    expect(acceptCommitment(db, mina.user.id, taskId).ok).toBe(false);
  });

  it("revokes private activity when a member is removed", () => {
    const db = createTestDb();
    const organizer = createMemberRecord(db, "Avery Lane", "UTC");
    const mina = createMemberRecord(db, "Mina Cole", "UTC");
    if (!organizer.ok || !mina.ok) throw new Error("setup");
    const created = createBond(db, organizer.user.id, plan);
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
    expect(listActivity(db, mina.user.id, "UTC").some((event) => event.bondId === created.data.bondId)).toBe(true);
    const removed = removeMember(db, organizer.user.id, created.data.bondId, slot.id);
    expect(removed.ok).toBe(true);
    expect(getBondDetail(db, created.data.bondId, mina.user.id, "UTC")).toBeNull();
    expect(listActivity(db, mina.user.id, "UTC").some((event) => event.bondId === created.data.bondId)).toBe(false);
    expect(listActivity(db, organizer.user.id, "UTC").some((event) => event.sentence.includes("removed"))).toBe(true);
  });
});
