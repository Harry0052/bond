import { randomUUID } from "node:crypto";
import type { BondDb } from "@/lib/db/client";
import { bondEvents } from "@/lib/db/schema";
import { formatInZone, nowIso } from "@/lib/time";

export type EventPayload = Record<string, string | number | boolean | null>;

const HIDDEN = new Set(["token", "secret", "nonce", "email", "phone", "note", "cookie"]);

export function cleanEventPayload(input: EventPayload): EventPayload {
  const clean: EventPayload = {};
  for (const [key, value] of Object.entries(input)) {
    if (HIDDEN.has(key.toLowerCase())) continue;
    clean[key] = typeof value === "string" ? value.slice(0, 80) : value;
  }
  return clean;
}

export function recordBondEvent(
  db: BondDb,
  bondId: string,
  actorId: string | null,
  eventType: string,
  payload: EventPayload,
) {
  db.insert(bondEvents)
    .values({
      id: randomUUID(),
      bondId,
      actorId,
      eventType,
      payloadJson: JSON.stringify(cleanEventPayload(payload)),
      createdAt: nowIso(),
    })
    .run();
}

export function humanizeEvent(
  eventType: string,
  payloadJson: string,
  createdAt: string,
  timeZone: string,
) {
  let payload: EventPayload = {};
  try {
    payload = JSON.parse(payloadJson) as EventPayload;
  } catch {
    payload = {};
  }
  const when = formatInZone(createdAt, timeZone);
  const actor = typeof payload.actorName === "string" ? payload.actorName : "Someone";
  const invited = typeof payload.invitedName === "string" ? payload.invitedName : "someone";
  const title = typeof payload.title === "string" ? payload.title : "a commitment";
  switch (eventType) {
    case "bond_created":
      return `${actor} started this bond. ${when}`;
    case "member_invited":
      return `${actor} added ${invited}. ${when}`;
    case "member_joined":
      return `${actor} joined. ${when}`;
    case "member_declined":
      return `${actor} declined. ${when}`;
    case "member_removed":
      return `${actor} removed ${invited}. They can no longer see private activity. ${when}`;
    case "commitment_accepted":
      return `${actor} accepted “${title}”. ${when}`;
    case "commitment_completed":
      return `${actor} marked “${title}” done. ${when}`;
    case "revision_proposed":
      return `${actor} changed “${title}”. The earlier acceptance no longer counts. ${when}`;
    case "bond_cancelled":
      return `${actor} cancelled this bond. ${when}`;
    case "vote_cast":
      return `${actor} voted. ${when}`;
    default:
      return `The record was updated. ${when}`;
  }
}
