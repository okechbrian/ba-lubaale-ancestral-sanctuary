"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        router.push("/admin");
        return;
      }
      const body: { error?: string } = await res.json().catch(() => ({}));
      if (body.error === "admin_not_configured") {
        setError(
          "Admin is not configured on this deployment. Set ADMIN_USERNAME, ADMIN_PASSWORD and ADMIN_SESSION_SECRET in the environment (.env.example documents them).",
        );
      } else {
        setError("Wrong username or password.");
      }
    } catch {
      setError("Could not reach the login service. Please try again.");
    } finally {
      setBusy(false);
    }
  }

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
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full rounded-md border border-mist bg-white px-4 py-3 text-ink focus:border-bark focus:outline-none focus:ring-1 focus:ring-bark"
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-mist bg-white px-4 py-3 text-ink focus:border-bark focus:outline-none focus:ring-1 focus:ring-bark"
            />
          </div>
          {error && (
            <p className="rounded-md border border-ember/40 bg-ember/5 p-3 text-sm text-ink">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-lake px-8 py-3 text-sm font-semibold text-cream transition-colors hover:bg-lake/80 disabled:opacity-60"
          >
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </section>
  );
}
