"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Marks a group enquiry handled. The words themselves are never editable. */
export function MarkInquiryHandled({
  id,
  handled,
}: {
  id: string;
  handled: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function mark() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/inquiries?id=${id}`, { method: "PATCH" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(
          body.error === "already_handled"
            ? "Already marked."
            : "Could not update — try again.",
        );
        return;
      }
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  if (handled) {
    return <span className="text-xs text-canopy">handled</span>;
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={mark}
        disabled={busy}
        className="rounded-full border border-lake/40 px-3 py-1 text-xs font-semibold text-lake hover:bg-lake/10 disabled:opacity-50"
      >
        {busy ? "Saving…" : "Mark handled"}
      </button>
      {error && <span className="text-xs text-ember">{error}</span>}
    </span>
  );
}