import { AvailabilityConflictError } from "@/lib/booking/availability";
import { bookingRequestSchema } from "@/lib/booking/schema";
import { DatabaseNotConfiguredError } from "@/lib/db/client";
import { insertBooking } from "@/lib/db/bookings";
import { assertWindowAvailable } from "@/lib/db/availability";
import { sendAndLog } from "@/lib/email/sender";
import { bookingReceivedGuest, ownerNewBooking } from "@/lib/email/templates";
import { clientIp } from "@/lib/client-ip";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import type { NewBooking } from "@/lib/db/bookings";

export const dynamic = "force-dynamic";

/**
 * POST /api/bookings — server-validated stay intake.
 * Order of defence: per-IP rate limit (3/hour, fail-open on backend errors,
 * disabled loudly when UPSTASH keys are missing) -> honeypot (a filled
 * `website` field is a bot: loud warn, generic 400, nothing stored, field
 * name never echoed) -> zod validation -> Turnstile token (when both keys
 * are set; after validation so an invalid form never burns the single-use
 * token; fail-closed 503 when Cloudflare is unreachable) -> availability.
 * 400 invalid payload · 403 turnstile · 409 dates unavailable ·
 * 429 rate limited · 503 unavailable · 201 stored. Emails run after a
 * successful insert and never block the response path with an exception.
 */
export async function POST(request: Request): Promise<Response> {
  const ip = clientIp(request);

  const rl = await checkRateLimit({
    name: "bookings",
    limit: 3,
    windowSec: 60 * 60,
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

  // Honeypot: humans never see the `website` field; a filled value is a bot.
  // Checked before everything else so nothing is stored or verified, and the
  // 400 never echoes the field name (the old zod error told bots exactly
  // which hidden input to leave empty).
  const website =
    json && typeof json === "object"
      ? (json as Record<string, unknown>).website
      : undefined;
  if (typeof website === "string" && website.length > 0) {
    console.warn(
      `bookings honeypot triggered ip=${ip} — rejected without storing`,
    );
    return Response.json(
      {
        error: "invalid_request",
        message: "Please review the form and try again.",
      },
      { status: 400, headers },
    );
  }

  const parsed = bookingRequestSchema.safeParse(json);
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

  // Turnstile: only after schema validation (a bad form must not burn the
  // single-use token). Disabled loudly when keys are missing; 403/503 when
  // configured — an unverified token never reaches the database.
  const turnstile = await verifyTurnstile(
    parsed.data.cf_turnstile_response,
    ip,
  );
  headers["x-turnstile-mode"] = turnstile.mode;
  if (!turnstile.ok) {
    if (turnstile.kind === "rejected") {
      const required = turnstile.reason === "missing_token";
      console.warn(
        `bookings turnstile ${required ? "missing token" : "rejected"} ` +
          `ip=${ip} reason=${turnstile.reason}`,
      );
      return Response.json(
        { error: required ? "turnstile_required" : "turnstile_failed" },
        { status: 403, headers },
      );
    }
    console.error(
      `bookings turnstile unavailable ip=${ip} reason=${turnstile.reason}`,
    );
    return Response.json(
      { error: "turnstile_unavailable" },
      { status: 503, headers },
    );
  }

  const form = parsed.data;
  const input: NewBooking = {
    name: form.name,
    email: form.email,
    whatsapp: form.whatsapp || undefined,
    country: form.country,
    requested_window: form.requested_window || undefined,
    party: form.party,
    stay_slug: form.stay_slug,
    check_in: form.check_in,
    check_out: form.check_out,
    drawing: form.drawing,
    comfort: form.comfort,
    limits: form.limits || undefined,
    protocols: form.protocols === "yes",
    digital_sunset: form.digital_sunset === "yes",
    burden: form.burden,
  };

  try {
    await assertWindowAvailable({ check_in: form.check_in, check_out: form.check_out });
    const booking = await insertBooking(input);

    const guest = bookingReceivedGuest(booking);
    await sendAndLog(
      "booking_received_guest",
      booking.email,
      guest.subject,
      guest.text,
    );
    const ownerNotify = process.env.OWNER_NOTIFY_EMAIL;
    if (ownerNotify) {
      const owner = ownerNewBooking(booking);
      await sendAndLog("owner_new_booking", ownerNotify, owner.subject, owner.text);
    }

    return Response.json(
      { id: booking.id, status: booking.status },
      { status: 201, headers },
    );
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) {
      return Response.json(
        { error: "database_not_configured" },
        { status: 503, headers },
      );
    }
    if (err instanceof AvailabilityConflictError) {
      return Response.json(
        { error: "dates_unavailable", message: err.message },
        { status: 409, headers },
      );
    }
    console.error(
      "bookings POST failed:",
      err instanceof Error ? err.message : "unknown",
    );
    return Response.json({ error: "booking_failed" }, { status: 500, headers });
  }
}
