import { DatabaseNotConfiguredError } from "@/lib/db/client";
import { insertFireCircleRequest } from "@/lib/db/fire-circle";
import { clientIp } from "@/lib/client-ip";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { fireCircleRequestSchema } from "@/lib/fire-circle/schema";
import { prepareFireCircleReceivedEmails } from "@/lib/fire-circle/emails";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const ip = clientIp(request);
  const rl = await checkRateLimit({
    name: "fire-circle",
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
    return Response.json({ error: "invalid_request" }, { status: 400, headers: rlHeaders });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return Response.json({ error: "invalid_request" }, { status: 400, headers: rlHeaders });
  }

  const honeypot = (body as { website?: unknown }).website;
  if (typeof honeypot === "string" && honeypot.length > 0) {
    return Response.json({ error: "invalid_request" }, { status: 400, headers: rlHeaders });
  }

  const parsed = fireCircleRequestSchema.safeParse(body);
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
      return Response.json(
        { error: required ? "turnstile_required" : "turnstile_failed" },
        { status: 403, headers },
      );
    }
    return Response.json({ error: "turnstile_unavailable" }, { status: 503, headers });
  }

  try {
    await insertFireCircleRequest(parsed.data);
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) {
      return Response.json({ error: "database_not_configured" }, { status: 503, headers });
    }
    console.error("fire circle store failed:", err instanceof Error ? err.message : "unknown");
    return Response.json({ error: "request_failed" }, { status: 500, headers });
  }

  try {
    const { getDb } = await import("@/lib/db/client");
    const emails = prepareFireCircleReceivedEmails(parsed.data);
    const { error } = await getDb()
      .from("email_outbox")
      .insert(
        emails.map((e) => ({
          category: e.category,
          recipient: e.to,
          subject: e.subject,
          body: e.body,
          booking_id: null,
          payment_id: null,
        })),
      );
    if (error) throw new Error(error.message);
  } catch (err) {
    console.error(
      "fire circle mail could not be queued:",
      err instanceof Error ? err.message : "unknown",
    );
  }

  return Response.json({ ok: true }, { status: 201, headers });
}
