import { and, eq } from "drizzle-orm";
import type { BondDb } from "@/lib/db/client";
import { bonds, commitments, members } from "@/lib/db/schema";
import { checkShareToken, shareSigning } from "@/lib/bonds/tokens";

export type PublicPreview = {
  title: string;
  purpose: string;
  status: "active" | "completed" | "cancelled";
  demo: boolean;
  shareKeySource: "env" | "local-fallback";
  counts: { invited: number; accepted: number; declined: number };
  namesOnTheCard: string[];
  commitments: Array<{
    title: string;
    dueAt: string;
    assigneeLabel: string;
    status: string;
  }>;
};

const PUBLIC_STATUSES = new Set(["invited", "accepted"]);

export function publicPreview(db: BondDb, token: string): PublicPreview | null {
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
  const visible = people.filter((person) => PUBLIC_STATUSES.has(person.invitationStatus));
  const labels = new Map(visible.map((person) => [person.id, person.invitedName]));
  return {
    title: bond.title,
    purpose: bond.purpose,
    status: bond.status as PublicPreview["status"],
    demo: bond.demo === 1,
    shareKeySource: shareSigning().source,
    counts: {
      invited: people.filter((person) => person.invitationStatus === "invited").length,
      accepted: people.filter((person) => person.invitationStatus === "accepted").length,
      declined: people.filter((person) => person.invitationStatus === "declined").length,
    },
    namesOnTheCard: visible.map((person) => person.invitedName),
    commitments: tasks
      .slice()
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
      .map((task) => ({
        title: task.title,
        dueAt: task.dueAt,
        assigneeLabel: (task.assignedMemberId && labels.get(task.assignedMemberId)) || "Unassigned",
        status: task.status,
      })),
  };
}
