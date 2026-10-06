import { describe, expect, it } from "vitest";
import {
  SESSION_TTL_MS,
  createSessionToken,
  readCookie,
  verifySessionToken,
} from "@/lib/admin/session";

const SECRET = "test-secret-please-rotate";

describe("admin session tokens", () => {
  it("round-trips a fresh token", async () => {
    const token = await createSessionToken(SECRET);
    expect(await verifySessionToken(token, SECRET)).toBe(true);
  });

  it("rejects a tampered signature", async () => {
    const token = await createSessionToken(SECRET);
    const [exp, sig] = token.split(".");
    const flipped = sig[0] === "a" ? "b" : "a";
    expect(await verifySessionToken(`${exp}.${flipped}${sig.slice(1)}`, SECRET)).toBe(
      false,
    );
  });

  it("rejects a tampered expiry", async () => {
    const token = await createSessionToken(SECRET);
    const [, sig] = token.split(".");
    expect(await verifySessionToken(`${Date.now() + 1}.${sig}`, SECRET)).toBe(false);
  });

  it("rejects an expired token", async () => {
    const past = Date.now() - 1000;
    const token = await createSessionToken(SECRET, past - SESSION_TTL_MS - 1);
    expect(await verifySessionToken(token, SECRET)).toBe(false);
  });

  it("fails closed with missing token or secret", async () => {
    expect(await verifySessionToken(undefined, SECRET)).toBe(false);
    expect(await verifySessionToken("x.y", undefined)).toBe(false);
    expect(await verifySessionToken("", SECRET)).toBe(false);
    expect(await verifySessionToken("garbage", SECRET)).toBe(false);
  });

  it("parses cookies from a header", () => {
    const header = "foo=1; ba_admin_session=abc%2Edef; bar=2";
    expect(readCookie(header, "ba_admin_session")).toBe("abc.def");
    expect(readCookie(header, "missing")).toBeUndefined();
    expect(readCookie(null, "ba_admin_session")).toBeUndefined();
  });
});
