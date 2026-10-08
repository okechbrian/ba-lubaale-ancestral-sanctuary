import "server-only";

/**
 * Tiny scrubber for anything we log or report. Errors in a payment or a
 * guest-facing route can carry guest names/phones/ emails in the context
 * object — none of that must reach a third party (Sentry) or the console of
 * a host we do not fully control.
 *
 * The scrubber walks the context object and redacts email addresses and
 * Ugandan phone numbers in every string leaf.
 */
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_RE = /(\+?\d[\d\s().-]{6,}\d)/g;

export function scrubPii(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replace(EMAIL_RE, "<redacted-email>").replace(PHONE_RE, "<redacted-phone>");
  }
  if (Array.isArray(value)) {
    return value.map(scrubPii);
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (["name", "email", "whatsapp", "phone", "recipient_email", "buyer_email"].includes(k)) {
        out[k] = "<redacted>";
      } else {
        out[k] = scrubPii(v);
      }
    }
    return out;
  }
  return value;
}

/**
 * Forward a caught error to Sentry (or compatible HTTP intake) when
 * SENTRY_DSN is set. The payload shape is Sentry's public event format sent
 * to the Store endpoint — we deliberately do not ship the SDK's page-spy
 * with PII defaults. Falls back to console when Sentry is not configured.
 *
 * Returns the alert id when the intake accepted it, else undefined.
 */
export async function captureError(err: unknown, context?: Record<string, unknown>): Promise<string | undefined> {
  const message = err instanceof Error ? err.message : String(err);
  const safeContext = scrubPii(context ?? {}) as Record<string, unknown>;

  // Local breadcrumbs always happen, even without a configured intake.
  console.error(`[ops] ${message} ${JSON.stringify(safeContext)}`);

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return undefined;

  try {
    const sentryUrl = new URL(dsn.replace(/:[^:@]+@/, "@").replace(/^\/\//, "https://"));
    const projectId = sentryUrl.pathname.replace(/^\//, "");
    const apiBase = `${sentryUrl.protocol}//${sentryUrl.host}/api/${projectId}`;
    const event = {
      event_id: crypto.randomUUID().replaceAll("-", ""),
      timestamp: new Date().toISOString(),
      platform: "node",
      level: "error" as const,
      message,
      extra: safeContext,
    };
    const res = await fetch(`${apiBase}/store/`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-Sentry-Auth": `Sentry sentry_key=${dsn.split("//")[1]?.split("@")[0]}, sentry_version=7`,
      },
      body: JSON.stringify(event),
    });
    if (!res.ok) {
      console.error(`[sentry] intake refused ${res.status}`);
      return undefined;
    }
    try {
      const data = (await res.json()) as { id?: string };
      return data.id;
    } catch {
      return event.event_id;
    }
  } catch (e) {
    console.error(`[sentry] capture failed: ${e instanceof Error ? e.message : "unknown"}`);
    return undefined;
  }
}
