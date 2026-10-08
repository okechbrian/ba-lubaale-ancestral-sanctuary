"use client";

import { useEffect, useRef, useState } from "react";

type State = "idle" | "busy" | "sent" | "error";

export default function FireCircleForm() {
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null;
  const widgetRef = useRef<HTMLDivElement | null>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    const key = siteKey;
    if (!key) return;
    const render = () => {
      const turnstile = (window as unknown as {
        turnstile?: { render: (el: HTMLElement, opts: Record<string, unknown>) => string };
      }).turnstile;
      if (!turnstile || !widgetRef.current || widgetId.current) return;
      widgetId.current = turnstile.render(widgetRef.current, { sitekey: key });
    };
    if ((window as unknown as { turnstile?: unknown }).turnstile) {
      render();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = render;
    document.head.appendChild(script);
  }, [siteKey]);

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
    const website = (
      document.getElementById("fire-website") as HTMLInputElement | null
    )?.value;
    try {
      const res = await fetch("/api/fire-circle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          message: form.message,
          website,
          cf_turnstile_response: token,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setState("error");
        setMessage(errorMessage(body.error));
        return;
      }
      setState("sent");
    } catch {
      setState("error");
      setMessage("We could not reach the request service. Please try again.");
    }
  }

  if (state === "sent") {
    return (
      <div className="rounded-md border border-canopy/30 bg-cream p-8 text-center">
        <p className="font-display text-xl text-ink">Request received.</p>
        <p className="mt-3 text-sm text-ink/70">
          Nothing is reserved and nothing has been paid. If there is a place,
          the fee and the seat link come by email.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-md border border-mist bg-cream p-6">
      <label className="block text-xs font-medium text-ink/70" htmlFor="fire-name">
        Your name
        <input
          id="fire-name"
          required
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="mt-1 w-full rounded-md border border-mist bg-white px-3 py-2 text-sm text-ink"
        />
      </label>
      <label className="block text-xs font-medium text-ink/70" htmlFor="fire-email">
        Email
        <input
          id="fire-email"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          className="mt-1 w-full rounded-md border border-mist bg-white px-3 py-2 text-sm text-ink"
        />
      </label>
      <label className="block text-xs font-medium text-ink/70" htmlFor="fire-message">
        Why this circle
        <textarea
          id="fire-message"
          required
          rows={5}
          value={form.message}
          onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
          className="mt-1 w-full rounded-md border border-mist bg-white px-3 py-2 text-sm text-ink"
        />
      </label>
      <div className="hidden" aria-hidden="true">
        <label htmlFor="fire-website">Website</label>
        <input id="fire-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {siteKey && <div ref={widgetRef} />}
      <button
        type="submit"
        disabled={state === "busy"}
        className="rounded-md bg-lake px-6 py-3 text-sm font-semibold text-cream hover:bg-lake/80 disabled:opacity-60"
      >
        {state === "busy" ? "Sending\u2026" : "Request a seat"}
      </button>
      {message && (
        <p className="text-sm text-ember" role="alert">
          {message}
        </p>
      )}
    </form>
  );
}

function errorMessage(error?: string): string {
  switch (error) {
    case "rate_limited":
      return "Too many attempts from here. Please try again later.";
    case "turnstile_required":
      return "Please complete the verification box and try again.";
    case "turnstile_failed":
      return "Verification failed. Please try again.";
    case "database_not_configured":
      return "Requests are temporarily unavailable. Please write to us instead.";
    default:
      return "Something went wrong. Please try again.";
  }
}
