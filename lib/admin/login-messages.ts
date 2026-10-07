/**
 * Login failure copy, kept out of the page component so it can be unit-tested
 * without a DOM and so the wording lives in exactly one place.
 *
 * The reason this file exists: the login page used to collapse every error that
 * was not `admin_not_configured` into "Wrong username or password." That
 * included a `429 rate_limited`, which is a *temporary* refusal carrying a
 * `retry_after` the server read from Redis. So an owner with entirely correct
 * credentials was told their password was wrong, for up to fifteen minutes, and
 * every retry they made burned another attempt — making it worse.
 *
 * The public intake forms already distinguished this case; the admin console
 * was the odd one out.
 */
export function loginErrorMessage(
  error?: string,
  retryAfterSec?: number | null,
): string {
  switch (error) {
    case "rate_limited": {
      const mins =
        retryAfterSec && retryAfterSec > 0
          ? Math.max(1, Math.ceil(retryAfterSec / 60))
          : null;
      return mins
        ? `Too many attempts from this device. Your credentials are not the problem — try again in about ${mins} minute${mins === 1 ? "" : "s"}.`
        : "Too many attempts from this device. Try again shortly.";
    }
    case "rate_limiter_unavailable":
      return "Sign-in is temporarily unavailable because the rate limiter cannot be reached. That refusal is deliberate — the console will not open unprotected. Try again shortly.";
    case "admin_not_configured":
      return "Admin is not configured on this deployment. Set ADMIN_USERNAME, ADMIN_PASSWORD and ADMIN_SESSION_SECRET in the environment (.env.example documents them).";
    case "invalid_credentials":
      return "Wrong username or password.";
    case "invalid_json":
      return "That request could not be read. Reload the page and try again.";
    default:
      return "Sign-in failed. Try again.";
  }
}