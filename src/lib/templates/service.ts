import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { BondDb } from "@/lib/db/client";
import { bonds, commitments, members, templates, users, voteQuestions } from "@/lib/db/schema";
import { createBond } from "@/lib/bonds/service";
import { nowIso, wallClock } from "@/lib/time";

type TemplateBody = {
  purpose: string;
  people: string[];
  commitments: Array<{ title: string; assignee: "self" | string; offsetMinutes: number }>;
  votePrompt: string | null;
};

function fail(message: string) {
  return { ok: false as const, message };
}

export function saveTemplate(db: BondDb, userId: string, bondId: string) {
  const bond = db.select().from(bonds).where(eq(bonds.id, bondId)).get();
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!bond || !user || bond.demo === 1) return fail("That bond cannot be saved as a template.");
  const organizer = db
    .select()
    .from(members)
    .where(
      and(
        eq(members.bondId, bondId),
        eq(members.userId, userId),
        eq(members.role, "organizer"),
        eq(members.invitationStatus, "accepted"),
      ),
    )
    .get();
  if (!organizer) return fail("Only the organizer can save a template.");
  const people = db.select().from(members).where(eq(members.bondId, bondId)).all();
  const tasks = db.select().from(commitments).where(eq(commitments.bondId, bondId)).all();
  const question = db.select().from(voteQuestions).where(eq(voteQuestions.bondId, bondId)).get();
  const created = Date.parse(bond.createdAt);
  const body: TemplateBody = {
    purpose: bond.purpose,
    people: people.filter((person) => person.role !== "organizer").map((person) => person.invitedName),
    commitments: tasks.map((task) => {
      const assignee = people.find((person) => person.id === task.assignedMemberId);
      return {
        title: task.title,
        assignee: !assignee || assignee.role === "organizer" ? "self" : assignee.invitedName,
        offsetMinutes: Math.round((Date.parse(task.dueAt) - created) / 60000),
      };
    }),
    votePrompt: question?.prompt ?? null,
  };
  const id = randomUUID();
  db.insert(templates)
    .values({
      id,
      ownerId: userId,
      title: bond.title,
      purpose: bond.purpose,
      bodyJson: JSON.stringify(body),
      createdAt: nowIso(),
    })
    .run();
  return { ok: true as const, templateId: id };
}

export function listTemplates(db: BondDb, userId: string) {
  return db
    .select()
    .from(templates)
    .where(eq(templates.ownerId, userId))
    .all()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((row) => ({ id: row.id, title: row.title, purpose: row.purpose }));
}

export function createFromTemplate(db: BondDb, userId: string, templateId: string, now = new Date()) {
  const row = db.select().from(templates).where(and(eq(templates.id, templateId), eq(templates.ownerId, userId))).get();
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!row || !user || user.kind !== "member") return fail("That template is not yours.");
  let body: TemplateBody;
  try {
    body = JSON.parse(row.bodyJson) as TemplateBody;
  } catch {
    return fail("That template could not be read.");
  }
  const people = body.people.map((name) => ({ name }));
  const commitments = body.commitments.map((task) => {
    const due = new Date(now.getTime() + task.offsetMinutes * 60 * 1000);
    const dueLocal = wallClock(due, user.timezone);
    const assigneeIndex = task.assignee === "self" ? null : body.people.indexOf(task.assignee);
    return {
      title: task.title,
      assigneeIndex: assigneeIndex === -1 ? null : assigneeIndex,
      dueLocal: dueLocal ?? "",
    };
  });
  return createBond(db, userId, {
    title: row.title,
    purpose: body.purpose,
    people,
    commitments,
    votePrompt: body.votePrompt ?? undefined,
  });
}
