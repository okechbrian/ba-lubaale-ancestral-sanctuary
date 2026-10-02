"use client";

import { useState } from "react";

type State =
  | { kind: "idle" }
  | { kind: "busy" }
  | { kind: "done" }
  | { kind: "error"; message: string };

function messageFor(status: number, error: string | undefined): string {
  if (status === 400) return "That doesn't look like a valid email address.";
  if (status === 429)
    return "Too many attempts — please wait a few minutes and try again.";
  if (status === 503 && error === "database_not_configured")
    return "The mailing list isn't available right now.";
  if (status === 503)
    return "The mailing list is temporarily unavailable — try again shortly.";
  if (status === 500) return "Something went wrong — please try again.";
  return "Network error — please try again.";
}

/**
 * Footer signup box -> POST /api/subscribers (double opt-in). The server
 * answers the same way for every valid address (no enumeration); the real
 * signal arrives by email. Honeypot field hidden exactly like /apply.
 */
export function SubscribeBox() {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [state, setState] = useState<State>({ kind: "idle" });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state.kind === "busy" || state.kind === "done") return;
    if (!email.trim()) {
      setState({ kind: "error", message: "Enter your email address." });
      return;
    }
    setState({ kind: "busy" });
    try {
      const res = await fetch("/api/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, website }),
      });
      if (res.status === 202) {
        setState({ kind: "done" });
        setEmail("");
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setState({ kind: "error", message: messageFor(res.status, body.error) });
    } catch {
      setState({
        kind: "error",
        message: "Network error — please try again.",
      });
    }
  }

  return (
    <div>
      <p className="text-xs font-semibold tracking-widest text-bark-soft uppercase">
        Stay in Touch
      </p>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-cream/70">
        Occasional notes from the sanctuary — stories from the land and the
        household, and the dates we open. Confirm through your email;
        unsubscribe any time.
      </p>

      {state.kind === "done" ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <p className="text-sm font-semibold text-leaf">
            Almost there — check your inbox and confirm your subscription.
          </p>
          <button
            type="button"
            className="text-xs text-cream/50 underline transition-colors hover:text-cream/80"
            onClick={() => setState({ kind: "idle" })}
          >
            Use another address
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-4 max-w-md">
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="sr-only" htmlFor="subscribe-email">
              Email address
            </label>
            <input
              id="subscribe-email"
              type="email"
              required
              autoComplete="email"
              placeholder="Your email address"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (state.kind === "error") setState({ kind: "idle" });
              }}
              className="w-full rounded-md border border-cream/20 bg-cream/10 px-3 py-2.5 text-sm text-cream placeholder:text-cream/40 focus:border-leaf focus:outline-none"
            />
            <button
              type="submit"
              disabled={state.kind === "busy"}
              className="rounded-md bg-leaf px-5 py-2.5 text-sm font-semibold text-dusk transition-colors hover:bg-leaf/90 disabled:opacity-50"
            >
              {state.kind === "busy" ? "Sending…" : "Subscribe"}
            </button>
          </div>

          {/* Honeypot: humans never see or focus this. */}
          <input
            type="text"
            name="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="hidden"
          />

          {state.kind === "error" && (
            <p className="mt-3 text-sm text-bark-soft">{state.message}</p>
          )}
        </form>
      )}
    </div>
  );
}
