/**
 * Shared guard for Vercel Cron routes.
 *
 * Vercel only attaches `Authorization: Bearer $CRON_SECRET` when the variable
 * is configured, so an unset secret must REFUSE (503), never fall back to
 * "open": these routes move money-state or send mail, and anyone on the
 * internet could otherwise trigger them.
 */
export function cronSecretConfigured(): boolean {
  return Boolean(process.env.CRON_SECRET?.trim());
}

export function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const presented = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (presented.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < secret.length; i++) {
    diff |= presented.charCodeAt(i) ^ secret.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Returns the refusal Response for an unauthenticated cron call, or null when
 * the caller may proceed.
 */
export function guardCron(request: Request, label: string): Response | null {
  if (!cronSecretConfigured()) {
    console.error(
      `[${label}] CRON_SECRET is not set - refusing to run. Set it in Vercel ` +
        "(the cron job sends it as `Authorization: Bearer <CRON_SECRET>`).",
    );
    return Response.json({ error: "cron_secret_missing" }, { status: 503 });
  }
  if (!cronAuthorized(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}
