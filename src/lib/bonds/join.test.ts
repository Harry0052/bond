import { describe, expect, it } from "vitest";
import { createMemberRecord } from "@/lib/auth/users";
import { acceptCommitment, castVote, joinBond, openSlots } from "@/lib/bonds/join";
import { publicPreview } from "@/lib/bonds/preview";
import { SAMPLE_BOND_ID } from "@/lib/bonds/sample";
import { createBond, getBondDetail, sampleSharePath } from "@/lib/bonds/service";
import { createTestDb } from "@/lib/db/client";
import { seedDemo } from "@/lib/db/seed";
import { acceptances, decisions, voteQuestions } from "@/lib/db/schema";

const plan = {
  title: "Saturday groceries",
  purpose: "Split the shop for the flat.",
  people: [{ name: "Mina Cole" }],
  commitments: [{ title: "Buy oat milk", assigneeIndex: 0, dueLocal: "2026-12-01T18:00" }],
  votePrompt: "Add snacks?",
};

describe("join and accept", () => {
  it("lets a second person accept and blocks everyone else", () => {
    const db = createTestDb();
    const organizer = createMemberRecord(db, "Avery Lane", "America/Los_Angeles");
    const mina = createMemberRecord(db, "Mina Cole", "Asia/Tokyo");
    const stranger = createMemberRecord(db, "Casey Other", "UTC");
    if (!organizer.ok || !mina.ok || !stranger.ok) throw new Error("setup");
    const created = createBond(db, organizer.user.id, plan);
    if (!created.ok) throw new Error(created.message);
    const sheet = openSlots(db, created.data.sharePath.replace("/b/", ""));
    expect(sheet?.slots).toHaveLength(1);
    expect(JSON.stringify(sheet)).not.toContain(organizer.user.id);
    const slot = sheet?.slots[0];
    if (!slot) throw new Error("slot");

    const joined = joinBond(db, mina.user.id, {
      token: created.data.sharePath.replace("/b/", ""),
      slotId: slot.id,
      decision: "accept",
      commitmentIds: slot.commitments.map((task) => task.id),
    });
    expect(joined.ok && joined.access).toBe(true);
    const again = joinBond(db, mina.user.id, {
      token: created.data.sharePath.replace("/b/", ""),
      slotId: slot.id,
      decision: "accept",
      commitmentIds: slot.commitments.map((task) => task.id),
    });
    expect(again.ok).toBe(false);

    const minaView = getBondDetail(db, created.data.bondId, mina.user.id, "Asia/Tokyo");
    expect(minaView?.commitments[0]?.acceptedByYou).toBe(true);
    expect(minaView?.commitments[0]?.dueLabel).toContain("Asia/Tokyo");
    expect(minaView?.commitments[0]?.dueLabel).toContain("11:00");
    expect(getBondDetail(db, created.data.bondId, stranger.user.id, "UTC")).toBeNull();

    const taskId = minaView?.commitments[0]?.id ?? "";
    expect(acceptCommitment(db, stranger.user.id, taskId).ok).toBe(false);
    const preview = publicPreview(db, created.data.sharePath.replace("/b/", ""));
    expect(JSON.stringify(preview)).not.toContain(mina.user.id);
    expect(preview?.votePrompt).toBe("Add snacks?");
    expect(JSON.stringify(preview)).not.toContain("\"yes\"");
  });

  it("does not duplicate two acceptance requests", () => {
    const db = createTestDb();
    const organizer = createMemberRecord(db, "Avery Lane", "UTC");
    if (!organizer.ok) throw new Error("setup");
    const created = createBond(db, organizer.user.id, {
      ...plan,
      people: [],
      commitments: [{ title: "Book the table", assigneeIndex: null, dueLocal: "2026-12-02T12:00" }],
    });
    if (!created.ok) throw new Error(created.message);
    const detail = getBondDetail(db, created.data.bondId, organizer.user.id, "UTC");
    const taskId = detail?.commitments[0]?.id ?? "";
    const first = acceptCommitment(db, organizer.user.id, taskId);
    const second = acceptCommitment(db, organizer.user.id, taskId);
    expect(first.ok && first.duplicate).toBe(false);
    expect(second.ok && second.duplicate).toBe(true);
    expect(db.select().from(acceptances).all()).toHaveLength(1);
    if (first.ok && second.ok) expect(second.acceptanceId).toBe(first.acceptanceId);
  });

  it("keeps a declined person out and refuses the sample", () => {
    const db = createTestDb();
    const organizer = createMemberRecord(db, "Avery Lane", "UTC");
    const mina = createMemberRecord(db, "Mina Cole", "UTC");
    if (!organizer.ok || !mina.ok) throw new Error("setup");
    const created = createBond(db, organizer.user.id, plan);
    if (!created.ok) throw new Error(created.message);
    const slot = openSlots(db, created.data.sharePath.replace("/b/", ""))?.slots[0];
    if (!slot) throw new Error("slot");
    const declined = joinBond(db, mina.user.id, {
      token: created.data.sharePath.replace("/b/", ""),
      slotId: slot.id,
      decision: "decline",
      commitmentIds: [],
    });
    expect(declined.ok && declined.access).toBe(false);
    expect(getBondDetail(db, created.data.bondId, mina.user.id, "UTC")).toBeNull();

    seedDemo(db);
    const sample = openSlots(db, sampleSharePath().replace("/b/", ""));
    const sampleSlot = sample?.slots[0];
    expect(sample?.demo).toBe(true);
    if (!sampleSlot) throw new Error("sample slot");
    const blocked = joinBond(db, mina.user.id, {
      token: sampleSharePath().replace("/b/", ""),
      slotId: sampleSlot.id,
      decision: "accept",
      commitmentIds: sampleSlot.commitments.map((task) => task.id),
    });
    expect(blocked.ok).toBe(false);
    expect(getBondDetail(db, SAMPLE_BOND_ID, mina.user.id, "UTC")).toBeNull();
  });

  it("counts one vote and refuses a silent change", () => {
    const db = createTestDb();
    const organizer = createMemberRecord(db, "Avery Lane", "UTC");
    if (!organizer.ok) throw new Error("setup");
    const created = createBond(db, organizer.user.id, {
      ...plan,
      people: [],
      commitments: [{ title: "Book the table", assigneeIndex: null, dueLocal: "2026-12-02T12:00" }],
    });
    if (!created.ok) throw new Error(created.message);
    const questionId = db.select().from(voteQuestions).all()[0]?.id;
    expect(questionId).toBeTruthy();
    if (!questionId) return;
    expect(castVote(db, organizer.user.id, questionId, "yes").ok).toBe(true);
    expect(castVote(db, organizer.user.id, questionId, "yes").ok).toBe(true);
    const changed = castVote(db, organizer.user.id, questionId, "no");
    expect(changed.ok).toBe(false);
    expect(db.select().from(decisions).all()).toHaveLength(1);
  });
});
