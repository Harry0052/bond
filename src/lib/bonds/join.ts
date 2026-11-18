import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import type { BondDb } from "@/lib/db/client";
import { acceptances, bonds, commitments, decisions, members, users, voteQuestions } from "@/lib/db/schema";
import { recordBondEvent } from "@/lib/bonds/events";
import { checkShareToken } from "@/lib/bonds/tokens";
import { nowIso } from "@/lib/time";
import { displayNameSchema } from "@/lib/validators/profile";

function fail(message: string) {
  return { ok: false as const, message };
}

export type JoinSlot = {
  id: string;
  name: string;
  commitments: Array<{ id: string; title: string; dueAt: string }>;
};

export function openSlots(db: BondDb, token: string) {
  const checked = checkShareToken(token);
  if (!checked.ok) return null;
  const bond = db
    .select()
    .from(bonds)
    .where(and(eq(bonds.id, checked.bondId), eq(bonds.shareTokenHash, checked.tokenHash)))
    .get();
  if (!bond) return null;
  const people = db.select().from(members).where(eq(members.bondId, bond.id)).all();
  const tasks = db.select().from(commitments).where(eq(commitments.bondId, bond.id)).all();
  const question = db.select().from(voteQuestions).where(eq(voteQuestions.bondId, bond.id)).get();
  return {
    demo: bond.demo === 1,
    status: bond.status,
    votePrompt: question?.prompt ?? null,
    slots: people
      .filter((person) => person.invitationStatus === "invited" && !person.userId)
      .map((person) => ({
        id: person.id,
        name: person.invitedName,
        commitments: tasks
          .filter((task) => task.assignedMemberId === person.id)
          .map((task) => ({ id: task.id, title: task.title, dueAt: task.dueAt })),
      })),
  };
}

export function joinBond(
  db: BondDb,
  userId: string,
  input: { token: string; slotId: string; decision: "accept" | "decline"; commitmentIds: string[] },
) {
  const sheet = openSlots(db, input.token);
  if (!sheet) return fail("This link does not match a bond.");
  const checked = checkShareToken(input.token);
  if (!checked.ok) return fail("This link does not match a bond.");
  const bond = db.select().from(bonds).where(eq(bonds.id, checked.bondId)).get();
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!bond || !user || user.kind !== "member") return fail("Save your name before joining.");
  if (bond.demo === 1) return fail("This is a sample bond. Joining is turned off.");
  if (bond.status === "cancelled") return fail("This bond was cancelled.");
  const already = db
    .select()
    .from(members)
    .where(and(eq(members.bondId, bond.id), eq(members.userId, userId)))
    .get();
  if (already) return fail("You are already on this bond.");
  const slot = sheet.slots.find((item) => item.id === input.slotId);
  if (!slot) return fail("That name was already taken. Pick another, or ask the organizer.");

  if (input.decision === "decline") {
    const updated = db
      .update(members)
      .set({
        userId,
        invitedName: user.displayName,
        invitationStatus: "declined",
        updatedAt: nowIso(),
      })
      .where(and(eq(members.id, slot.id), eq(members.invitationStatus, "invited")))
      .run();
    if (updated.changes !== 1) return fail("That name was already taken. Pick another, or ask the organizer.");
    recordBondEvent(db, bond.id, userId, "member_declined", { actorName: user.displayName });
    return { ok: true as const, bondId: bond.id, access: false as const };
  }

  const expected = new Set(slot.commitments.map((task) => task.id));
  const chosen = new Set(input.commitmentIds);
  if (expected.size !== chosen.size || [...expected].some((id) => !chosen.has(id))) {
    return fail("Accept each commitment on your name, or decline the bond.");
  }

  const createdAt = nowIso();
  const updated = db
    .update(members)
    .set({
      userId,
      invitedName: user.displayName,
      invitationStatus: "accepted",
      updatedAt: createdAt,
    })
    .where(and(eq(members.id, slot.id), eq(members.invitationStatus, "invited")))
    .run();
  if (updated.changes !== 1) return fail("That name was already taken. Pick another, or ask the organizer.");

  for (const task of slot.commitments) {
    const row = db.select().from(commitments).where(eq(commitments.id, task.id)).get();
    if (!row) continue;
    db.insert(acceptances)
      .values({
        id: randomUUID(),
        commitmentId: row.id,
        memberId: slot.id,
        revision: row.revision,
        createdAt,
      })
      .run();
    recordBondEvent(db, bond.id, userId, "commitment_accepted", { actorName: user.displayName, title: row.title });
  }
  recordBondEvent(db, bond.id, userId, "member_joined", { actorName: user.displayName });
  return { ok: true as const, bondId: bond.id, access: true as const };
}

export function acceptCommitment(db: BondDb, userId: string, commitmentId: string) {
  const task = db.select().from(commitments).where(eq(commitments.id, commitmentId)).get();
  if (!task) return fail("That commitment is not on a bond you can see.");
  const bond = db.select().from(bonds).where(eq(bonds.id, task.bondId)).get();
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!bond || !user || user.kind !== "member") return fail("Save your name before accepting.");
  if (bond.demo === 1) return fail("This is a sample bond. Changes are turned off.");
  if (bond.status !== "active") return fail("This bond is not open for acceptance.");
  const member = db
    .select()
    .from(members)
    .where(and(eq(members.bondId, bond.id), eq(members.userId, userId), eq(members.invitationStatus, "accepted")))
    .get();
  if (!member) return fail("You are not on this bond.");
  if (member.id !== task.assignedMemberId) return fail("Only the person named on this commitment can accept it.");

  const existing = db
    .select()
    .from(acceptances)
    .where(
      and(
        eq(acceptances.commitmentId, task.id),
        eq(acceptances.memberId, member.id),
        eq(acceptances.revision, task.revision),
      ),
    )
    .get();
  if (existing) return { ok: true as const, acceptanceId: existing.id, duplicate: true };

  const acceptanceId = randomUUID();
  try {
    db.insert(acceptances)
      .values({
        id: acceptanceId,
        commitmentId: task.id,
        memberId: member.id,
        revision: task.revision,
        createdAt: nowIso(),
      })
      .run();
  } catch (error) {
    if (String(error).includes("UNIQUE")) {
      const row = db
        .select()
        .from(acceptances)
        .where(
          and(
            eq(acceptances.commitmentId, task.id),
            eq(acceptances.memberId, member.id),
            eq(acceptances.revision, task.revision),
          ),
        )
        .get();
      if (row) return { ok: true as const, acceptanceId: row.id, duplicate: true };
    }
    throw error;
  }
  recordBondEvent(db, bond.id, userId, "commitment_accepted", { actorName: user.displayName, title: task.title });
  return { ok: true as const, acceptanceId, duplicate: false };
}

export function addPerson(db: BondDb, userId: string, bondId: string, name: string) {
  const parsed = displayNameSchema.safeParse(name);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Enter a name.");
  const bond = db.select().from(bonds).where(eq(bonds.id, bondId)).get();
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!bond || !user) return fail("That bond is not available.");
  if (bond.demo === 1) return fail("This is a sample bond. Changes are turned off.");
  if (bond.status !== "active") return fail("This bond is not open for new people.");
  const organizer = db
    .select()
    .from(members)
    .where(
      and(
        eq(members.bondId, bondId),
        eq(members.userId, userId),
        eq(members.invitationStatus, "accepted"),
        eq(members.role, "organizer"),
      ),
    )
    .get();
  if (!organizer) return fail("Only the organizer can add a person.");
  const createdAt = nowIso();
  const id = randomUUID();
  db.insert(members)
    .values({
      id,
      bondId,
      userId: null,
      invitedName: parsed.data,
      invitationStatus: "invited",
      role: "participant",
      createdAt,
      updatedAt: createdAt,
    })
    .run();
  recordBondEvent(db, bondId, userId, "member_invited", { actorName: user.displayName, invitedName: parsed.data });
  return { ok: true as const, memberId: id };
}

export function castVote(db: BondDb, userId: string, questionId: string, vote: "yes" | "no") {
  const question = db.select().from(voteQuestions).where(eq(voteQuestions.id, questionId)).get();
  if (!question) return fail("That question is not on a bond you can see.");
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  const bond = db.select().from(bonds).where(eq(bonds.id, question.bondId)).get();
  if (!user || !bond || bond.demo === 1) return fail("That question cannot be voted on.");
  const member = db
    .select()
    .from(members)
    .where(
      and(eq(members.bondId, bond.id), eq(members.userId, userId), eq(members.invitationStatus, "accepted")),
    )
    .get();
  if (!member) return fail("Join the bond before voting.");
  const existing = db
    .select()
    .from(decisions)
    .where(and(eq(decisions.questionId, questionId), eq(decisions.memberId, member.id)))
    .get();
  if (existing) {
    if (existing.vote === vote) return { ok: true as const, duplicate: true };
    return fail("You already voted. Bond does not change a vote.");
  }
  try {
    db.insert(decisions)
      .values({
        id: randomUUID(),
        bondId: bond.id,
        questionId,
        memberId: member.id,
        vote,
        createdAt: nowIso(),
      })
      .run();
  } catch (error) {
    if (String(error).includes("UNIQUE")) return { ok: true as const, duplicate: true };
    throw error;
  }
  recordBondEvent(db, bond.id, userId, "vote_cast", { actorName: user.displayName });
  return { ok: true as const, duplicate: false };
}

export function questionSummary(db: BondDb, bondId: string, memberId: string | null) {
  const questions = db.select().from(voteQuestions).where(eq(voteQuestions.bondId, bondId)).all();
  if (questions.length === 0) return [];
  const votes = db
    .select()
    .from(decisions)
    .where(
      inArray(
        decisions.questionId,
        questions.map((question) => question.id),
      ),
    )
    .all();
  return questions.map((question) => ({
    id: question.id,
    prompt: question.prompt,
    yes: votes.filter((row) => row.questionId === question.id && row.vote === "yes").length,
    no: votes.filter((row) => row.questionId === question.id && row.vote === "no").length,
    yours: votes.find((row) => row.questionId === question.id && row.memberId === memberId)?.vote ?? null,
  }));
}
