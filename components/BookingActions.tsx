"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BookingActions({
  id,
  status,
  paymentsConfigured,
}: {
  id: string;
  status: string;
  paymentsConfigured: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "decline" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "approve" | "decline" | "cancel", note?: string) {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/admin/bookings/${id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...(note ? { note } : {}) }),
      });
      if (res.ok) {
        router.refresh();
        return;
      }
      const body: { error?: string } = await res.json().catch(() => ({}));
      if (body.error === "database_not_configured") {
        setError("Database not configured — the action was not applied.");
      } else if (body.error === "payment_provider_unavailable") {
        setError(
          "Approving needs payments configured (PESAPAL_* env) — the request stays pending.",
        );
      } else if (body.error === "payment_provider_error") {
        setError("The payment provider rejected checkout creation — still pending.");
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

  if (status === "approved" || status === "paid") {
    return (
      <div className="space-y-2">
        <button
          onClick={() => {
            const note = window.prompt(
              "Cancel this booking. Refunds stay manual in Pesapal — what note should be recorded for the guest?",
            );
            if (!note) return;
            void act("cancel", note);
          }}
          disabled={busy !== null}
          className="rounded-md border border-ember/50 px-6 py-2.5 text-sm font-semibold text-ember hover:bg-ember/5 disabled:opacity-60"
        >
          {busy === "cancel" ? "Cancelling..." : "Cancel this booking"}
        </button>
        <p className="text-xs text-ink/50">
          Cancelling frees the dates. Any refund is handled manually in
          Pesapal; the note you enter is recorded on the booking.
        </p>
        {error && <p className="text-sm text-ember">{error}</p>}
      </div>
    );
  }

  if (status !== "pending") {
    return (
      <p className="text-sm text-ink/60">
        This request is <strong className="text-ink">{status}</strong> - no
        further action.
      </p>
    );
  }

  if (!paymentsConfigured) {
    return (
      <div className="rounded-md border border-ember/40 bg-ember/5 p-4 text-sm text-ink">
        <strong>Approve is disabled:</strong> payments are not configured
        (missing <code>PESAPAL_*</code> env). Approval creates the deposit
        link, so nothing is approved until real payments can be offered — the
        site never fakes a link.
      </div>
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
        Approve creates the deposit checkout first, then emails the guest one
        message with the payment link. Decline emails a short polite note.
      </p>
      {error && <p className="text-sm text-ember">{error}</p>}
    </div>
  );
}
