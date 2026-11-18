import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import type { BondDb } from "@/lib/db/client";
import { bonds, commitments, members, reminders, users } from "@/lib/db/schema";
import { recordEvent } from "@/lib/audit";
import { formatInZone, localDateInZone, nowIso } from "@/lib/time";

const DAY_MS = 24 * 60 * 60 * 1000;

export function setReminderOptIn(db: BondDb, userId: string, optedIn: boolean) {
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!user || user.kind !== "member") return { ok: false as const, message: "That profile cannot change reminders." };
  db.update(users)
    .set({ reminderOptIn: optedIn ? 1 : 0 })
    .where(eq(users.id, userId))
    .run();
  if (!optedIn) db.delete(reminders).where(eq(reminders.userId, userId)).run();
  recordEvent(db, userId, "reminder_opt_in", { optedIn });
  return { ok: true as const, optedIn };
}

export function syncReminders(db: BondDb, userId: string, now = new Date()) {
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!user || user.kind === "deleted" || user.reminderOptIn !== 1) {
    db.delete(reminders).where(eq(reminders.userId, userId)).run();
    return [];
  }
  const memberships = db
    .select()
    .from(members)
    .where(and(eq(members.userId, userId), eq(members.invitationStatus, "accepted")))
    .all();
  if (memberships.length === 0) return [];
  const bondIds = memberships.map((membership) => membership.bondId);
  const bondRows = db.select().from(bonds).where(inArray(bonds.id, bondIds)).all();
  const activeIds = bondRows.filter((bond) => bond.status === "active" && bond.demo === 0).map((bond) => bond.id);
  if (activeIds.length === 0) return [];
  const people = db.select().from(members).where(inArray(members.bondId, activeIds)).all();
  const tasks = db
    .select()
    .from(commitments)
    .where(inArray(commitments.bondId, activeIds))
    .all()
    .filter((task) => task.status === "open");
  const titles = new Map(bondRows.map((bond) => [bond.id, bond.title]));

  for (const task of tasks) {
    const assignee = people.find((person) => person.id === task.assignedMemberId);
    const organizer = people.find((person) => person.bondId === task.bondId && person.role === "organizer");
    const involved = assignee?.userId === userId || organizer?.userId === userId;
    if (!involved) continue;
    const due = Date.parse(task.dueAt);
    const kind = due < now.getTime() ? "overdue" : due - now.getTime() <= DAY_MS ? "due_soon" : null;
    if (!kind) continue;
    const dueOn = localDateInZone(task.dueAt, user.timezone);
    if (!dueOn) continue;
    db.insert(reminders)
      .values({
        id: randomUUID(),
        userId,
        commitmentId: task.id,
        bondId: task.bondId,
        kind,
        dueOn,
        createdAt: nowIso(),
      })
      .onConflictDoNothing()
      .run();
  }

  const names = new Map(people.map((person) => [person.id, person.invitedName]));
  const rows = db.select().from(reminders).where(eq(reminders.userId, userId)).all();
  return rows
    .map((row) => {
      const task = tasks.find((item) => item.id === row.commitmentId);
      if (!task) return null;
      return {
        id: row.id,
        kind: row.kind,
        dueOn: row.dueOn,
        title: task.title,
        bondTitle: titles.get(row.bondId) ?? "Bond",
        dueLabel: formatInZone(task.dueAt, user.timezone),
        assigneeLabel: (task.assignedMemberId && names.get(task.assignedMemberId)) || "Unassigned",
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((a, b) => a.dueLabel.localeCompare(b.dueLabel));
}
