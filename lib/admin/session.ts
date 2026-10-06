/**
 * Admin session tokens — WebCrypto HMAC so the same code runs in Node
 * route handlers and the edge middleware. Format: `<exp-ms>.<hex-signature>`.
 * Missing ADMIN_SESSION_SECRET ⇒ verification always fails (admin disabled,
 * never an open door).
 */

const enc = new TextEncoder();

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
export const SESSION_COOKIE = "ba_admin_session";

async function sign(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return hex(sig);
}

export async function createSessionToken(
  secret: string,
  now: number = Date.now(),
): Promise<string> {
  const exp = now + SESSION_TTL_MS;
  return `${exp}.${await sign(secret, String(exp))}`;
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string | undefined,
  now: number = Date.now(),
): Promise<boolean> {
  if (!token || !secret) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const exp = Number(token.slice(0, dot));
  if (!Number.isFinite(exp) || exp <= now) return false;
  const expected = await sign(secret, token.slice(0, dot));
  const given = token.slice(dot + 1);
  if (expected.length !== given.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  }
  return diff === 0;
}

export function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

export async function isAdminRequest(req: Request): Promise<boolean> {
  const token = readCookie(req.headers.get("cookie"), SESSION_COOKIE);
  return verifySessionToken(token, process.env.ADMIN_SESSION_SECRET);
}
