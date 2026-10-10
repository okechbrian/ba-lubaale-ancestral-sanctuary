"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FireCircleConfig, FireCircleRequestRow } from "@/lib/fire-circle/types";

export default function FireCircleAdmin({
  config,
  requests,
}: {
  config: FireCircleConfig;
  requests: FireCircleRequestRow[];
}) {
  const router = useRouter();
  const [fee, setFee] = useState(config.fee_usd ? String(Number(config.fee_usd)) : "");
  const [joinUrl, setJoinUrl] = useState(config.join_url ?? "");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  /** Which request is being approved or declined, and which way. */
  const [acting, setActing] = useState<{ id: string; action: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNote(null);
    const feeUsd = fee.trim() === "" ? null : Number(fee);
    try {
      const res = await fetch("/api/admin/fire-circle", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fee_usd: feeUsd,
          join_url: joinUrl.trim() === "" ? null : joinUrl.trim(),
        }),
      });
      setNote(
        res.ok
          ? { ok: true, text: "Saved." }
          : {
              ok: false,
              text: "Could not save. The fee must be a number, or empty. The link must start with https://.",
            },
      );
      if (res.ok) router.refresh();
    } catch {
      // Without this the rejected fetch left `busy` true forever: the Save
      // button stayed disabled with no message, so one dropped connection
      // bricked the form until a full page reload.
      setNote({ ok: false, text: "Network error — nothing was saved." });
    } finally {
      setBusy(false);
    }
  }

  async function act(id: string, action: "approve" | "decline") {
    setNote(null);
    setActing({ id, action });
    try {
      const res = await fetch("/api/admin/fire-circle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        // `not_open` is what a duplicate submission comes back as, so a
        // double-click used to report a successful approval as "That request
        // is no longer open." The buttons are disabled while this is in
        // flight, which is what actually prevents the second request.
        setNote({
          ok: false,
          text:
            body.error === "fee_required"
              ? "Set the fee and save it before you approve anyone."
              : body.error === "not_open"
                ? "Already handled — this one was approved or declined a moment ago."
                : "Could not complete that. Nothing was changed.",
        });
        return;
      }
      setNote({
        ok: true,
        text: action === "approve" ? "Approved." : "Declined.",
      });
      router.refresh();
    } catch {
      setNote({ ok: false, text: "Network error — nothing was changed." });
    } finally {
      setActing(null);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Fire circle</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink/60">
        Last Saturday of the month. Her voice, then questions. No fee is shown
        publicly until you set one here. Approving sends the seat link and this fee.
      </p>

      <form onSubmit={save} className="mt-6 max-w-xl space-y-3 rounded-md border border-mist bg-white p-4">
        <label className="block text-xs font-medium text-ink/70">
          Fee in USD. Leave empty until she names it.
          <input
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            inputMode="decimal"
            className="mt-1 w-full rounded-md border border-mist px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-xs font-medium text-ink/70">
          Way in for this month (https link). Empty until the week of the fire.
          <input
            value={joinUrl}
            onChange={(e) => setJoinUrl(e.target.value)}
            className="mt-1 w-full rounded-md border border-mist px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-lake px-4 py-2 text-sm font-semibold text-cream disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </form>
      {note && (
        <p
          role="status"
          aria-live="polite"
          className={`mt-3 text-sm ${note.ok ? "text-canopy" : "text-ember"}`}
        >
          {note.text}
        </p>
      )}

      <ul className="mt-8 space-y-3">
        {requests.length === 0 && <li className="text-sm text-ink/60">No requests yet.</li>}
        {requests.map((r) => (
          <li key={r.id} className="rounded-md border border-mist bg-white p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium text-ink">
                {r.name}{" "}
                <a className="font-normal text-lake" href={`mailto:${r.email}`}>
                  {r.email}
                </a>
              </p>
              <span className="text-xs uppercase tracking-wide text-ink/50">{r.status}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-ink/80">{r.message}</p>
            {r.status === "requested" && (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => act(r.id, "approve")}
                  disabled={acting !== null}
                  className="rounded bg-lake px-3 py-1.5 text-xs font-semibold text-cream disabled:opacity-60"
                >
                  {/* Only the button that was pressed reads "Working…". Marking both
                      looked like two things were happening, and made it unclear
                      which action was actually in flight. */}
                  {acting?.id === r.id && acting.action === "approve"
                    ? "Working…"
                    : "Approve"}
                </button>
                <button
                  type="button"
                  onClick={() => act(r.id, "decline")}
                  disabled={acting !== null}
                  className="rounded border border-mist px-3 py-1.5 text-xs disabled:opacity-60"
                >
                  {acting?.id === r.id && acting.action === "decline"
                    ? "Working…"
                    : "Decline"}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
