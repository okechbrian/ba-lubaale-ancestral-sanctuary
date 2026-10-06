"use client";

import { useEffect, useRef, useState } from "react";

type State = "idle" | "busy" | "sent" | "error";

/**
 * /for-groups enquiry form. Reuses the /apply abuse stack (rate limit +
 * Turnstile) server-side; this side renders the widget explicitly when a site
 * key exists and hides a honeypot field.
 *
 * On success it says plainly: the enquiry was received, nothing is booked,
 * nothing was paid.
 */
export default function GroupInquiryForm() {
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [issues, setIssues] = useState<{ path: string; message: string }[]>([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    organisation: "",
    group_size: "",
    window: "",
    message: "",
  });
  // Build-time inlined public value; does not change while the page is open.
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null;
  const widgetRef = useRef<HTMLDivElement | null>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    const key = siteKey;
    if (!key) return;
    const render = () => {
      const turnstile = (window as unknown as {
        turnstile?: {
          render: (el: HTMLElement, opts: Record<string, unknown>) => string;
        };
      }).turnstile;
      if (!turnstile || !widgetRef.current || widgetId.current) return;
      widgetId.current = turnstile.render(widgetRef.current, { sitekey: key });
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
    setIssues([]);

    const turnstile = (window as unknown as {
      turnstile?: { getResponse: (id?: string) => string | undefined };
    }).turnstile;
    const token =
      siteKey && turnstile && widgetId.current
        ? turnstile.getResponse(widgetId.current)
        : undefined;

    try {
      const res = await fetch("/api/group-inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          organisation: form.organisation || undefined,
          group_size: form.group_size ? Number(form.group_size) : undefined,
          window: form.window || undefined,
          message: form.message,
          cf_turnstile_response: token,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        issues?: { path: string; message: string }[];
      };

      if (!res.ok) {
        setState("error");
        if (Array.isArray(body.issues) && body.issues.length > 0) {
          setIssues(body.issues);
        } else {
          setMessage(errorMessage(body.error));
        }
        resetWidget();
        return;
      }

      setState("sent");
      setForm({
        name: "",
        email: "",
        organisation: "",
        group_size: "",
        window: "",
        message: "",
      });
    } catch {
      setState("error");
      setMessage(
        "We could not reach the enquiry service. Please try again in a moment.",
      );
      resetWidget();
    }
  }

  if (state === "sent") {
    return (
      <div className="rounded-md border border-canopy/30 bg-cream p-8 text-center">
        <p className="font-display text-xl text-ink">Thank you — received.</p>
        <p className="mt-3 text-sm text-ink/70">
          Your enquiry has been read. We reply by email with an honest answer,
          including when the answer is that it will not work. Nothing is booked
          and nothing has been paid.
        </p>
        <button
          type="button"
          onClick={() => setState("idle")}
          className="mt-4 text-xs font-semibold text-lake"
        >
          Send another enquiry
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-md border border-mist bg-cream p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="group-name"
          label="Your name"
          value={form.name}
          onChange={(v) => setForm((f) => ({ ...f, name: v }))}
          required
        />
        <Field
          id="group-email"
          label="Email"
          type="email"
          value={form.email}
          onChange={(v) => setForm((f) => ({ ...f, email: v }))}
          required
        />
        <Field
          id="group-org"
          label="Operator / retreat house / school (optional)"
          value={form.organisation}
          onChange={(v) => setForm((f) => ({ ...f, organisation: v }))}
        />
        <Field
          id="group-size"
          label="Group size (optional)"
          type="number"
          value={form.group_size}
          onChange={(v) => setForm((f) => ({ ...f, group_size: v }))}
        />
      </div>

      <Field
        id="group-window"
        label="Window you are considering (optional)"
        value={form.window}
        onChange={(v) => setForm((f) => ({ ...f, window: v }))}
      />

      <div>
        <label
          htmlFor="group-message"
          className="block text-xs font-medium text-cream/70"
        >
          What would you like the days to do?
        </label>
        <textarea
          id="group-message"
          required
          rows={5}
          value={form.message}
          onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
          className="mt-1 w-full rounded-md border border-mist bg-white px-3 py-2 text-sm text-ink focus:border-bark focus:outline-none"
        />
      </div>

      {/* Honeypot — hidden from humans, tempting to bots. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="group-website">Website</label>
        <input
          id="group-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {siteKey && <div ref={widgetRef} />}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={state === "busy"}
          className="rounded-md bg-lake px-6 py-3 text-sm font-semibold text-cream hover:bg-lake/80 disabled:opacity-60"
        >
          {state === "busy" ? "Sending…" : "Send enquiry"}
        </button>
        <p className="text-xs text-cream/60">
          No payment, no booking. We reply by email.
        </p>
      </div>

      {issues.length > 0 && (
        <ul className="space-y-1 text-xs text-ember">
          {issues.map((i) => (
            <li key={`${i.path}-${i.message}`}>{i.message}</li>
          ))}
        </ul>
      )}
      {message && (
        <p className="text-sm text-ember" role="alert">
          {message}
        </p>
      )}
    </form>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-cream/70">
        {label}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-mist bg-white px-3 py-2 text-sm text-ink focus:border-bark focus:outline-none"
      />
    </div>
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
    case "turnstile_unavailable":
      return "Verification is temporarily unavailable. Please try again shortly.";
    case "database_not_configured":
      return "Enquiries are temporarily unavailable. Please write to us instead.";
    case "inquiry_failed":
      return "Something went wrong saving your enquiry. Please try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}