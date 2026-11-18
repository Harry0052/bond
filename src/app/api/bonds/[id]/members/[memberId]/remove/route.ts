import { readSessionUser } from "@/lib/auth/session";
import { removeMember } from "@/lib/bonds/progress";
import { getDb } from "@/lib/db/client";
import { jsonError, sameOrigin } from "@/lib/http";
import { logFailure } from "@/lib/observability";
import { consumeRateLimit, LIMITS } from "@/lib/security/rate-limit";

export async function POST(request: Request, context: { params: Promise<{ id: string; memberId: string }> }) {
  if (!sameOrigin(request)) return jsonError(403, "origin", "Open Bond in this browser and try again.");
  const { id, memberId } = await context.params;
  const db = getDb();
  const user = await readSessionUser(db);
  if (!user) return jsonError(401, "auth", "Save your name before removing someone.");
  const allowed = consumeRateLimit(db, `remove:${user.id}`, LIMITS.remove.limit, LIMITS.remove.windowMs);
  if (!allowed) return jsonError(429, "rate", "Too many removals. Wait an hour and try again.");
  try {
    const result = removeMember(db, user.id, id, memberId);
    if (!result.ok) return jsonError(403, "forbidden", result.message);
    return Response.json({ already: result.already });
  } catch (error) {
    logFailure({ scope: "remove", code: "remove_failed", detail: error instanceof Error ? error.name : "error" });
    return jsonError(500, "remove_failed", "Bond could not remove that person. Try again.");
  }
}
