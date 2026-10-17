/**
 * HMAC request signing — must match Python relconv.api.sign_request exactly.
 *
 * Secret message:
 *   METHOD\npath_qs\ntimestamp\nnonce\nsha256(body).hex
 * signature = HMAC-SHA256(secret, message).hex
 *
 * Token (preferred):
 *   Authorization: Bearer relconv1.<key_id>.<ts>.<nonce>.<signature>
 */
import { createHash, createHmac, randomBytes } from "node:crypto";

export const TOKEN_PREFIX = "relconv1";

export function sha256Hex(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

export function signRequest(
  secret: string,
  method: string,
  pathQs: string,
  ts: string,
  nonce: string,
  body: Buffer | string = "",
): string {
  const bodyHash = sha256Hex(typeof body === "string" ? Buffer.from(body) : body);
  const msg = [method.toUpperCase(), pathQs, ts, nonce, bodyHash].join("\n");
  return createHmac("sha256", secret).update(msg).digest("hex");
}

/** Build a single bearer token that carries the signed secret message. */
export function mintToken(
  secret: string,
  keyId: string,
  method: string,
  pathQs: string,
  body: Buffer | string = "",
): string {
  const ts = String(Math.floor(Date.now() / 1000));
  const nonce = randomBytes(16).toString("hex");
  const bodyBuf = typeof body === "string" ? Buffer.from(body) : body;
  const sig = signRequest(secret, method, pathQs, ts, nonce, bodyBuf);
  return `${TOKEN_PREFIX}.${keyId}.${ts}.${nonce}.${sig}`;
}

/** Preferred: one Authorization header with the token. */
export function signedHeaders(
  secret: string,
  keyId: string,
  method: string,
  pathQs: string,
  body: Buffer | string = "",
): Record<string, string> {
  const token = mintToken(secret, keyId, method, pathQs, body);
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}
