import { readSessionUser } from "@/lib/auth/session";
import { acceptCommitment } from "@/lib/bonds/join";
import { getDb } from "@/lib/db/client";
import { jsonError, sameOrigin } from "@/lib/http";
import { logFailure } from "@/lib/observability";
import { consumeRateLimit, LIMITS } from "@/lib/security/rate-limit";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return jsonError(403, "origin", "Open Bond in this browser and try again.");
  const { id } = await context.params;
  const db = getDb();
  const user = await readSessionUser(db);
  if (!user) return jsonError(401, "auth", "Save your name before accepting.");
  const allowed = consumeRateLimit(db, `accept:${user.id}`, LIMITS.accept.limit, LIMITS.accept.windowMs);
  if (!allowed) return jsonError(429, "rate", "Too many accepts. Wait an hour and try again.");
  try {
    const result = acceptCommitment(db, user.id, id);
    if (!result.ok) return jsonError(403, "forbidden", result.message);
    return Response.json({ acceptanceId: result.acceptanceId, duplicate: result.duplicate });
  } catch (error) {
    logFailure({ scope: "accept", code: "accept_failed", detail: error instanceof Error ? error.name : "error" });
    return jsonError(500, "accept_failed", "Bond could not save that acceptance. Try again.");
  }
}
