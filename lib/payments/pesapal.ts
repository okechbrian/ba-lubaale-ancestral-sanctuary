import "server-only";

/**
 * Minimal Pesapal API 3.0 client (hosted checkout).
 * Docs: https://developer.pesapal.com — endpoints verified 2 Oct 2026:
 *   POST Auth/RequestToken · URLSetup/GetIpnList · URLSetup/RegisterIPN
 *   POST Transactions/SubmitOrderRequest · GET Transactions/GetTransactionStatus
 * Missing credentials throw PesapalNotConfiguredError — callers surface
 * `payment_provider_unavailable` and the UI shows an honest banner instead of
 * inventing a payment link. Never logs tokens, keys or billing data.
 */

export class PesapalNotConfiguredError extends Error {
  constructor() {
    super("Pesapal not configured: set PESAPAL_CONSUMER_KEY, PESAPAL_CONSUMER_SECRET and PESAPAL_IPN_URL.");
    this.name = "PesapalNotConfiguredError";
  }
}

export class PesapalApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PesapalApiError";
  }
}

function baseAndKeys(): { base: string; key: string; secret: string } {
  const key = process.env.PESAPAL_CONSUMER_KEY;
  const secret = process.env.PESAPAL_CONSUMER_SECRET;
  if (!key || !secret) throw new PesapalNotConfiguredError();
  const base =
    process.env.PESAPAL_ENV === "live"
      ? "https://pay.pesapal.com/v3/api"
      : "https://cybqa.pesapal.com/pesapalv3/api";
  return { base, key, secret };
}

export function isPesapalConfigured(): boolean {
  return Boolean(
    process.env.PESAPAL_CONSUMER_KEY &&
      process.env.PESAPAL_CONSUMER_SECRET &&
      process.env.PESAPAL_IPN_URL,
  );
}

let tokenCache: { token: string; at: number } | null = null;
const TOKEN_TTL_MS = 20 * 60 * 1000;

async function requestToken(): Promise<string> {
  const { base, key, secret } = baseAndKeys();
  const res = await fetch(`${base}/Auth/RequestToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ consumer_key: key, consumer_secret: secret }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new PesapalApiError(`RequestToken HTTP ${res.status}`);
  const body = (await res.json()) as { token?: string; error?: { message?: string } };
  if (!body.token) {
    throw new PesapalApiError(`RequestToken failed: ${body.error?.message || "no token"}`);
  }
  return body.token;
}

async function api(
  path: string,
  init: { method: "GET" | "POST"; body?: unknown } = { method: "GET" },
  isRetry = false,
): Promise<unknown> {
  const { base } = baseAndKeys();
  if (!tokenCache || Date.now() - tokenCache.at > TOKEN_TTL_MS) {
    tokenCache = { token: await requestToken(), at: Date.now() };
  }
  const res = await fetch(`${base}${path}`, {
    method: init.method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${tokenCache.token}`,
    },
    ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
    signal: AbortSignal.timeout(20_000),
  });
  if (res.status === 401 && !isRetry) {
    tokenCache = null;
    return api(path, init, true);
  }
  if (!res.ok) {
    let detail = "";
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      detail = body.error?.message || "";
    } catch {
      /* body not JSON */
    }
    throw new PesapalApiError(`${init.method} ${path} HTTP ${res.status} ${detail}`.trim());
  }
  return res.json();
}

const ipnCache = new Map<string, string>();

/** Reuse a registered IPN URL or register it once (cached per process). */
export async function ensureIpnId(url: string): Promise<string> {
  const cached = ipnCache.get(url);
  if (cached) return cached;
  const list = (await api("/URLSetup/GetIpnList", { method: "GET" })) as
    | Array<{ url?: string; ipn_id?: string }>
    | { error?: unknown };
  if (Array.isArray(list)) {
    const existing = list.find((entry) => entry.url === url && entry.ipn_id);
    if (existing?.ipn_id) {
      ipnCache.set(url, existing.ipn_id);
      return existing.ipn_id;
    }
  }
  const created = (await api("/URLSetup/RegisterIPN", {
    method: "POST",
    body: { url, ipn_notification_type: "POST" },
  })) as { ipn_id?: string };
  if (!created.ipn_id) throw new PesapalApiError("RegisterIPN returned no ipn_id");
  ipnCache.set(url, created.ipn_id);
  return created.ipn_id;
}

export interface SubmitOrderInput {
  merchantRef: string; // our payment row id
  amountUgx: number;
  description: string;
  callbackUrl: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface SubmittedOrder {
  trackingId: string;
  redirectUrl: string;
}

export async function submitOrder(input: SubmitOrderInput): Promise<SubmittedOrder> {
  const ipnUrl = process.env.PESAPAL_IPN_URL;
  if (!ipnUrl) throw new PesapalNotConfiguredError();
  const notificationId = await ensureIpnId(ipnUrl);
  const body = (await api("/Transactions/SubmitOrderRequest", {
    method: "POST",
    body: {
      id: input.merchantRef,
      currency: "UGX",
      amount: input.amountUgx,
      description: input.description,
      callback_url: input.callbackUrl,
      notification_id: notificationId,
      billing_address: {
        email_address: input.email,
        first_name: input.firstName,
        last_name: input.lastName,
      },
    },
  })) as {
    order_tracking_id?: string;
    redirect_url?: string;
    error?: { message?: string };
  };
  if (!body.order_tracking_id || !body.redirect_url) {
    throw new PesapalApiError(
      `SubmitOrder failed: ${body.error?.message || "missing tracking id"}`,
    );
  }
  return { trackingId: body.order_tracking_id, redirectUrl: body.redirect_url };
}

export interface RemoteTransactionStatus {
  statusCode: number;
  currency?: string | null;
  amount?: number | string | null;
  description?: string;
}

/** Authenticated re-query — the only trusted source given IPN has no HMAC. */
export async function getTransactionStatus(
  trackingId: string,
): Promise<RemoteTransactionStatus> {
  const body = (await api(
    `/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(trackingId)}`,
    { method: "GET" },
  )) as {
    status_code?: number;
    currency?: string;
    amount?: number | string;
    description?: string;
  };
  if (typeof body.status_code !== "number") {
    throw new PesapalApiError("GetTransactionStatus returned no status_code");
  }
  return {
    statusCode: body.status_code,
    currency: body.currency ?? null,
    amount: body.amount ?? null,
    description: body.description,
  };
}
