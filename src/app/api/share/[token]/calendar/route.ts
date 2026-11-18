import { buildCalendar } from "@/lib/calendar/ics";
import { readPreview } from "@/lib/bonds/service";
import { getDb } from "@/lib/db/client";
import { jsonError } from "@/lib/http";

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const preview = readPreview(getDb(), decodeURIComponent(token));
  if (!preview) return jsonError(404, "missing", "This link does not match a bond.");
  const file = buildCalendar(
    preview.commitments
      .filter((task) => task.status === "open")
      .map((task, index) => ({
        id: `${preview.title}-${index}`,
        title: task.title,
        dueAt: task.dueAt,
        bondTitle: preview.title,
      })),
  );
  return new Response(file, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'attachment; filename="bond.ics"',
    },
  });
}
