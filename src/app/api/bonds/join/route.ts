import { readSessionUser, saveProfile } from "@/lib/auth/session";
import { joinBond } from "@/lib/bonds/join";
import { getDb } from "@/lib/db/client";
import { clientIp, jsonError, requestIsSecure, sameOrigin } from "@/lib/http";
import { logFailure } from "@/lib/observability";
import { consumeRateLimit, LIMITS } from "@/lib/security/rate-limit";
import { displayNameSchema, timezoneSchema } from "@/lib/validators/profile";
import { z } from "zod";

const joinBodySchema = z
  .object({
    token: z.string().trim().min(20).max(500),
    slotId: z.string().uuid(),
    decision: z.enum(["accept", "decline"]),
    commitmentIds: z.array(z.string().uuid()).max(20),
    displayName: displayNameSchema.optional(),
    timezone: timezoneSchema.optional(),
  })
  .strict();

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError(403, "origin", "Open Bond in this browser and try again.");
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "json", "Bond could not read that form.");
  }
  const parsed = joinBodySchema.safeParse(payload);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Check the form and try again.";
    return jsonError(400, "invalid", message);
  }
  const db = getDb();
  const allowed = consumeRateLimit(db, `join:${clientIp(request)}`, LIMITS.join.limit, LIMITS.join.windowMs);
  if (!allowed) return jsonError(429, "rate", "Too many join attempts from this network. Wait an hour and try again.");
  try {
    let user = await readSessionUser(db);
    if (!user) {
      if (!parsed.data.displayName || !parsed.data.timezone) {
        return jsonError(400, "invalid", "Enter the name your group uses.", {
          displayName: "Enter the name your group uses.",
        });
      }
      const saved = await saveProfile(db, parsed.data.displayName, parsed.data.timezone, requestIsSecure(request));
      if (!saved.ok) return jsonError(400, "invalid", saved.message, { displayName: saved.message });
      user = saved.user;
    }
    const joined = joinBond(db, user.id, parsed.data);
    if (!joined.ok) return jsonError(400, "invalid", joined.message);
    return Response.json({ bondId: joined.bondId, access: joined.access });
  } catch (error) {
    logFailure({ scope: "join", code: "join_failed", detail: error instanceof Error ? error.name : "error" });
    return jsonError(500, "join_failed", "Bond could not save that. Try again.");
  }
}
