"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loginErrorMessage } from "@/lib/admin/login-messages";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** Epoch seconds at which the lockout lifts; 0 = not locked out. */
  const [lockedUntil, setLockedUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [remaining, setRemaining] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Ticks once a second only while locked out, so the button can re-enable
  // itself the moment the window closes instead of leaving the owner guessing.
  useEffect(() => {
    if (lockedUntil <= 0) {
      if (timer.current) {
        clearInterval(timer.current);
        timer.current = null;
      }
      return;
    }
    timer.current = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [lockedUntil]);

  const secondsLeft = lockedUntil > 0 ? Math.max(0, Math.ceil((lockedUntil - now) / 1000)) : 0;
  const locked = secondsLeft > 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (locked) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const rem = res.headers.get("x-ratelimit-remaining");
      if (rem !== null) setRemaining(Number(rem));

      if (res.ok) {
        // refresh() then push(), never push() alone. The session cookie is set,
        // but the client router cache may already hold the /admin redirect that
        // middleware produced for the prefetches AdminNav fired while we were
        // logged out. Serving that cached redirect is what left a successful
        // sign-in sitting on this page until a manual refresh. Logout has
        // always done both for the same reason.
        router.refresh();
        router.push("/admin");
        return;
      }

      const body: { error?: string; retry_after?: number } = await res
        .json()
        .catch(() => ({}));

      if (res.status === 429) {
        // Trust the server's own TTL — it read it from Redis, so the countdown
        // tracks the real window rather than a guess. Fall back to the full
        // 15-minute window only if the server sent nothing usable.
        const header = Number(res.headers.get("retry-after"));
        const secs =
          typeof body.retry_after === "number" ? body.retry_after : header;
        const wait = Number.isFinite(secs) && secs > 0 ? secs : 900;
        setLockedUntil(Date.now() + wait * 1000);
        setNow(Date.now());
      }
      setError(loginErrorMessage(body.error, body.retry_after));
    } catch {
      setError("Could not reach the login service. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const countdown =
    locked && secondsLeft > 0
      ? `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`
      : null;

  return (
    <section className="min-h-screen bg-cream py-16">
      <div className="mx-auto max-w-md px-4">
        <h1 className="font-display text-3xl font-semibold text-ink">
          Sanctuary admin
        </h1>
        <p className="mt-2 text-sm text-ink/60">
          Sign in to review booking requests, prices and dates.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-ink">
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              disabled={locked}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full rounded-md border border-mist bg-white px-4 py-3 text-ink focus:border-bark focus:outline-none focus:ring-1 focus:ring-bark disabled:opacity-60"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-ink">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              disabled={locked}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-mist bg-white px-4 py-3 text-ink focus:border-bark focus:outline-none focus:ring-1 focus:ring-bark disabled:opacity-60"
            />
          </div>
          {error && (
            <p
              role="alert"
              className="rounded-md border border-ember/40 bg-ember/5 p-3 text-sm text-ink"
            >
              {error}
            </p>
          )}
          {locked && countdown && (
            <p className="text-sm text-ink/70">
              Locked out for {countdown}. The form unlocks itself — you do not
              need to reload the page.
            </p>
          )}
          {!locked && remaining !== null && remaining <= 2 && (
            <p className="text-sm text-ink/70">
              {remaining} attempt{remaining === 1 ? "" : "s"} left before this
              device is locked out for 15 minutes.
            </p>
          )}
          <button
            type="submit"
            disabled={busy || locked}
            className="w-full rounded-md bg-lake px-8 py-3 text-sm font-semibold text-cream transition-colors hover:bg-lake/80 disabled:opacity-60"
          >
            {busy ? "Signing in..." : locked ? `Locked (${countdown})` : "Sign in"}
          </button>
        </form>
      </div>
    </section>
  );
}
