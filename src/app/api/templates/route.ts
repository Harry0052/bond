import { z } from "zod";
import { readSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { jsonError, sameOrigin } from "@/lib/http";
import { logFailure } from "@/lib/observability";
import { consumeRateLimit, LIMITS } from "@/lib/security/rate-limit";
import { saveTemplate } from "@/lib/templates/service";

const bodySchema = z.object({ bondId: z.string().uuid() }).strict();

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError(403, "origin", "Open Bond in this browser and try again.");
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "json", "Bond could not read that request.");
  }
  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) return jsonError(400, "invalid", "Choose a bond to save.");
  const db = getDb();
  const user = await readSessionUser(db);
  if (!user) return jsonError(401, "auth", "Save your name before saving a template.");
  const allowed = consumeRateLimit(db, `template:${user.id}`, LIMITS.template.limit, LIMITS.template.windowMs);
  if (!allowed) return jsonError(429, "rate", "Too many templates. Wait an hour and try again.");
  try {
    const result = saveTemplate(db, user.id, parsed.data.bondId);
    if (!result.ok) return jsonError(403, "forbidden", result.message);
    return Response.json({ templateId: result.templateId });
  } catch (error) {
    logFailure({ scope: "templates", code: "save_failed", detail: error instanceof Error ? error.name : "error" });
    return jsonError(500, "save_failed", "Bond could not save that template. Try again.");
  }
}
