"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BlockedDatesAdmin({ days }: { days: string[] }) {
  const router = useRouter();
  const [day, setDay] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function call(action: "add" | "remove", target: string, why?: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/blocked-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, day: target, reason: why }),
      });
      if (res.ok) {
        router.refresh();
        if (action === "add") {
          setDay("");
          setReason("");
        }
        return;
      }
      const body: { error?: string } = await res.json().catch(() => ({}));
      if (body.error === "database_not_configured") {
        setError("Database not configured — nothing was changed.");
      } else if (body.error === "unauthorized") {
        setError("Your session expired. Sign in again.");
      } else {
        setError("That did not work. Please try again.");
      }
    } catch {
      setError("Network error — nothing was changed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 space-y-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (day) void call("add", day, reason || undefined);
        }}
        className="flex flex-wrap items-end gap-3 rounded-md border border-mist bg-white p-4"
      >
        <div>
          <label htmlFor="block-day" className="block text-xs font-medium text-ink/60">
            Day to block
          </label>
          <input
            id="block-day"
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            required
            className="mt-1 rounded-md border border-mist bg-cream px-3 py-2 text-sm text-ink focus:border-bark focus:outline-none"
          />
        </div>
        <div className="min-w-48 flex-1">
          <label htmlFor="block-reason" className="block text-xs font-medium text-ink/60">
            Reason (optional)
          </label>
          <input
            id="block-reason"
            type="text"
            placeholder="Maintenance, ceremony..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 w-full rounded-md border border-mist bg-cream px-3 py-2 text-sm text-ink focus:border-bark focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={busy || !day}
          className="rounded-md bg-lake px-5 py-2 text-sm font-semibold text-cream hover:bg-lake/80 disabled:opacity-60"
        >
          Block day
        </button>
      </form>

      {error && <p className="text-sm text-ember">{error}</p>}

      {days.length === 0 ? (
        <p className="text-sm text-ink/60">No blocked days.</p>
      ) : (
        <ul className="divide-y divide-mist rounded-md border border-mist bg-white">
          {days.map((d) => (
            <li key={d} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-ink">
                {d}
                <span className="ml-2 text-ink/50">blocked</span>
              </span>
              <button
                onClick={() => void call("remove", d)}
                disabled={busy}
                className="text-sm font-semibold text-ember hover:underline disabled:opacity-50"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
