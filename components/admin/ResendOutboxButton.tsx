"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * "Resend" for an outbox row that exhausted its attempts. Posts to the admin
 * resend route (which requeues AND delivers inline), then refreshes so the page
 * shows the durable status rather than an optimistic guess.
 */
export function ResendOutboxButton({ id }: { id: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function resend() {
    setState("busy");
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/email-outbox/${id}/resend`, {
        method: "POST",
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        status?: string;
      };
      if (!res.ok) {
        setState("error");
        setMessage(
          body.error === "not_resendable"
            ? "Already sent — nothing to resend."
            : `Resend failed (${body.error ?? res.status}).`,
        );
        return;
      }
      setState("done");
      setMessage(
        body.status === "sent"
          ? "Delivered."
          : `Queued (status: ${body.status ?? "pending"}). The cron will retry.`,
      );
      router.refresh();
    } catch {
      setState("error");
      setMessage("Resend failed — network error.");
    }
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={resend}
        disabled={state === "busy"}
        className="rounded-full border border-lake/40 px-3 py-1 text-xs font-semibold text-lake transition hover:bg-lake/10 disabled:opacity-50"
      >
        {state === "busy" ? "Resending…" : "Resend"}
      </button>
      {message && (
        <span
          className={`text-xs ${state === "error" ? "text-ember" : "text-canopy"}`}
        >
          {message}
        </span>
      )}
    </span>
  );
}