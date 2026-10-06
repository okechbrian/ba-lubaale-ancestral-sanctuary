"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  amounts: number[];
}

type State = "idle" | "busy" | "redirected" | "error";

/**
 * Voucher purchase form. It only chooses an amount from the owner's published
 * list — the server re-checks it, so a tampered request cannot invent a price.
 * On success we send the guest to Pesapal's hosted page and store the payment
 * id so the return-from-Pesapal screen can confirm payment landed.
 */
export default function VoucherBuyForm({ amounts }: Props) {
  const [amount, setAmount] = useState(String(amounts[0] ?? ""));
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [recipient, setRecipient] = useState("");
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState<string | null>(null);
  // Read once during render: this is a build-time inlined public value, not
  // something that changes while the page is open.
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null;
  const widgetRef = useRef<HTMLDivElement | null>(null);
  const widgetId = useRef<string | null>(null);

  // Turnstile: rendered explicitly, and only when a site key is configured.
  useEffect(() => {
    const key = siteKey;
    if (!key) return;
    const render = () => {
      const turnstile = (window as unknown as {
        turnstile?: {
          render: (el: HTMLElement, opts: Record<string, unknown>) => string;
          reset: (id?: string) => void;
        };
      }).turnstile;
      if (!turnstile || !widgetRef.current || widgetId.current) return;
      widgetId.current = turnstile.render(widgetRef.current, {
        sitekey: key,
        callback: () => setMessage(null),
      });
    };
    if ((window as unknown as { turnstile?: unknown }).turnstile) {
      render();
      return;
    }
    const script = document.createElement("script");
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
    window.addEventListener("onTurnstileLoad", render);
    return () => window.removeEventListener("onTurnstileLoad", render);
  }, [siteKey]);

  function resetWidget() {
    const turnstile = (window as unknown as {
      turnstile?: { reset: (id?: string) => void };
    }).turnstile;
    if (turnstile && widgetId.current) turnstile.reset(widgetId.current);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    setMessage(null);

    const turnstile = (window as unknown as {
      turnstile?: { getResponse: (id?: string) => string | undefined };
    }).turnstile;
    const token =
      siteKey && turnstile && widgetId.current
        ? turnstile.getResponse(widgetId.current)
        : undefined;

    try {
      const res = await fetch("/api/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount_usd: Number(amount),
          email,
          name: name || undefined,
          recipient_email: recipient || undefined,
          cf_turnstile_response: token,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        checkout_url?: string;
      };

      if (!res.ok || !body.checkout_url) {
        setState("error");
        setMessage(errorMessage(body.error, body.message));
        resetWidget();
        return;
      }

      // Remember the payment so /vouchers/thank-you can confirm the payment.
      try {
        window.sessionStorage.setItem("voucher_payment", body.checkout_url);
      } catch {
        /* private mode — the thank-you page just says "check your email" */
      }
      setState("redirected");
      window.location.href = body.checkout_url;
    } catch {
      setState("error");
      setMessage(
        "We could not reach the payment service. Please try again in a moment.",
      );
      resetWidget();
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-md border border-mist bg-white p-6 sm:p-8"
    >
      <div className="space-y-4">
        <div>
          <label
            htmlFor="voucher-amount"
            className="block text-xs font-medium text-ink/60"
          >
            Voucher amount (USD)
          </label>
          <select
            id="voucher-amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded-md border border-mist bg-cream px-3 py-2.5 text-sm text-ink focus:border-bark focus:outline-none"
          >
            {amounts.map((a) => (
              <option key={a} value={a}>
                USD {a}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="voucher-email"
              className="block text-xs font-medium text-ink/60"
            >
              Your email (receives the code)
            </label>
            <input
              id="voucher-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="mt-1 w-full rounded-md border border-mist bg-cream px-3 py-2.5 text-sm text-ink focus:border-bark focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="voucher-name"
              className="block text-xs font-medium text-ink/60"
            >
              Your name (optional)
            </label>
            <input
              id="voucher-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className="mt-1 w-full rounded-md border border-mist bg-cream px-3 py-2.5 text-sm text-ink focus:border-bark focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="voucher-recipient"
            className="block text-xs font-medium text-ink/60"
          >
            Gift it to someone else? (optional email)
          </label>
          <input
            id="voucher-recipient"
            type="email"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="mt-1 w-full rounded-md border border-mist bg-cream px-3 py-2.5 text-sm text-ink focus:border-bark focus:outline-none"
          />
          <p className="mt-1 text-xs text-ink/50">
            They receive the code too; you keep yours as the record of purchase.
          </p>
        </div>

        {/* Honeypot — hidden from humans, tempting to bots. */}
        <div className="hidden" aria-hidden="true">
          <label htmlFor="voucher-website">Website</label>
          <input
            id="voucher-website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        {siteKey && <div ref={widgetRef} />}

        <button
          type="submit"
          disabled={state === "busy" || state === "redirected"}
          className="rounded-md bg-lake px-6 py-3 text-sm font-semibold text-cream hover:bg-lake/80 disabled:opacity-60"
        >
          {state === "busy"
            ? "Opening secure payment…"
            : state === "redirected"
              ? "Redirecting…"
              : "Pay securely"}
        </button>

        {message && (
          <p className="text-sm text-ember" role="alert">
            {message}
          </p>
        )}
      </div>
    </form>
  );
}

function errorMessage(error?: string, detail?: string): string {
  switch (error) {
    case "rate_limited":
      return "Too many attempts from here. Please try again later.";
    case "amount_not_available":
      return detail ?? "That amount is not available.";
    case "turnstile_required":
      return "Please complete the verification box and try again.";
    case "turnstile_failed":
      return "Verification failed. Please try again.";
    case "turnstile_unavailable":
      return "Verification is temporarily unavailable. Please try again shortly.";
    case "payment_provider_unavailable":
      return "Payments are temporarily unavailable. Please try again shortly.";
    case "database_not_configured":
      return "Voucher sales are temporarily unavailable. Please write to us.";
    case "invalid_request":
      return "Please check the details and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}