import { readSessionUser } from "@/lib/auth/session";
import { exportAccount } from "@/lib/account/privacy";
import { getDb } from "@/lib/db/client";
import { clientIp, jsonError } from "@/lib/http";
import { consumeRateLimit, LIMITS } from "@/lib/security/rate-limit";

export async function GET(request: Request) {
  const db = getDb();
  const user = await readSessionUser(db);
  if (!user) return jsonError(401, "auth", "Save your name before downloading your data.");
  const allowed = consumeRateLimit(db, `export:${clientIp(request)}`, LIMITS.export.limit, LIMITS.export.windowMs);
  if (!allowed) return jsonError(429, "rate", "Too many downloads. Wait an hour and try again.");
  const data = exportAccount(db, user.id);
  if (!data) return jsonError(404, "missing", "That profile is not on this server.");
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": 'attachment; filename="bond-export.json"',
    },
  });
}
