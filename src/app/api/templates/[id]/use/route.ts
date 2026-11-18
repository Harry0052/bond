import { readSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { jsonError, sameOrigin } from "@/lib/http";
import { logFailure } from "@/lib/observability";
import { createFromTemplate } from "@/lib/templates/service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return jsonError(403, "origin", "Open Bond in this browser and try again.");
  const { id } = await context.params;
  const db = getDb();
  const user = await readSessionUser(db);
  if (!user) return jsonError(401, "auth", "Save your name before using a template.");
  try {
    const result = createFromTemplate(db, user.id, id);
    if (!result.ok) return jsonError(400, "invalid", result.message);
    return Response.json({ bondId: result.data.bondId });
  } catch (error) {
    logFailure({ scope: "templates", code: "use_failed", detail: error instanceof Error ? error.name : "error" });
    return jsonError(500, "use_failed", "Bond could not make a bond from that template. Try again.");
  }
}
