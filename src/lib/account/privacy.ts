import { eq } from "drizzle-orm";
import { recordEvent } from "@/lib/audit";
import type { BondDb } from "@/lib/db/client";
import { bondEvents, bonds, commitments, members, reminders, sessions, templates, users } from "@/lib/db/schema";
import { nowIso } from "@/lib/time";

export function exportAccount(db: BondDb, userId: string) {
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!user || user.kind === "deleted") return null;
  const memberships = db.select().from(members).where(eq(members.userId, userId)).all();
  const visible = memberships.filter((membership) => membership.invitationStatus === "accepted");
  const bondRows = visible
    .map((membership) => db.select().from(bonds).where(eq(bonds.id, membership.bondId)).get())
    .filter((bond): bond is NonNullable<typeof bond> => Boolean(bond));

  return {
    exportedAt: nowIso(),
    profile: {
      displayName: user.displayName,
      timezone: user.timezone,
      reminderOptIn: user.reminderOptIn === 1,
    },
    bonds: bondRows.map((bond) => ({
      title: bond.title,
      purpose: bond.purpose,
      status: bond.status,
      demo: bond.demo === 1,
      members: db
        .select()
        .from(members)
        .where(eq(members.bondId, bond.id))
        .all()
        .map((member) => ({
          name: member.invitedName,
          status: member.invitationStatus,
          role: member.role,
        })),
      commitments: db
        .select()
        .from(commitments)
        .where(eq(commitments.bondId, bond.id))
        .all()
        .map((task) => ({
          title: task.title,
          dueAt: task.dueAt,
          status: task.status,
          revision: task.revision,
        })),
      events: db
        .select()
        .from(bondEvents)
        .where(eq(bondEvents.bondId, bond.id))
        .all()
        .map((event) => ({ type: event.eventType, at: event.createdAt })),
    })),
    templates: db
      .select()
      .from(templates)
      .where(eq(templates.ownerId, userId))
      .all()
      .map((row) => ({ title: row.title, purpose: row.purpose, body: row.bodyJson })),
    reminders: db
      .select()
      .from(reminders)
      .where(eq(reminders.userId, userId))
      .all()
      .map((row) => ({ kind: row.kind, dueOn: row.dueOn })),
  };
}

export function deleteAccount(db: BondDb, userId: string) {
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!user || user.kind === "deleted") return { ok: false as const, message: "That profile is already gone." };
  const updatedAt = nowIso();
  db.update(users)
    .set({ kind: "deleted", displayName: "Removed member", reminderOptIn: 0 })
    .where(eq(users.id, userId))
    .run();
  db.delete(sessions).where(eq(sessions.userId, userId)).run();
  db.update(members)
    .set({ invitationStatus: "removed", updatedAt })
    .where(eq(members.userId, userId))
    .run();
  db.delete(templates).where(eq(templates.ownerId, userId)).run();
  db.delete(reminders).where(eq(reminders.userId, userId)).run();
  recordEvent(db, userId, "account_deleted", {});
  return { ok: true as const };
}
