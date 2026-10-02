"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BookingActions({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "approve" | "decline") {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/admin/bookings/${id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        router.refresh();
        return;
      }
      const body: { error?: string } = await res.json().catch(() => ({}));
      if (body.error === "database_not_configured") {
        setError("Database not configured — the action was not applied.");
      } else if (body.error === "invalid_transition") {
        setError("This request is no longer pending.");
        router.refresh();
      } else if (body.error === "unauthorized") {
        setError("Your session expired. Sign in again.");
      } else {
        setError("Action failed. Please try again.");
      }
    } catch {
      setError("Network error — nothing was changed.");
    } finally {
      setBusy(null);
    }
  }

  if (status !== "pending") {
    return (
      <p className="text-sm text-ink/60">
        This request is <strong className="text-ink">{status}</strong> — no
        further action.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-3">
        <button
          onClick={() => act("approve")}
          disabled={busy !== null}
          className="rounded-md bg-lake px-6 py-2.5 text-sm font-semibold text-cream hover:bg-lake/80 disabled:opacity-60"
        >
          {busy === "approve" ? "Approving..." : "Approve & price"}
        </button>
        <button
          onClick={() => act("decline")}
          disabled={busy !== null}
          className="rounded-md border border-ember/50 px-6 py-2.5 text-sm font-semibold text-ember hover:bg-ember/5 disabled:opacity-60"
        >
          {busy === "decline" ? "Declining..." : "Decline"}
        </button>
      </div>
      <p className="text-xs text-ink/50">
        Approve emails the guest the total and deposit; decline emails a short
        polite note. Payment links arrive in the payments milestone.
      </p>
      {error && <p className="text-sm text-ember">{error}</p>}
    </div>
  );
}
