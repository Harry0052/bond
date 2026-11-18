import { readSessionUser } from "@/lib/auth/session";
import { addPerson } from "@/lib/bonds/join";
import { getDb } from "@/lib/db/client";
import { jsonError, sameOrigin } from "@/lib/http";
import { logFailure } from "@/lib/observability";
import { z } from "zod";

const bodySchema = z.object({ name: z.string() }).strict();

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return jsonError(403, "origin", "Open Bond in this browser and try again.");
  const { id } = await context.params;
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "json", "Bond could not read that name.");
  }
  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) return jsonError(400, "invalid", "Enter a name.");
  const db = getDb();
  const user = await readSessionUser(db);
  if (!user) return jsonError(401, "auth", "Save your name before adding a person.");
  try {
    const result = addPerson(db, user.id, id, parsed.data.name);
    if (!result.ok) return jsonError(403, "forbidden", result.message);
    return Response.json({ memberId: result.memberId });
  } catch (error) {
    logFailure({ scope: "people", code: "add_failed", detail: error instanceof Error ? error.name : "error" });
    return jsonError(500, "add_failed", "Bond could not add that person. Try again.");
  }
}
