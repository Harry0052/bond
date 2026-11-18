import { z } from "zod";
import { readSessionUser } from "@/lib/auth/session";
import { reviseCommitment } from "@/lib/bonds/progress";
import { getDb } from "@/lib/db/client";
import { jsonError, sameOrigin } from "@/lib/http";
import { logFailure } from "@/lib/observability";
import { consumeRateLimit, LIMITS } from "@/lib/security/rate-limit";

const bodySchema = z
  .object({
    title: z.string(),
    dueLocal: z.string(),
    assigneeMemberId: z.string(),
  })
  .strict();

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return jsonError(403, "origin", "Open Bond in this browser and try again.");
  const { id } = await context.params;
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "json", "Bond could not read that change.");
  }
  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) return jsonError(400, "invalid", "Check the change and try again.");
  const db = getDb();
  const user = await readSessionUser(db);
  if (!user) return jsonError(401, "auth", "Save your name before changing a commitment.");
  const allowed = consumeRateLimit(db, `revise:${user.id}`, LIMITS.revise.limit, LIMITS.revise.windowMs);
  if (!allowed) return jsonError(429, "rate", "Too many changes. Wait an hour and try again.");
  try {
    const result = reviseCommitment(db, user.id, id, parsed.data);
    if (!result.ok) return jsonError(403, "forbidden", result.message);
    return Response.json({ changed: result.changed, revision: result.revision });
  } catch (error) {
    logFailure({ scope: "revise", code: "revise_failed", detail: error instanceof Error ? error.name : "error" });
    return jsonError(500, "revise_failed", "Bond could not save that change. Try again.");
  }
}
