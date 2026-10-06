import { DatabaseNotConfiguredError } from "@/lib/db/client";
import { insertGroupInquiry } from "@/lib/db/growth";
import { clientIp } from "@/lib/client-ip";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { groupInquirySchema } from "@/lib/growth/schema";
import { prepareGroupInquiryEmails } from "@/lib/growth/emails";

export const dynamic = "force-dynamic";

/**
 * POST /api/group-inquiries — an enquiry from /for-groups.
 *
 * The same abuse stack as /apply, in the same order: rate limit, then honeypot
 * (before zod, so a bot never learns a field name), then schema validation, then
 * Turnstile (after zod, so a malformed request never burns the single-use
 * token). The rate limiter fails OPEN here: an enquiry is worth less than an
 * intake form going down, and the bucket is loud when it is disabled.
 *
 * The enquiry row is written first — that is the durable record — and the two
 * emails are queued right after. A failure to queue mail is logged loudly and
 * the visitor still gets a truthful 201, because their enquiry IS recorded.
 */
export async function POST(request: Request): Promise<Response> {
  const ip = clientIp(request);
  const rl = await checkRateLimit({
    name: "group-inquiries",
    limit: 5,
    windowSec: 15 * 60,
    onFailure: "open",
    ip,
  });
  const rlHeaders = rateLimitHeaders(rl);
  if (!rl.allowed) {
    return Response.json(
      { error: "rate_limited", retry_after: rl.retryAfterSec },
      { status: 429, headers: rlHeaders },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "invalid_request", issues: [] },
      { status: 400, headers: rlHeaders },
    );
  }

  // Not an object (`null`, `"text"`, `42`, `[1,2]`)? The honeypot read below
  // would be a property access on a non-object and throw a 500. Give it the
  // same honest 400 as unparseable JSON.
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return Response.json(
      { error: "invalid_request", issues: [] },
      { status: 400, headers: rlHeaders },
    );
  }

  const honeypot = (body as { website?: unknown }).website;
  if (typeof honeypot === "string" && honeypot.length > 0) {
    console.warn(`group-inquiries honeypot triggered ip=${ip}`);
    // Generic 400: the response must never name the field it tripped.
    return Response.json({ error: "invalid_request" }, { status: 400, headers: rlHeaders });
  }

  const parsed = groupInquirySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: "invalid_request",
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400, headers: rlHeaders },
    );
  }

  const turnstile = await verifyTurnstile(
    (body as { cf_turnstile_response?: string }).cf_turnstile_response,
    ip,
  );
  const headers: Record<string, string> = {
    ...rlHeaders,
    "x-turnstile-mode": turnstile.mode,
  };
  if (!turnstile.ok) {
    if (turnstile.kind === "rejected") {
      const required = turnstile.reason === "missing_token";
      console.warn(
        `group-inquiries turnstile ${required ? "missing token" : "rejected"} ` +
          `ip=${ip} reason=${turnstile.reason}`,
      );
      return Response.json(
        { error: required ? "turnstile_required" : "turnstile_failed" },
        { status: 403, headers },
      );
    }
    console.error(
      `group-inquiries turnstile unavailable ip=${ip} reason=${turnstile.reason}`,
    );
    return Response.json({ error: "turnstile_unavailable" }, { status: 503, headers });
  }

  const input = parsed.data;
  try {
    await insertGroupInquiry({
      name: input.name,
      email: input.email,
      organisation: input.organisation ?? null,
      groupSize: input.group_size ?? null,
      window: input.window ?? null,
      message: input.message,
    });
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) {
      return Response.json({ error: "database_not_configured" }, { status: 503, headers });
    }
    console.error(
      "group enquiry store failed:",
      err instanceof Error ? err.message : "unknown",
    );
    return Response.json({ error: "inquiry_failed" }, { status: 500, headers });
  }

  // Queued, not sent — the outbox processor delivers (and retries) these.
  try {
    const { getDb } = await import("@/lib/db/client");
    const db = getDb();
    const emails = prepareGroupInquiryEmails({
      name: input.name,
      email: input.email,
      organisation: input.organisation ?? null,
      groupSize: input.group_size ?? null,
      window: input.window ?? null,
      message: input.message,
    });
    const { error } = await db.from("email_outbox").insert(
      emails.map((e) => ({ ...e, booking_id: null, payment_id: null })),
    );
    if (error) throw new Error(error.message);
  } catch (err) {
    // The enquiry is already recorded — never claim failure for that reason.
    console.error(
      "group enquiry mail could not be queued:",
      err instanceof Error ? err.message : "unknown",
    );
  }

  return Response.json(
    { ok: true },
    { status: 201, headers },
  );
}