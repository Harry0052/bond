import { describe, expect, it } from "vitest";
import { checkShareToken, issueShareToken } from "./tokens";

describe("share tokens", () => {
  it("round-trips a signed token and rejects a tampered one", () => {
    const bondId = "11111111-1111-4111-8111-111111111111";
    const issued = issueShareToken(bondId);
    expect(checkShareToken(issued.token)).toMatchObject({ ok: true, bondId });
    const [id, nonce] = issued.token.split(".");
    expect(checkShareToken(`${id}.${nonce}.aaaaaaaaaaaaaaaaaaaaaaaaaa`).ok).toBe(false);
    expect(checkShareToken("not-a-token").ok).toBe(false);
  });
});
