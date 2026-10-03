import { DatabaseNotConfiguredError } from "@/lib/db/client";
import {
  VoucherCheckoutNotAllowedError,
  VoucherUnavailableError,
} from "@/lib/db/vouchers";
import { VoucherPriceError } from "@/lib/booking/pricing";
import { clientIp } from "@/lib/client-ip";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { voucherRequestSchema } from "@/lib/vouchers/schema";
import { createVoucherCheckout } from "@/lib/vouchers/checkout";
import {
  PesapalApiError,
  PesapalNotConfiguredError,
  isPesapalConfigured,
} from "@/lib/payments/pesapal";

export const dynamic = "force-dynamic";

/**
 * POST /api/vouchers — start a voucher purchase.
 *
 * Order of operations mirrors /api/bookings: rate limit, then honeypot (before
 * zod, so a bot never learns a field name), then validation, then Turnstile,
 * then the owner's price check.
 * The amount is checked against the owner's /admin/settings list inside
 * createVoucherCheckout — the client cannot invent a price. Nothing is stored
 * until Pesapal accepts the order.
 */
export async function POST(request: Request): Promise<Response> {
  const rl = await checkRateLimit({
    name: "vouchers",
    limit: 5,
    windowSec: 15 * 60,
    onFailure: "open",
    ip: clientIp(request),
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

  // A JSON body that is not an object — `null`, `"text"`, `42`, `[1,2]` —
  // reaches the honeypot read below as a property access on a non-object.
  // Reject it first, so those bodies get the same honest 400 as broken JSON
  // instead of a 500 from reading `.website` off null.
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return Response.json(
      { error: "invalid_request", issues: [] },
      { status: 400, headers: rlHeaders },
    );
  }

  const honeypot = (body as { website?: unknown }).website;
  if (typeof honeypot === "string" && honeypot.length > 0) {
    console.warn(`vouchers honeypot triggered ip=${clientIp(request)}`);
    return Response.json(
      { error: "invalid_request" },
      { status: 400, headers: rlHeaders },
    );
  }

  const parsed = voucherRequestSchema.safeParse(body);
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

  const input = parsed.data;
  const ip = clientIp(request);

  // Turnstile is verified AFTER schema validation (so a malformed request never
  // burns the single-use token) and BEFORE any database write.
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
        `vouchers turnstile ${required ? "missing token" : "rejected"} ` +
          `ip=${ip} reason=${turnstile.reason}`,
      );
      return Response.json(
        { error: required ? "turnstile_required" : "turnstile_failed" },
        { status: 403, headers },
      );
    }
    console.error(
      `vouchers turnstile unavailable ip=${ip} reason=${turnstile.reason}`,
    );
    return Response.json(
      { error: "turnstile_unavailable" },
      { status: 503, headers },
    );
  }

  if (!isPesapalConfigured()) {
    return Response.json(
      { error: "payment_provider_unavailable" },
      { status: 503, headers },
    );
  }

  try {
    const result = await createVoucherCheckout({
      amountUsd: input.amount_usd,
      buyerEmail: input.email,
      buyerName: input.name,
      recipientEmail: input.recipient_email ?? null,
    });
    return Response.json(
      {
        checkout_url: result.checkoutUrl,
        amount_usd: result.amountUsd,
      },
      { status: 201, headers },
    );
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) {
      return Response.json(
        { error: "database_not_configured" },
        { status: 503, headers },
      );
    }
    if (err instanceof VoucherPriceError) {
      // The requested amount is not on sale — say so instead of charging a
      // rounded-up "nearest" price we invented.
      return Response.json(
        { error: "amount_not_available", message: err.message },
        { status: 400, headers },
      );
    }
    if (err instanceof VoucherUnavailableError) {
      // No amounts are published (or settings are unavailable, in which case
      // they read as empty). Either way the honest answer is "not on sale".
      return Response.json(
        { error: "vouchers_unavailable" },
        { status: 503, headers },
      );
    }
    if (err instanceof VoucherCheckoutNotAllowedError) {
      return Response.json({ error: "checkout_not_allowed" }, { status: 409, headers });
    }
    if (err instanceof PesapalNotConfiguredError) {
      return Response.json(
        { error: "payment_provider_unavailable" },
        { status: 503, headers },
      );
    }
    if (err instanceof PesapalApiError) {
      console.error(`voucher checkout rejected by provider: ${err.message}`);
      return Response.json(
        { error: "payment_provider_error" },
        { status: 502, headers },
      );
    }
    console.error(
      "voucher checkout failed:",
      err instanceof Error ? err.message : "unknown",
    );
    return Response.json({ error: "checkout_failed" }, { status: 500, headers });
  }
}