import { DatabaseNotConfiguredError } from "@/lib/db/client";
import { clientIp } from "@/lib/client-ip";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { FireCircleCheckoutError, startFireCircleCheckout } from "@/lib/fire-circle/checkout";
import {
  PesapalApiError,
  PesapalNotConfiguredError,
} from "@/lib/payments/pesapal";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const ip = clientIp(request);
  const rl = await checkRateLimit({
    name: "fire-circle-pay",
    limit: 8,
    windowSec: 15 * 60,
    onFailure: "open",
    ip,
  });
  const headers = rateLimitHeaders(rl);
  if (!rl.allowed) {
    return Response.json({ error: "rate_limited" }, { status: 429, headers });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400, headers });
  }
  const token = (body as { token?: unknown }).token;
  if (typeof token !== "string") {
    return Response.json({ error: "invalid_request" }, { status: 400, headers });
  }

  try {
    const result = await startFireCircleCheckout(token);
    return Response.json({ ok: true, checkoutUrl: result.checkoutUrl }, { headers });
  } catch (err) {
    if (err instanceof FireCircleCheckoutError) {
      const status =
        err.message === "already_paid" || err.message === "payment_in_progress"
          ? 409
          : 404;
      return Response.json({ error: err.message }, { status, headers });
    }
    if (err instanceof DatabaseNotConfiguredError) {
      return Response.json({ error: "database_not_configured" }, { status: 503, headers });
    }
    if (err instanceof PesapalNotConfiguredError || err instanceof PesapalApiError) {
      return Response.json({ error: "payment_unavailable" }, { status: 503, headers });
    }
    console.error("fire circle checkout failed:", err instanceof Error ? err.message : "unknown");
    return Response.json({ error: "checkout_failed" }, { status: 500, headers });
  }
}
