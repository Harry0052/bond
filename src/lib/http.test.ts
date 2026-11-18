import { describe, expect, it } from "vitest";
import { jsonError, sameOrigin } from "./http";

describe("http", () => {
  it("accepts only the same host", () => {
    const ok = new Request("http://localhost:3000/api/profile", {
      headers: { origin: "http://localhost:3000", host: "localhost:3000" },
    });
    const bad = new Request("http://localhost:3000/api/profile", {
      headers: { origin: "https://evil.example", host: "localhost:3000" },
    });
    expect(sameOrigin(ok)).toBe(true);
    expect(sameOrigin(bad)).toBe(false);
  });

  it("returns a typed error body", async () => {
    const response = jsonError(400, "invalid", "Enter a name.", { displayName: "Enter a name." });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: { code: "invalid", message: "Enter a name.", fields: { displayName: "Enter a name." } },
    });
  });
});
