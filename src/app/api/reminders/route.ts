import { z } from "zod";
import { readSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { jsonError, sameOrigin } from "@/lib/http";
import { logFailure } from "@/lib/observability";
import { setReminderOptIn } from "@/lib/reminders/service";

const bodySchema = z.object({ optedIn: z.boolean() }).strict();

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError(403, "origin", "Open Bond in this browser and try again.");
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "json", "Bond could not read that choice.");
  }
  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) return jsonError(400, "invalid", "Choose whether reminders are on.");
  const db = getDb();
  const user = await readSessionUser(db);
  if (!user) return jsonError(401, "auth", "Save your name before changing reminders.");
  try {
    const result = setReminderOptIn(db, user.id, parsed.data.optedIn);
    if (!result.ok) return jsonError(400, "invalid", result.message);
    return Response.json({ optedIn: result.optedIn });
  } catch (error) {
    logFailure({ scope: "reminders", code: "opt_in_failed", detail: error instanceof Error ? error.name : "error" });
    return jsonError(500, "opt_in_failed", "Bond could not save that choice. Try again.");
  }
}
