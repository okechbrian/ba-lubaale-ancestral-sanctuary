"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const MESSAGES: Record<string, string> = {
  settled: "Confirmed by Pesapal - payment completed.",
  already_completed: "Already completed.",
  duplicate: "Already completed.",
  failed: "Pesapal reports this payment failed.",
  unresolved: "Pesapal has no completed payment for this yet.",
  rejected: "Pesapal's answer does not match this payment (amount or currency). Not changed - check it by hand.",
  blocked: "Pesapal says paid, but an old record blocks completion. Needs a developer.",
};

/**
 * "Re-check" for a stuck or failed payment. Posts to the admin recheck route,
 * which asks Pesapal and lets ITS answer decide - there is deliberately no way
 * to mark a payment paid from here. Refreshes so the list shows durable state.
 */
export function RecheckPaymentButton({ id }: { id: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function recheck() {
    setState("busy");
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/payments/${id}/recheck`, {
        method: "POST",
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        result?: string;
      };
      if (!res.ok) {
        setState("error");
        setMessage(
          body.error === "provider_unavailable"
            ? "Pesapal could not be reached (or is not configured). Try again later."
            : body.error === "not_recheckable"
              ? "This payment can no longer be re-checked."
              : `Re-check failed (${body.error ?? res.status}).`,
        );
        return;
      }
      setState("done");
      setMessage(MESSAGES[body.result ?? ""] ?? `Result: ${body.result}`);
      router.refresh();
    } catch {
      setState("error");
      setMessage("Re-check failed - network error.");
    }
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={recheck}
        disabled={state === "busy"}
        className="rounded-full border border-lake/40 px-3 py-1 text-xs font-semibold text-lake transition hover:bg-lake/10 disabled:opacity-50"
      >
        {state === "busy" ? "Checking..." : "Re-check"}
      </button>
      {message && (
        <span
          className={`max-w-xs text-right text-xs ${state === "error" ? "text-ember" : "text-ink/70"}`}
        >
          {message}
        </span>
      )}
    </span>
  );
}
