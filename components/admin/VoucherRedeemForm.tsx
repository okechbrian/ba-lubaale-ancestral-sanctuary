"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface BookingOption {
  id: string;
  name: string;
  check_in: string;
  check_out: string;
  status: string;
}

/**
 * Owner actions on a voucher: redeem the code against a booking, or void an
 * unused one. The CODE is what gets submitted — the browser is never trusted
 * with an id it could tamper with, and the server matches on the code's
 * fingerprint in constant time.
 */
export default function VoucherRedeemForm({
  bookings,
}: {
  bookings: BookingOption[];
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(action: "redeem" | "void") {
    if (action === "redeem" && (!code.trim() || !bookingId)) {
      setMsg({
        ok: false,
        text: "Enter the code and choose the booking it pays for.",
      });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "redeem"
            ? { action: "redeem", code: code.trim(), booking_id: bookingId }
            : {
                action: "void",
                voucher_id: "",
                reason: "voided from the console",
              },
        ),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        booking_id?: string | null;
      };
      if (!res.ok) {
        setMsg({ ok: false, text: messageFor(action, body) });
        return;
      }
      setCode("");
      setBookingId("");
      setMsg({
        ok: true,
        text:
          action === "redeem"
            ? "Redeemed. The booking now carries this voucher."
            : "Voided.",
      });
      router.refresh();
    } catch {
      setMsg({ ok: false, text: "Network error — nothing was changed." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 rounded-md border border-mist bg-white p-4">
      <h2 className="font-display text-base font-semibold text-ink">
        Redeem a voucher
      </h2>
      <p className="mt-1 text-xs text-ink/50">
        Paste the code from the holder&apos;s email. It is matched against its
        fingerprint — a wrong code and an unknown code are treated the same.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="voucher-code"
            className="block text-xs font-medium text-ink/60"
          >
            Voucher code
          </label>
          <input
            id="voucher-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="1A2B 3C4D 5E6F 7081 92A3 B4C5 D6E7 F809"
            autoComplete="off"
            spellCheck={false}
            className="mt-1 w-full rounded-md border border-mist bg-cream px-3 py-2 font-mono text-sm text-ink focus:border-bark focus:outline-none"
          />
        </div>
        <div>
          <label
            htmlFor="voucher-booking"
            className="block text-xs font-medium text-ink/60"
          >
            Applies to booking
          </label>
          <select
            id="voucher-booking"
            value={bookingId}
            onChange={(e) => setBookingId(e.target.value)}
            className="mt-1 w-full rounded-md border border-mist bg-cream px-3 py-2 text-sm text-ink focus:border-bark focus:outline-none"
          >
            <option value="">Choose a booking…</option>
            {bookings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} · {b.check_in} → {b.check_out} ({b.status})
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => submit("redeem")}
          disabled={busy}
          className="rounded-md bg-lake px-5 py-2 text-sm font-semibold text-cream hover:bg-lake/80 disabled:opacity-60"
        >
          {busy ? "Working..." : "Mark redeemed"}
        </button>
        {msg && (
          <p className={`text-sm ${msg.ok ? "text-canopy" : "text-ember"}`}>
            {msg.text}
          </p>
        )}
      </div>
    </section>
  );
}

function messageFor(
  action: "redeem" | "void",
  body: { error?: string; booking_id?: string | null },
): string {
  switch (body.error) {
    case "voucher_not_found":
      return "No voucher matches that code.";
    case "voucher_already_redeemed":
      return body.booking_id
        ? `Already redeemed against booking ${body.booking_id.slice(0, 8)} — a voucher cannot be used twice.`
        : "Already redeemed — a voucher cannot be used twice.";
    case "voucher_void":
      return "That voucher was voided.";
    case "booking_not_found":
      return "That booking no longer exists.";
    case "booking_not_redeemable":
      return "A declined booking cannot take a voucher.";
    case "unauthorized":
      return "Your session expired. Sign in again.";
    case "database_not_configured":
      return "Database not configured — nothing was changed.";
    default:
      return `${action === "redeem" ? "Redeem" : "Void"} failed (${body.error ?? "unknown"}).`;
  }
}