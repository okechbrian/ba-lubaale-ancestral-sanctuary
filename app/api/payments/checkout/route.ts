import { z } from "zod";
import { isAdminRequest } from "@/lib/admin/session";
import { DatabaseNotConfiguredError } from "@/lib/db/client";
import { getBooking } from "@/lib/db/bookings";
import { sendAndLog } from "@/lib/email/sender";
import { paymentLinkGuest } from "@/lib/email/templates";
import {
  CheckoutNotAllowedError,
  createOrReuseCheckout,
} from "@/lib/payments/checkout";
import {
  PesapalApiError,
  PesapalNotConfiguredError,
} from "@/lib/payments/pesapal";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  booking_id: z.string().uuid(),
  kind: z.enum(["deposit", "balance"]),
  email_guest: z.boolean().optional(),
});

/**
 * POST /api/payments/checkout (admin) — create/reopen a hosted Pesapal
 * checkout for a booking and optionally email the link to the guest.
 * 403/401 session · 409 gate · 503 provider missing · 502 provider error ·
 * 201 { checkout_url, payment_id, reused }.
 */
export async function POST(request: Request): Promise<Response> {
  if (!(await isAdminRequest(request))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    const booking = await getBooking(parsed.data.booking_id);
    if (!booking) return Response.json({ error: "not_found" }, { status: 404 });

    const result = await createOrReuseCheckout(booking, parsed.data.kind);

    if (parsed.data.email_guest !== false) {
      const email = paymentLinkGuest(booking, {
        kind: parsed.data.kind,
        amountUsd: result.amountUsd,
        amountUgx: result.amountUgx,
        url: result.checkoutUrl,
      });
      await sendAndLog(
        `payment_link_${parsed.data.kind}`,
        booking.email,
        email.subject,
        email.text,
      );
    }

    return Response.json(
      {
        checkout_url: result.checkoutUrl,
        payment_id: result.payment.id,
        reused: result.reused,
        amount_usd: result.amountUsd,
        amount_ugx: result.amountUgx,
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) {
      return Response.json({ error: "database_not_configured" }, { status: 503 });
    }
    if (err instanceof PesapalNotConfiguredError) {
      return Response.json(
        { error: "payment_provider_unavailable" },
        { status: 503 },
      );
    }
    if (err instanceof CheckoutNotAllowedError) {
      return Response.json({ error: "checkout_not_allowed" }, { status: 409 });
    }
    if (err instanceof PesapalApiError) {
      console.error("pesapal checkout failed:", err.message);
      return Response.json({ error: "payment_provider_error" }, { status: 502 });
    }
    console.error(
      "checkout failed:",
      err instanceof Error ? err.message : "unknown",
    );
    return Response.json({ error: "checkout_failed" }, { status: 500 });
  }
}
