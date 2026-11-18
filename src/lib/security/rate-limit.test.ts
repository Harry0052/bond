import { describe, expect, it } from "vitest";
import { createTestDb } from "@/lib/db/client";
import { consumeRateLimit } from "./rate-limit";

describe("rate limit", () => {
  it("allows the budget and then refuses the next call in the same window", () => {
    const db = createTestDb();
    const now = Date.parse("2026-07-15T12:00:00.000Z");
    expect(consumeRateLimit(db, "join:test", 2, 60_000, now)).toBe(true);
    expect(consumeRateLimit(db, "join:test", 2, 60_000, now + 1)).toBe(true);
    expect(consumeRateLimit(db, "join:test", 2, 60_000, now + 2)).toBe(false);
    expect(consumeRateLimit(db, "join:test", 2, 60_000, now + 60_000)).toBe(true);
  });
});
