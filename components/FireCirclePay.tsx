"use client";

import { useState } from "react";

export default function FireCirclePay({ token, feeUsd }: { token: string; feeUsd: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function pay() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/fire-circle/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        checkoutUrl?: string;
        error?: string;
      };
      if (body.checkoutUrl) {
        window.location.href = body.checkoutUrl;
        return;
      }
      setBusy(false);
      setMessage(
        body.error === "payment_unavailable"
          ? "Card and mobile-money payment is not open yet. Your seat is held. Nothing has been taken."
          : body.error === "payment_in_progress"
            ? "A payment for this seat is already open. Nothing new has been taken."
            : "Payment could not be started. Nothing has been taken.",
      );
    } catch {
      setBusy(false);
      setMessage("Payment could not be started. Nothing has been taken.");
    }
  }

  return (
    <div className="mt-8">
      <p className="text-ink/80">
        The fee for this seat is USD {Number(feeUsd).toLocaleString("en-US")}.
      </p>
      <button
        type="button"
        onClick={pay}
        disabled={busy}
        className="mt-4 rounded-md bg-lake px-6 py-3 text-sm font-semibold text-cream hover:bg-lake/80 disabled:opacity-60"
      >
        {busy ? "Opening payment\u2026" : "Pay for this seat"}
      </button>
      <p className="mt-3 text-xs text-ink/60">
        Cards and mobile money. Nothing is taken until you finish on the payment page.
      </p>
      {message && <p className="mt-3 text-sm text-ember">{message}</p>}
    </div>
  );
}
