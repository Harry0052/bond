import { describe, expect, it } from "vitest";
import { buildCalendar } from "./ics";

describe("ics", () => {
  it("exports a real calendar and does not invent a connected account", () => {
    const file = buildCalendar(
      [
        {
          id: "11111111-1111-4111-8111-111111111111",
          title: "Buy milk, bread",
          dueAt: "2026-12-01T18:00:00.000Z",
          bondTitle: "Groceries",
        },
      ],
      new Date("2026-11-18T12:00:00.000Z"),
    );
    expect(file).toContain("BEGIN:VCALENDAR");
    expect(file).toContain("SUMMARY:Buy milk\\, bread");
    expect(file).toContain("DTSTART:20261201T180000Z");
    expect(file).toContain("Not a legal agreement");
    expect(file).not.toContain("private-fridge-code");
    expect(file).not.toContain("Google");
  });
});
