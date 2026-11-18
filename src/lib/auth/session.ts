import { cookies } from "next/headers";
import { createMemberRecord, readUserByToken, updateProfile, type PublicUser } from "@/lib/auth/users";
import type { BondDb } from "@/lib/db/client";

export const SESSION_COOKIE = "bond_session";
const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;

export async function readSessionUser(db: BondDb): Promise<PublicUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return readUserByToken(db, token);
}

export async function saveProfile(
  db: BondDb,
  displayName: string,
  timezone: string,
  secure: boolean,
) {
  const existing = await readSessionUser(db);
  if (!existing) {
    const created = createMemberRecord(db, displayName, timezone);
    if (!created.ok) return created;
    const jar = await cookies();
    jar.set(SESSION_COOKIE, created.token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: THIRTY_DAYS_SECONDS,
      secure,
    });
    return { ok: true as const, user: created.user };
  }
  return updateProfile(db, existing.id, displayName, timezone);
}
