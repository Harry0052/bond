import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import type { BondDb } from "@/lib/db/client";
import { acceptances, bondEvents, bonds, commitments, members, users, voteQuestions } from "@/lib/db/schema";
import { humanizeEvent, recordBondEvent } from "@/lib/bonds/events";
import { publicPreview, type PublicPreview } from "@/lib/bonds/preview";
import { SAMPLE_BOND_ID, SAMPLE_NONCE } from "@/lib/bonds/sample";
import { issueShareToken, shareSigning, tokenFromStored } from "@/lib/bonds/tokens";
import { dueWithinRange, formatInZone, nowIso, zonedLocalToUtc } from "@/lib/time";
import { createBondSchema, type CreateBondInput } from "@/lib/validators/bonds";

export type CreatedBond = {
  bondId: string;
  sharePath: string;
  reused: boolean;
};

export function sharePathFor(bondId: string, nonce: string) {
  return `/b/${tokenFromStored(bondId, nonce)}`;
}

export function acceptedMembership(db: BondDb, bondId: string, userId: string) {
  return (
    db
      .select()
      .from(members)
      .where(and(eq(members.bondId, bondId), eq(members.userId, userId), eq(members.invitationStatus, "accepted")))
      .get() ?? null
  );
}

function fail(message: string, fields?: Record<string, string>) {
  return { ok: false as const, message, fields };
}

export function createBond(db: BondDb, userId: string, input: CreateBondInput, idempotencyKey?: string | null) {
  const parsed = createBondSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = String(issue?.path[0] ?? "form");
    const message = issue?.message ?? "Check the form and try again.";
    return fail(message, { [field]: message });
  }
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!user || user.kind !== "member") return fail("Save your name before making a bond.");

  if (idempotencyKey) {
    const existing = findIdempotent(db, userId, idempotencyKey);
    if (existing) return { ok: true as const, data: existing };
  }

  const dues: string[] = [];
  for (const commitment of parsed.data.commitments) {
    const utc = zonedLocalToUtc(commitment.dueLocal, user.timezone);
    if (!utc || !dueWithinRange(utc)) {
      return fail("Enter a date and time in the last two years or the next five.", {
        commitments: "Enter a date and time in the last two years or the next five.",
      });
    }
    dues.push(utc);
  }

  const bondId = randomUUID();
  const share = issueShareToken(bondId);
  const createdAt = nowIso();

  try {
    db.transaction((tx) => {
      tx.insert(bonds)
        .values({
          id: bondId,
          creatorId: userId,
          title: parsed.data.title,
          purpose: parsed.data.purpose,
          status: "active",
          shareTokenHash: share.tokenHash,
          shareNonce: share.nonce,
          demo: 0,
          idempotencyKey: idempotencyKey || null,
          createdAt,
          updatedAt: createdAt,
        })
        .run();

      const organizerMemberId = randomUUID();
      tx.insert(members)
        .values({
          id: organizerMemberId,
          bondId,
          userId,
          invitedName: user.displayName,
          invitationStatus: "accepted",
          role: "organizer",
          createdAt,
          updatedAt: createdAt,
        })
        .run();

      const invitedIds = parsed.data.people.map((person) => {
        const id = randomUUID();
        tx.insert(members)
          .values({
            id,
            bondId,
            userId: null,
            invitedName: person.name,
            invitationStatus: "invited",
            role: "participant",
            createdAt,
            updatedAt: createdAt,
          })
          .run();
        return id;
      });

      parsed.data.commitments.forEach((commitment, index) => {
        const assigned = commitment.assigneeIndex === null ? organizerMemberId : invitedIds[commitment.assigneeIndex];
        tx.insert(commitments)
          .values({
            id: randomUUID(),
            bondId,
            assignedMemberId: assigned ?? null,
            title: commitment.title,
            dueAt: dues[index] ?? createdAt,
            status: "open",
            revision: 1,
            createdAt,
            updatedAt: createdAt,
          })
          .run();
      });

      const writer = tx as unknown as BondDb;
      recordBondEvent(writer, bondId, userId, "bond_created", { actorName: user.displayName });
      for (const person of parsed.data.people) {
        recordBondEvent(writer, bondId, userId, "member_invited", {
          actorName: user.displayName,
          invitedName: person.name,
        });
      }
      const prompt = parsed.data.votePrompt?.trim();
      if (prompt) {
        tx.insert(voteQuestions)
          .values({ id: randomUUID(), bondId, prompt, createdAt })
          .run();
      }
    });
  } catch (error) {
    if (idempotencyKey && String(error).includes("idempotency")) {
      const existing = findIdempotent(db, userId, idempotencyKey);
      if (existing) return { ok: true as const, data: existing };
    }
    throw error;
  }

  return {
    ok: true as const,
    data: { bondId, sharePath: sharePathFor(bondId, share.nonce), reused: false } satisfies CreatedBond,
  };
}

function findIdempotent(db: BondDb, userId: string, idempotencyKey: string): CreatedBond | null {
  const existing = db
    .select()
    .from(bonds)
    .where(and(eq(bonds.creatorId, userId), eq(bonds.idempotencyKey, idempotencyKey)))
    .get();
  if (!existing) return null;
  return { bondId: existing.id, sharePath: sharePathFor(existing.id, existing.shareNonce), reused: true };
}

export function syncBondStatus(db: BondDb, bondId: string) {
  const bond = db.select().from(bonds).where(eq(bonds.id, bondId)).get();
  if (!bond || bond.status === "cancelled") return bond?.status ?? "active";
  const rows = db.select().from(commitments).where(eq(commitments.bondId, bondId)).all();
  const next = rows.length > 0 && rows.every((row) => row.status !== "open") ? "completed" : "active";
  if (bond.status !== next) {
    db.update(bonds).set({ status: next, updatedAt: nowIso() }).where(eq(bonds.id, bondId)).run();
  }
  return next;
}

export type HomeBond = {
  id: string;
  title: string;
  purpose: string;
  status: string;
  demo: boolean;
  doneCount: number;
  totalCount: number;
  nextDueLabel: string | null;
};

export type HomeCommitment = {
  id: string;
  bondId: string;
  bondTitle: string;
  title: string;
  dueAt: string;
  dueLabel: string;
  assigneeLabel: string;
};

export function listHome(db: BondDb, userId: string, timeZone: string) {
  const empty = { active: [] as HomeBond[], completed: [] as HomeBond[], upcoming: [] as HomeCommitment[] };
  const memberships = db
    .select()
    .from(members)
    .where(and(eq(members.userId, userId), eq(members.invitationStatus, "accepted")))
    .all();
  if (memberships.length === 0) return empty;
  const bondIds = memberships.map((membership) => membership.bondId);
  const bondRows = db.select().from(bonds).where(inArray(bonds.id, bondIds)).all();
  const taskRows = db.select().from(commitments).where(inArray(commitments.bondId, bondIds)).all();
  const memberRows = db.select().from(members).where(inArray(members.bondId, bondIds)).all();
  const names = new Map(memberRows.map((member) => [member.id, member.invitedName]));

  const cards = bondRows.map((bond) => {
    const tasks = taskRows.filter((task) => task.bondId === bond.id);
    const open = tasks.filter((task) => task.status === "open").sort((a, b) => a.dueAt.localeCompare(b.dueAt));
    return {
      sortKey: open[0]?.dueAt ?? "9999",
      card: {
        id: bond.id,
        title: bond.title,
        purpose: bond.purpose,
        status: bond.status,
        demo: bond.demo === 1,
        doneCount: tasks.filter((task) => task.status === "done").length,
        totalCount: tasks.length,
        nextDueLabel: open[0] ? formatInZone(open[0].dueAt, timeZone) : null,
      } satisfies HomeBond,
    };
  });

  const upcoming = taskRows
    .filter((task) => task.status === "open")
    .filter((task) => bondRows.some((bond) => bond.id === task.bondId && bond.status !== "cancelled"))
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
    .slice(0, 8)
    .map((task) => ({
      id: task.id,
      bondId: task.bondId,
      bondTitle: bondRows.find((bond) => bond.id === task.bondId)?.title ?? "Bond",
      title: task.title,
      dueAt: task.dueAt,
      dueLabel: formatInZone(task.dueAt, timeZone),
      assigneeLabel: (task.assignedMemberId && names.get(task.assignedMemberId)) || "Unassigned",
    }));

  return {
    active: cards
      .filter((entry) => entry.card.status === "active")
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map((entry) => entry.card),
    completed: cards.filter((entry) => entry.card.status === "completed").map((entry) => entry.card),
    upcoming,
  };
}

export type BondDetail = {
  id: string;
  title: string;
  purpose: string;
  status: string;
  demo: boolean;
  sharePath: string;
  shareKeySource: "env" | "local-fallback";
  members: Array<{ id: string; name: string; status: string; role: string; isYou: boolean }>;
  commitments: Array<{
    id: string;
    title: string;
    dueAt: string;
    dueLabel: string;
    status: string;
    assigneeName: string;
    assignedMemberId: string | null;
    revision: number;
    acceptedByYou: boolean;
    awaitingYou: boolean;
    acceptedForVersion: boolean;
    completedLabel: string | null;
  }>;
  events: string[];
  doneCount: number;
  totalCount: number;
};

export function getBondDetail(db: BondDb, bondId: string, userId: string, timeZone: string): BondDetail | null {
  const membership = acceptedMembership(db, bondId, userId);
  if (!membership) return null;
  const bond = db.select().from(bonds).where(eq(bonds.id, bondId)).get();
  if (!bond) return null;
  const people = db.select().from(members).where(eq(members.bondId, bondId)).all();
  const tasks = db
    .select()
    .from(commitments)
    .where(eq(commitments.bondId, bondId))
    .all()
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  const names = new Map(people.map((person) => [person.id, person.invitedName]));
  const mine = people.find((person) => person.userId === userId);
  const acceptanceRows =
    tasks.length === 0
      ? []
      : db
          .select()
          .from(acceptances)
          .where(
            inArray(
              acceptances.commitmentId,
              tasks.map((task) => task.id),
            ),
          )
          .all();
  const history = db
    .select()
    .from(bondEvents)
    .where(eq(bondEvents.bondId, bondId))
    .all()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 30);

  return {
    id: bond.id,
    title: bond.title,
    purpose: bond.purpose,
    status: bond.status,
    demo: bond.demo === 1,
    sharePath: sharePathFor(bond.id, bond.shareNonce),
    shareKeySource: shareSigning().source,
    members: people
      .filter((person) => person.invitationStatus !== "removed")
      .map((person) => ({
        id: person.id,
        name: person.invitedName,
        status: person.invitationStatus,
        role: person.role,
        isYou: person.userId === userId,
      })),
    commitments: tasks.map((task) => ({
      id: task.id,
      title: task.title,
      dueAt: task.dueAt,
      dueLabel: `${formatInZone(task.dueAt, timeZone)} · ${timeZone}`,
      status: task.status,
      assigneeName: (task.assignedMemberId && names.get(task.assignedMemberId)) || "Unassigned",
      assignedMemberId: task.assignedMemberId,
      revision: task.revision,
      acceptedByYou: acceptanceRows.some(
        (row) => row.commitmentId === task.id && row.memberId === mine?.id && row.revision === task.revision,
      ),
      awaitingYou: task.assignedMemberId === mine?.id,
      acceptedForVersion: acceptanceRows.some(
        (row) =>
          row.commitmentId === task.id && row.memberId === task.assignedMemberId && row.revision === task.revision,
      ),
      completedLabel: task.status === "done" && task.completedAt ? formatInZone(task.completedAt, timeZone) : null,
    })),
    events: history.map((event) => humanizeEvent(event.eventType, event.payloadJson, event.createdAt, timeZone)),
    doneCount: tasks.filter((task) => task.status === "done").length,
    totalCount: tasks.length,
  };
}

export function readPreview(db: BondDb, token: string): PublicPreview | null {
  return publicPreview(db, token);
}

export function sampleSharePath() {
  return sharePathFor(SAMPLE_BOND_ID, SAMPLE_NONCE);
}
