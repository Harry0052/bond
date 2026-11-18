import { eq } from "drizzle-orm";
import {
  SAMPLE_BOND_ID,
  SAMPLE_COMMITMENT_MILK,
  SAMPLE_COMMITMENT_TABLE,
  SAMPLE_MEMBER_ID,
  SAMPLE_NONCE,
  SAMPLE_ORGANIZER_ID,
  SAMPLE_ORGANIZER_MEMBER_ID,
  SEEDED_AT,
} from "@/lib/bonds/sample";
import { hashShareToken, tokenFromStored } from "@/lib/bonds/tokens";
import type { BondDb } from "@/lib/db/client";
import { bondEvents, bonds, commitments, members, users } from "@/lib/db/schema";

export function seedDemo(db: BondDb) {
  const organizer = db.select().from(users).where(eq(users.id, SAMPLE_ORGANIZER_ID)).get();
  if (!organizer) {
    db.insert(users)
      .values({
        id: SAMPLE_ORGANIZER_ID,
        displayName: "Sam (sample)",
        timezone: "America/New_York",
        kind: "demo",
        createdAt: SEEDED_AT,
      })
      .run();
  }

  const tokenHash = hashShareToken(tokenFromStored(SAMPLE_BOND_ID, SAMPLE_NONCE));
  const existing = db.select().from(bonds).where(eq(bonds.id, SAMPLE_BOND_ID)).get();
  if (!existing) {
    db.insert(bonds)
      .values({
        id: SAMPLE_BOND_ID,
        creatorId: SAMPLE_ORGANIZER_ID,
        title: "Saturday groceries",
        purpose: "A sample of the card two roommates would share. This one is not saved as your bond.",
        status: "active",
        shareTokenHash: tokenHash,
        shareNonce: SAMPLE_NONCE,
        demo: 1,
        idempotencyKey: "sample-bond",
        createdAt: SEEDED_AT,
        updatedAt: SEEDED_AT,
      })
      .run();
    db.insert(members)
      .values([
        {
          id: SAMPLE_ORGANIZER_MEMBER_ID,
          bondId: SAMPLE_BOND_ID,
          userId: SAMPLE_ORGANIZER_ID,
          invitedName: "Sam (sample)",
          invitationStatus: "accepted",
          role: "organizer",
          createdAt: SEEDED_AT,
          updatedAt: SEEDED_AT,
        },
        {
          id: SAMPLE_MEMBER_ID,
          bondId: SAMPLE_BOND_ID,
          userId: null,
          invitedName: "Riley (sample)",
          invitationStatus: "invited",
          role: "participant",
          createdAt: SEEDED_AT,
          updatedAt: SEEDED_AT,
        },
      ])
      .run();
    db.insert(commitments)
      .values([
        {
          id: SAMPLE_COMMITMENT_MILK,
          bondId: SAMPLE_BOND_ID,
          assignedMemberId: SAMPLE_MEMBER_ID,
          title: "Buy oat milk",
          dueAt: "2026-12-05T23:00:00.000Z",
          status: "open",
          revision: 1,
          createdAt: SEEDED_AT,
          updatedAt: SEEDED_AT,
        },
        {
          id: SAMPLE_COMMITMENT_TABLE,
          bondId: SAMPLE_BOND_ID,
          assignedMemberId: SAMPLE_ORGANIZER_MEMBER_ID,
          title: "Book the table",
          dueAt: "2026-12-04T17:00:00.000Z",
          status: "open",
          revision: 1,
          createdAt: SEEDED_AT,
          updatedAt: SEEDED_AT,
        },
      ])
      .run();
    db.insert(bondEvents)
      .values({
        id: "00000000-0000-4000-8000-000000000031",
        bondId: SAMPLE_BOND_ID,
        actorId: SAMPLE_ORGANIZER_ID,
        eventType: "bond_created",
        payloadJson: JSON.stringify({ actorName: "Sam (sample)" }),
        createdAt: SEEDED_AT,
      })
      .run();
    return;
  }

  if (existing.shareTokenHash !== tokenHash) {
    db.update(bonds).set({ shareTokenHash: tokenHash }).where(eq(bonds.id, SAMPLE_BOND_ID)).run();
  }
}
