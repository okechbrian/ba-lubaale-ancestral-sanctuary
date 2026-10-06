import { z } from "zod";
import { DatabaseNotConfiguredError } from "@/lib/db/client";
import { requestSubscription } from "@/lib/db/subscribers";
import { sendAndLog } from "@/lib/email/sender";
import {
  subscriberAlreadySubscribedEmail,
  subscriberConfirmEmail,
} from "@/lib/email/templates";
import { clientIp } from "@/lib/client-ip";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Same shape rules as the booking intake: a shared email field plus a
 * honeypot `website` field no human ever sees.
 */
const subscribeSchema = z.object({
  email: z.string().email("A valid email is required").max(320),
  website: z.string().max(0).optional(), // honeypot (route enforces it first)
});

/**
 * POST /api/subscribers — double opt-in signup for the mailing list.
 * Order of defence (mirrors /api/bookings): per-IP rate limit (5 / 15 min,
 * fail-open — availability first for a newsletter box; disabled loudly when
 * UPSTASH keys are missing) -> honeypot -> zod.
 *
 * Deliberately NO Turnstile here: the double opt-in itself is the spam brake
 * (a bot cannot get a real address subscribed without the human clicking the
 * confirm link), and the box sits in the global footer where a widget on
 * every page would be noise. Rate limit + honeypot cover the rest.
 *
 * The response is ALWAYS 202 {status:"pending_confirmation"} for any valid
 * email, whatever the stored status — no address enumeration. Which email
 * (if any) goes out is decided server-side: pending -> confirm link;
 * confirmed -> "already subscribed"; unsubscribed -> back to pending with a
 * fresh confirm link.
 *
 * 400 invalid/missing email · 400 honeypot · 429 rate limited ·
 * 503 unavailable (no database / no rate limiter in fail-closed) · 500 failed.
 */
export async function POST(request: Request): Promise<Response> {
  const ip = clientIp(request);

  const rl = await checkRateLimit({
    name: "subscribe",
    limit: 5,
    windowSec: 15 * 60,
    onFailure: "open",
    ip,
  });
  const headers: Record<string, string> = rateLimitHeaders(rl);
  if (!rl.allowed && rl.mode === "fail-closed") {
    return Response.json(
      { error: "rate_limiter_unavailable" },
      { status: 503, headers },
    );
  }
  if (!rl.allowed) {
    return Response.json(
      { error: "rate_limited", retry_after: rl.retryAfterSec },
      { status: 429, headers },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400, headers });
  }

  // Honeypot before zod: a filled `website` is a bot — loud warn, generic 400
  // that never echoes the field name, nothing stored, no email sent.
  const website =
    json && typeof json === "object"
      ? (json as Record<string, unknown>).website
      : undefined;
  if (typeof website === "string" && website.length > 0) {
    console.warn(
      `subscribe honeypot triggered ip=${ip} — rejected without storing`,
    );
    return Response.json(
      {
        error: "invalid_request",
        message: "Please review the form and try again.",
      },
      { status: 400, headers },
    );
  }

  const parsed = subscribeSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      {
        error: "invalid_request",
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400, headers },
    );
  }

  try {
    const result = await requestSubscription(parsed.data.email);

    // Emails are logged even without SMTP (status=stubbed), so the owner can
    // see exactly who was mailed in /admin/emails. Failures never change the
    // API response — the address is already stored by then.
    if (result.sendConfirmation) {
      const mail = subscriberConfirmEmail(result.confirmToken);
      await sendAndLog(
        "subscriber_confirm",
        parsed.data.email.trim().toLowerCase(),
        mail.subject,
        mail.text,
      );
    } else if (result.sendAlready) {
      const mail = subscriberAlreadySubscribedEmail(result.unsubToken);
      await sendAndLog(
        "subscriber_already",
        parsed.data.email.trim().toLowerCase(),
        mail.subject,
        mail.text,
      );
    }

    return Response.json(
      {
        status: "pending_confirmation",
        message:
          "Check your inbox for a confirmation link. Nothing arrives until you confirm.",
      },
      { status: 202, headers },
    );
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) {
      return Response.json(
        { error: "database_not_configured" },
        { status: 503, headers },
      );
    }
    console.error(
      "subscribe POST failed:",
      err instanceof Error ? err.message : "unknown",
    );
    return Response.json({ error: "subscribe_failed" }, { status: 500, headers });
  }
}
