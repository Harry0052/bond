import { saveProfile } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { clientIp, jsonError, requestIsSecure, sameOrigin } from "@/lib/http";
import { logFailure } from "@/lib/observability";
import { consumeRateLimit, LIMITS } from "@/lib/security/rate-limit";
import { profileBodySchema } from "@/lib/validators/profile";

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return jsonError(403, "origin", "Open Bond in this browser and try again.");
  }
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "json", "Bond could not read that form.");
  }
  const parsed = profileBodySchema.safeParse(payload);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path[0] === "timezone" ? "timezone" : "displayName";
    const message = issue?.message ?? "Enter a name people will recognize.";
    return jsonError(400, "invalid", message, { [field]: message });
  }
  const db = getDb();
  const allowed = consumeRateLimit(db, `profile:${clientIp(request)}`, LIMITS.profile.limit, LIMITS.profile.windowMs);
  if (!allowed) {
    return jsonError(429, "rate", "Too many name saves from this network. Wait an hour and try again.");
  }
  try {
    const saved = await saveProfile(db, parsed.data.displayName, parsed.data.timezone, requestIsSecure(request));
    if (!saved.ok) return jsonError(400, "invalid", saved.message, { displayName: saved.message });
    return Response.json({
      user: { id: saved.user.id, displayName: saved.user.displayName, timezone: saved.user.timezone },
    });
  } catch (error) {
    logFailure({ scope: "profile", code: "save_failed", detail: error instanceof Error ? error.name : "error" });
    return jsonError(500, "save_failed", "Bond could not save that name. Try again.");
  }
}
