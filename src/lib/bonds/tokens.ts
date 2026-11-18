import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const LOCAL_FALLBACK = "bond-local-development-share-secret";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function shareSigning() {
  const configured = process.env.BOND_SHARE_SECRET?.trim();
  if (configured && configured.length >= 16 && configured !== LOCAL_FALLBACK) {
    return { secret: configured, source: "env" as const };
  }
  return { secret: LOCAL_FALLBACK, source: "local-fallback" as const };
}

export function hashShareToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function signShareToken(bondId: string, nonce: string) {
  const payload = `${bondId}.${nonce}`;
  const mac = createHmac("sha256", shareSigning().secret).update(payload).digest("base64url");
  return `${payload}.${mac}`;
}

export function issueShareToken(bondId: string) {
  const nonce = randomBytes(18).toString("base64url");
  const token = signShareToken(bondId, nonce);
  return { token, nonce, tokenHash: hashShareToken(token) };
}

export function tokenFromStored(bondId: string, nonce: string) {
  return signShareToken(bondId, nonce);
}

export function checkShareToken(token: string): { ok: true; bondId: string; tokenHash: string } | { ok: false } {
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false };
  const [bondId, nonce, mac] = parts;
  if (!bondId || !nonce || !mac) return { ok: false };
  if (!UUID_RE.test(bondId)) return { ok: false };
  if (nonce.length < 8 || mac.length < 20) return { ok: false };
  const expected = createHmac("sha256", shareSigning().secret).update(`${bondId}.${nonce}`).digest("base64url");
  const left = Buffer.from(mac);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return { ok: false };
  return { ok: true, bondId, tokenHash: hashShareToken(token) };
}
