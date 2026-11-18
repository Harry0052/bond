import { z } from "zod";
import { cookies } from "next/headers";
import { deleteAccount } from "@/lib/account/privacy";
import { readSessionUser, SESSION_COOKIE } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { jsonError, sameOrigin } from "@/lib/http";
import { logFailure } from "@/lib/observability";
import { consumeRateLimit, LIMITS } from "@/lib/security/rate-limit";

const bodySchema = z.object({ confirm: z.literal(true) }).strict();

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError(403, "origin", "Open Bond in this browser and try again.");
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "json", "Bond could not read that request.");
  }
  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) return jsonError(400, "invalid", "Confirm that you want to delete your data.");
  const db = getDb();
  const user = await readSessionUser(db);
  if (!user) return jsonError(401, "auth", "There is no session to delete.");
  const allowed = consumeRateLimit(
    db,
    `delete:${user.id}`,
    LIMITS.deleteAccount.limit,
    LIMITS.deleteAccount.windowMs,
  );
  if (!allowed) return jsonError(429, "rate", "Too many delete attempts. Wait an hour and try again.");
  try {
    const result = deleteAccount(db, user.id);
    if (!result.ok) return jsonError(400, "invalid", result.message);
    const jar = await cookies();
    jar.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
    return Response.json({ deleted: true });
  } catch (error) {
    logFailure({ scope: "account", code: "delete_failed", detail: error instanceof Error ? error.name : "error" });
    return jsonError(500, "delete_failed", "Bond could not delete that data. Try again.");
  }
}
