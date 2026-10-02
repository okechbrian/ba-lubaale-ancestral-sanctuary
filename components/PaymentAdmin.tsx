"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PaymentView {
  id: string;
  kind: string;
  amount_usd: string | number;
  amount_ugx: string | number;
  status: string;
  created_at: string;
}

export default function PaymentAdmin({
  bookingId,
  configured,
  depositAllowed,
  balanceAllowed,
  payments,
}: {
  bookingId: string;
  configured: boolean;
  depositAllowed: boolean;
  balanceAllowed: boolean;
  payments: PaymentView[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"deposit" | "balance" | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(kind: "deposit" | "balance") {
    setBusy(kind);
    setError(null);
    setCheckoutUrl(null);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: bookingId, kind, email_guest: true }),
      });
      const body: { checkout_url?: string; error?: string } = await res
        .json()
        .catch(() => ({}));
      if (res.status === 201 && body.checkout_url) {
        setCheckoutUrl(body.checkout_url);
        router.refresh();
        return;
      }
      if (body.error === "payment_provider_unavailable") {
        setError("Payments are not configured (PESAPAL_* missing).");
      } else if (body.error === "checkout_not_allowed") {
        setError("Not allowed right now — check the deposit/balance order.");
        router.refresh();
      } else if (body.error === "unauthorized") {
        setError("Your session expired. Sign in again.");
      } else {
        setError("Could not create the payment link. Try again.");
      }
    } catch {
      setError("Network error — no payment link was created.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="mt-6 rounded-md border border-mist bg-white p-4">
      <h2 className="font-display text-lg font-semibold text-ink">Payments</h2>

      {!configured && (
        <p className="mt-2 rounded-md border border-ember/40 bg-ember/5 p-3 text-sm text-ink">
          Payments not configured. Set <code>PESAPAL_ENV</code>,{" "}
          <code>PESAPAL_CONSUMER_KEY</code>, <code>PESAPAL_CONSUMER_SECRET</code>{" "}
          and <code>PESAPAL_IPN_URL</code> (see .env.example) to create real
          hosted-checkout links. Nothing fake is offered meanwhile.
        </p>
      )}

      {payments.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="uppercase text-ink/50">
              <tr>
                <th className="py-2 pr-3">Kind</th>
                <th className="py-2 pr-3">USD</th>
                <th className="py-2 pr-3">UGX</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mist">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="py-2 pr-3 text-ink">{p.kind}</td>
                  <td className="py-2 pr-3 text-ink/70">
                    ${Number(p.amount_usd).toLocaleString("en-US")}
                  </td>
                  <td className="py-2 pr-3 text-ink/70">
                    {Number(p.amount_ugx).toLocaleString("en-US")}
                  </td>
                  <td className="py-2 pr-3">
                    <span
                      className={`rounded-full px-2 py-0.5 font-medium ${
                        p.status === "completed"
                          ? "bg-canopy/15 text-canopy"
                          : p.status === "failed"
                            ? "bg-ember/15 text-ember"
                            : "bg-mist text-ink/60"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-ink/50">
                    {p.created_at.slice(0, 16).replace("T", " ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {configured && (depositAllowed || balanceAllowed) && (
        <div className="mt-4 flex flex-wrap gap-3">
          {depositAllowed && (
            <button
              onClick={() => void create("deposit")}
              disabled={busy !== null}
              className="rounded-md bg-lake px-5 py-2 text-sm font-semibold text-cream hover:bg-lake/80 disabled:opacity-60"
            >
              {busy === "deposit"
                ? "Creating..."
                : "Deposit link — create & email guest"}
            </button>
          )}
          {balanceAllowed && (
            <button
              onClick={() => void create("balance")}
              disabled={busy !== null}
              className="rounded-md border border-lake px-5 py-2 text-sm font-semibold text-lake hover:bg-lake/5 disabled:opacity-60"
            >
              {busy === "balance"
                ? "Creating..."
                : "Balance link — create & email guest"}
            </button>
          )}
        </div>
      )}

      {checkoutUrl && (
        <div className="mt-3 rounded-md bg-cream p-3">
          <p className="text-xs text-ink/60">
            Hosted checkout (also emailed to the guest):
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <a
              href={checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-sm text-lake hover:underline"
            >
              {checkoutUrl}
            </a>
            <button
              onClick={() => {
                void navigator.clipboard.writeText(checkoutUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="rounded bg-mist px-2 py-1 text-xs font-semibold text-ink hover:bg-mist/70"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-ember">{error}</p>}
    </section>
  );
}
