import { DatabaseNotConfiguredError } from "@/lib/db/client";
import { listEmailLog } from "@/lib/db/email-log";
import { listOutbox } from "@/lib/db/email-outbox";
import { ResendOutboxButton } from "@/components/admin/ResendOutboxButton";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  sent: "bg-canopy/15 text-canopy",
  stubbed: "bg-ember/10 text-ember",
  failed: "bg-ember/20 text-ember",
};

const OUTBOX_STYLE: Record<string, string> = {
  pending: "bg-bark-soft/20 text-ink",
  sent: "bg-canopy/15 text-canopy",
  failed: "bg-ember/20 text-ember",
};

export default async function AdminEmailsPage() {
  let emails: Awaited<ReturnType<typeof listEmailLog>> = [];
  let outbox: Awaited<ReturnType<typeof listOutbox>> = [];
  let dbMissing = false;
  try {
    [emails, outbox] = await Promise.all([listEmailLog(200), listOutbox(100)]);
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) dbMissing = true;
    else throw err;
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Emails</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink/60">
        Payment confirmations are <strong>queued</strong> in the same transaction
        that settles the payment, then delivered by a processor (a cron job runs
        every 5 minutes). A row that keeps failing ends up{" "}
        <strong>failed</strong> with its error — resend it by hand here. Below
        that, every other notification the site produced, exactly as recorded.{" "}
        <strong>stubbed</strong> means no mail server is configured — the email
        was stored but never sent.
      </p>

      {dbMissing ? (
        <div className="mt-6 rounded-md border border-ember/40 bg-ember/5 p-6 text-sm text-ink">
          Database not configured — no email history is available.
        </div>
      ) : (
        <>
          <h2 className="mt-8 font-display text-lg font-semibold text-ink">
            Payment email outbox
          </h2>
          {outbox.length === 0 ? (
            <p className="mt-3 text-sm text-ink/60">
              Nothing queued. Payment emails appear here the moment a payment is
              confirmed.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {outbox.map((row) => (
                <li
                  key={row.id}
                  className="rounded-md border border-mist bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="text-sm">
                      <span className="font-medium text-ink">{row.subject}</span>
                      <span className="ml-2 text-ink/50">→ {row.recipient}</span>
                      <div className="mt-1 text-xs text-ink/40">
                        {row.category}
                        {row.booking_id && (
                          <>
                            {" · booking "}
                            <span className="font-mono">{row.booking_id.slice(0, 8)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`rounded-full px-2.5 py-1 font-medium ${OUTBOX_STYLE[row.status] || ""}`}
                      >
                        {row.status}
                      </span>
                      <span className="text-ink/40">
                        {row.attempts} attempt{row.attempts === 1 ? "" : "s"}
                        {row.resends > 0 && ` · ${row.resends} resend${row.resends === 1 ? "" : "s"}`}
                      </span>
                      {row.status === "failed" && <ResendOutboxButton id={row.id} />}
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-ink/40">
                    queued {row.created_at.replace("T", " ").slice(0, 16)}
                    {row.sent_at &&
                      ` · delivered ${row.sent_at.replace("T", " ").slice(0, 16)}`}
                    {!row.sent_at &&
                      row.status === "pending" &&
                      ` · next try ${row.next_attempt_at.replace("T", " ").slice(0, 16)}`}
                  </div>
                  {row.last_error && (
                    <p className="mt-2 text-xs text-ember">
                      Last error: {row.last_error}
                    </p>
                  )}
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-semibold text-lake">
                      View body
                    </summary>
                    <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded bg-cream p-3 text-xs text-ink/80">
                      {row.body}
                    </pre>
                  </details>
                </li>
              ))}
            </ul>
          )}

          <h2 className="mt-10 font-display text-lg font-semibold text-ink">
            All other emails
          </h2>
          {emails.length === 0 ? (
            <p className="mt-3 text-sm text-ink/60">No other emails yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {emails.map((e) => (
                <li key={e.id} className="rounded-md border border-mist bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm">
                      <span className="font-medium text-ink">{e.subject}</span>
                      <span className="ml-2 text-ink/50">→ {e.to_email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-ink/40">{e.template}</span>
                      <span
                        className={`rounded-full px-2.5 py-1 font-medium ${STATUS_STYLE[e.status] || ""}`}
                      >
                        {e.status}
                      </span>
                      <span className="text-ink/40">
                        {e.created_at.replace("T", " ").slice(0, 16)}
                      </span>
                    </div>
                  </div>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-semibold text-lake">
                      View body
                    </summary>
                    <pre className="mt-2 whitespace-pre-wrap rounded bg-cream p-3 text-xs text-ink/80">
                      {e.body}
                    </pre>
                    {e.error && (
                      <p className="mt-1 text-xs text-ember">Error: {e.error}</p>
                    )}
                  </details>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}