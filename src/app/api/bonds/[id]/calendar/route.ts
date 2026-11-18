import { and, eq } from "drizzle-orm";
import { readSessionUser } from "@/lib/auth/session";
import { buildCalendar } from "@/lib/calendar/ics";
import { getDb } from "@/lib/db/client";
import { bonds, commitments, members } from "@/lib/db/schema";
import { jsonError } from "@/lib/http";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const db = getDb();
  const user = await readSessionUser(db);
  if (!user) return jsonError(401, "auth", "Save your name before downloading a calendar file.");
  const member = db
    .select()
    .from(members)
    .where(and(eq(members.bondId, id), eq(members.userId, user.id), eq(members.invitationStatus, "accepted")))
    .get();
  const bond = db.select().from(bonds).where(eq(bonds.id, id)).get();
  if (!member || !bond) return jsonError(404, "missing", "That bond is not available.");
  const tasks = db
    .select()
    .from(commitments)
    .where(and(eq(commitments.bondId, id), eq(commitments.status, "open")))
    .all();
  const file = buildCalendar(
    tasks.map((task) => ({ id: task.id, title: task.title, dueAt: task.dueAt, bondTitle: bond.title })),
  );
  return new Response(file, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'attachment; filename="bond.ics"',
    },
  });
}
