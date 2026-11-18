import { createHash } from "node:crypto";

export type CalendarEvent = {
  id: string;
  title: string;
  dueAt: string;
  bondTitle: string;
};

function icsEscape(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function icsStamp(iso: string) {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function fold(line: string) {
  if (line.length <= 73) return line;
  const parts = [line.slice(0, 73)];
  let rest = line.slice(73);
  while (rest.length > 0) {
    parts.push(` ${rest.slice(0, 72)}`);
    rest = rest.slice(72);
  }
  return parts.join("\r\n");
}

export function buildCalendar(events: CalendarEvent[], now = new Date()) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Bond//Commitments//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  const stamp = icsStamp(now.toISOString());
  for (const event of events) {
    const end = new Date(Date.parse(event.dueAt) + 30 * 60 * 1000).toISOString();
    const uid = createHash("sha256").update(event.id).digest("hex").slice(0, 24);
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}@bond`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART:${icsStamp(event.dueAt)}`);
    lines.push(`DTEND:${icsStamp(end)}`);
    lines.push(fold(`SUMMARY:${icsEscape(event.title)}`));
    lines.push(
      fold(
        `DESCRIPTION:${icsEscape(`${event.bondTitle}. Not a legal agreement. Bond does not add this to a calendar account.`)}`,
      ),
    );
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}
