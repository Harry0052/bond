import { readSessionUser } from "@/lib/auth/session";
import { completeCommitment } from "@/lib/bonds/progress";
import { getDb } from "@/lib/db/client";
import { jsonError, sameOrigin } from "@/lib/http";
import { logFailure } from "@/lib/observability";
import { consumeRateLimit, LIMITS } from "@/lib/security/rate-limit";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return jsonError(403, "origin", "Open Bond in this browser and try again.");
  const { id } = await context.params;
  const db = getDb();
  const user = await readSessionUser(db);
  if (!user) return jsonError(401, "auth", "Save your name before marking something done.");
  const allowed = consumeRateLimit(db, `complete:${user.id}`, LIMITS.complete.limit, LIMITS.complete.windowMs);
  if (!allowed) return jsonError(429, "rate", "Too many updates. Wait an hour and try again.");
  try {
    const result = completeCommitment(db, user.id, id);
    if (!result.ok) return jsonError(403, "forbidden", result.message);
    return Response.json({ completedAt: result.completedAt });
  } catch (error) {
    logFailure({ scope: "complete", code: "complete_failed", detail: error instanceof Error ? error.name : "error" });
    return jsonError(500, "complete_failed", "Bond could not mark that done. Try again.");
  }
}
