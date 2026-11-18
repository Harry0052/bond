import { readSessionUser } from "@/lib/auth/session";
import { castVote } from "@/lib/bonds/join";
import { getDb } from "@/lib/db/client";
import { jsonError, sameOrigin } from "@/lib/http";
import { logFailure } from "@/lib/observability";
import { z } from "zod";

const bodySchema = z.object({ vote: z.enum(["yes", "no"]) }).strict();

export async function POST(request: Request, context: { params: Promise<{ questionId: string }> }) {
  if (!sameOrigin(request)) return jsonError(403, "origin", "Open Bond in this browser and try again.");
  const { questionId } = await context.params;
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "json", "Bond could not read that vote.");
  }
  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) return jsonError(400, "invalid", "Vote yes or no.");
  const db = getDb();
  const user = await readSessionUser(db);
  if (!user) return jsonError(401, "auth", "Save your name before voting.");
  try {
    const result = castVote(db, user.id, questionId, parsed.data.vote);
    if (!result.ok) return jsonError(400, "invalid", result.message);
    return Response.json({ duplicate: result.duplicate });
  } catch (error) {
    logFailure({ scope: "vote", code: "vote_failed", detail: error instanceof Error ? error.name : "error" });
    return jsonError(500, "vote_failed", "Bond could not save that vote. Try again.");
  }
}
