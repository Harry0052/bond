import { and, eq, inArray } from "drizzle-orm";
import type { BondDb } from "@/lib/db/client";
import { acceptances, bondEvents, bonds, commitments, members, users } from "@/lib/db/schema";
import { humanizeEvent, recordBondEvent } from "@/lib/bonds/events";
import { syncBondStatus } from "@/lib/bonds/service";
import { dueWithinRange, nowIso, zonedLocalToUtc } from "@/lib/time";
import { z } from "zod";

function fail(message: string) {
  return { ok: false as const, message };
}

function loadActor(db: BondDb, userId: string, bondId: string) {
  const bond = db.select().from(bonds).where(eq(bonds.id, bondId)).get();
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  const member = db
    .select()
    .from(members)
    .where(and(eq(members.bondId, bondId), eq(members.userId, userId), eq(members.invitationStatus, "accepted")))
    .get();
  return { bond, user, member };
}

export function completeCommitment(db: BondDb, userId: string, commitmentId: string) {
  const task = db.select().from(commitments).where(eq(commitments.id, commitmentId)).get();
  if (!task) return fail("That commitment is not on a bond you can see.");
  const { bond, user, member } = loadActor(db, userId, task.bondId);
  if (!bond || !user || user.kind !== "member" || !member) return fail("You are not on this bond.");
  if (bond.demo === 1) return fail("This is a sample bond. Changes are turned off.");
  if (bond.status !== "active" || task.status !== "open") return fail("That commitment is not open.");
  const assignee = db.select().from(members).where(eq(members.id, task.assignedMemberId ?? "")).get();
  const allowed = member.id === task.assignedMemberId || member.role === "organizer";
  if (!allowed) return fail("Only the person named on it, or the organizer, can mark it done.");
  const acceptance = assignee
    ? db
        .select()
        .from(acceptances)
        .where(
          and(
            eq(acceptances.commitmentId, task.id),
            eq(acceptances.memberId, assignee.id),
            eq(acceptances.revision, task.revision),
          ),
        )
        .get()
    : null;
  if (!acceptance) return fail("This version has not been accepted yet.");
  const completedAt = nowIso();
  db.update(commitments)
    .set({ status: "done", completedAt, completedBy: userId, updatedAt: completedAt })
    .where(eq(commitments.id, task.id))
    .run();
  recordBondEvent(db, bond.id, userId, "commitment_completed", { actorName: user.displayName, title: task.title });
  syncBondStatus(db, bond.id);
  return { ok: true as const, completedAt };
}

const reviseSchema = z
  .object({
    title: z.string().trim().min(3).max(80),
    dueLocal: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
    assigneeMemberId: z.string().uuid(),
  })
  .strict();

export function reviseCommitment(
  db: BondDb,
  userId: string,
  commitmentId: string,
  input: { title: string; dueLocal: string; assigneeMemberId: string },
) {
  const parsed = reviseSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the change and try again.");
  const task = db.select().from(commitments).where(eq(commitments.id, commitmentId)).get();
  if (!task) return fail("That commitment is not on a bond you can see.");
  const { bond, user, member } = loadActor(db, userId, task.bondId);
  if (!bond || !user || !member || member.role !== "organizer") return fail("Only the organizer can change a commitment.");
  if (bond.demo === 1) return fail("This is a sample bond. Changes are turned off.");
  if (bond.status === "cancelled") return fail("This bond was cancelled.");
  const assignee = db
    .select()
    .from(members)
    .where(and(eq(members.id, parsed.data.assigneeMemberId), eq(members.bondId, bond.id)))
    .get();
  if (!assignee || assignee.invitationStatus === "removed" || assignee.invitationStatus === "declined") {
    return fail("Choose someone who is still on this bond.");
  }
  const dueAt = zonedLocalToUtc(parsed.data.dueLocal, user.timezone);
  if (!dueAt || !dueWithinRange(dueAt)) return fail("Enter a date and time in the last two years or the next five.");
  const material =
    parsed.data.title !== task.title || dueAt !== task.dueAt || assignee.id !== task.assignedMemberId;
  if (!material) return { ok: true as const, changed: false, revision: task.revision };
  const updatedAt = nowIso();
  const revision = task.revision + 1;
  db.update(commitments)
    .set({
      title: parsed.data.title,
      dueAt,
      assignedMemberId: assignee.id,
      revision,
      status: "open",
      completedAt: null,
      completedBy: null,
      updatedAt,
    })
    .where(eq(commitments.id, task.id))
    .run();
  recordBondEvent(db, bond.id, userId, "revision_proposed", {
    actorName: user.displayName,
    title: parsed.data.title,
    revision,
  });
  syncBondStatus(db, bond.id);
  return { ok: true as const, changed: true, revision };
}

export function removeMember(db: BondDb, userId: string, bondId: string, memberId: string) {
  const { bond, user, member } = loadActor(db, userId, bondId);
  if (!bond || !user || !member || member.role !== "organizer") return fail("Only the organizer can remove a person.");
  if (bond.demo === 1) return fail("This is a sample bond. Changes are turned off.");
  const target = db.select().from(members).where(and(eq(members.id, memberId), eq(members.bondId, bondId))).get();
  if (!target) return fail("That person is not on this bond.");
  if (target.role === "organizer") return fail("The organizer stays on the bond.");
  if (target.invitationStatus === "removed") return { ok: true as const, already: true };
  db.update(members)
    .set({ invitationStatus: "removed", updatedAt: nowIso() })
    .where(eq(members.id, target.id))
    .run();
  recordBondEvent(db, bondId, userId, "member_removed", {
    actorName: user.displayName,
    invitedName: target.invitedName,
  });
  return { ok: true as const, already: false };
}

export function listActivity(db: BondDb, userId: string, timeZone: string) {
  const memberships = db
    .select()
    .from(members)
    .where(and(eq(members.userId, userId), eq(members.invitationStatus, "accepted")))
    .all();
  if (memberships.length === 0) return [];
  const bondIds = memberships.map((membership) => membership.bondId);
  const bondRows = db.select().from(bonds).where(inArray(bonds.id, bondIds)).all();
  const titles = new Map(bondRows.map((bond) => [bond.id, bond.title]));
  return db
    .select()
    .from(bondEvents)
    .where(inArray(bondEvents.bondId, bondIds))
    .all()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 40)
    .map((event) => ({
      id: event.id,
      bondId: event.bondId,
      bondTitle: titles.get(event.bondId) ?? "Bond",
      sentence: humanizeEvent(event.eventType, event.payloadJson, event.createdAt, timeZone),
    }));
}
