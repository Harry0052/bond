import { saveProfile, readSessionUser } from "@/lib/auth/session";
import { createBond } from "@/lib/bonds/service";
import { getDb } from "@/lib/db/client";
import { clientIp, jsonError, requestIsSecure, sameOrigin } from "@/lib/http";
import { logFailure } from "@/lib/observability";
import { consumeRateLimit, LIMITS } from "@/lib/security/rate-limit";
import { createBondBodySchema } from "@/lib/validators/bonds";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError(403, "origin", "Open Bond in this browser and try again.");
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "json", "Bond could not read that form.");
  }
  const parsed = createBondBodySchema.safeParse(payload);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = String(issue?.path[0] ?? "form");
    const message = issue?.message ?? "Check the form and try again.";
    return jsonError(400, "invalid", message, { [field]: message });
  }

  const db = getDb();
  const allowed = consumeRateLimit(db, `create:${clientIp(request)}`, LIMITS.createBond.limit, LIMITS.createBond.windowMs);
  if (!allowed) return jsonError(429, "rate", "Too many bonds from this network. Wait an hour and try again.");

  const idempotencyKey = request.headers.get("idempotency-key");
  if (idempotencyKey && !/^[A-Za-z0-9_-]{8,80}$/.test(idempotencyKey)) {
    return jsonError(400, "invalid", "That save key is not valid.", { form: "That save key is not valid." });
  }

  try {
    let user = await readSessionUser(db);
    if (!user) {
      if (!parsed.data.displayName) {
        return jsonError(400, "invalid", "Enter the name your group uses.", {
          displayName: "Enter the name your group uses.",
        });
      }
      const saved = await saveProfile(db, parsed.data.displayName, parsed.data.timezone, requestIsSecure(request));
      if (!saved.ok) return jsonError(400, "invalid", saved.message, { displayName: saved.message });
      user = saved.user;
    }
    const created = createBond(
      db,
      user.id,
      {
        title: parsed.data.title,
        purpose: parsed.data.purpose,
        people: parsed.data.people,
        commitments: parsed.data.commitments,
      },
      idempotencyKey,
    );
    if (!created.ok) return jsonError(400, "invalid", created.message, created.fields);
    return Response.json({ bond: { id: created.data.bondId, sharePath: created.data.sharePath } });
  } catch (error) {
    logFailure({ scope: "bonds", code: "create_failed", detail: error instanceof Error ? error.name : "error" });
    return jsonError(500, "create_failed", "Bond could not save that. Try again.");
  }
}
