"use client";

import { useEffect } from "react";

/**
 * The admin console had NO error boundary anywhere in the repo, and every
 * admin page deliberately re-throws anything that is not a missing-database
 * condition. So a single failed query — `listBookings failed: …` — replaced
 * the entire console with Next's stock "Application error" page, with no way
 * back into it except typing a URL.
 *
 * This boundary keeps the owner inside the console: the nav stays, the failure
 * is stated plainly, and Retry re-renders the segment rather than making them
 * guess. It deliberately does not swallow the error into an empty page — the
 * message is the honest report, and the digest is passed to `console.error`
 * so the real cause is still recoverable from the browser console or the
 * platform logs.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin] console error:", error);
  }, [error]);

  return (
    <div className="rounded-md border border-ember/40 bg-ember/5 p-6 text-sm text-ink">
      <h1 className="font-display text-2xl font-semibold text-ink">
        That did not load
      </h1>
      <p className="mt-2 max-w-2xl text-ink/70">
        Something on this page failed to load. Nothing has been changed or lost.
      </p>
      {error.digest && (
        <p className="mt-2 text-xs text-ink/60">
          Reference: <span className="font-mono">{error.digest}</span>
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-md bg-lake px-5 py-2.5 text-sm font-semibold text-cream hover:bg-lake/80"
        >
          Try again
        </button>
        <a
          href="/admin"
          className="rounded-md border border-mist bg-white px-5 py-2.5 text-sm font-semibold text-ink hover:bg-mist"
        >
          Back to requests
        </a>
      </div>
    </div>
  );
}