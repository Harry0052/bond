import { and, eq } from "drizzle-orm";
import type { BondDb } from "@/lib/db/client";
import { bonds, members } from "@/lib/db/schema";

const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;

/** Operator count for this server. Not shown as a public chart. */
export function northStar(db: BondDb, now = new Date()) {
  const bondRows = db.select().from(bonds).all().filter((bond) => bond.demo === 0);
  const creatorCounts = new Map<string, number>();
  let bondsWithTwoAcceptsIn48Hours = 0;
  for (const bond of bondRows) {
    creatorCounts.set(bond.creatorId, (creatorCounts.get(bond.creatorId) ?? 0) + 1);
    const accepted = db
      .select()
      .from(members)
      .where(and(eq(members.bondId, bond.id), eq(members.invitationStatus, "accepted")))
      .all();
    if (accepted.length < 2) continue;
    const second = accepted.map((member) => Date.parse(member.updatedAt)).sort((a, b) => a - b)[1] ?? 0;
    if (second - Date.parse(bond.createdAt) <= FORTY_EIGHT_HOURS) bondsWithTwoAcceptsIn48Hours += 1;
  }
  let repeatCreators = 0;
  for (const count of creatorCounts.values()) {
    if (count >= 2) repeatCreators += 1;
  }
  return {
    bondsWithTwoAcceptsIn48Hours,
    repeatCreators,
    measuredAt: now.toISOString(),
  };
}
