import { DatabaseNotConfiguredError } from "@/lib/db/client";
import { listEmailLog } from "@/lib/db/email-log";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  sent: "bg-canopy/15 text-canopy",
  stubbed: "bg-ember/10 text-ember",
  failed: "bg-ember/20 text-ember",
};

export default async function AdminEmailsPage() {
  let emails: Awaited<ReturnType<typeof listEmailLog>> = [];
  let dbMissing = false;
  try {
    emails = await listEmailLog(200);
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) dbMissing = true;
    else throw err;
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Emails</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink/60">
        Every notification the site produced, exactly as recorded.{" "}
        <strong>stubbed</strong> means no mail server is configured — the email
        was stored but never sent.
      </p>

      {dbMissing ? (
        <div className="mt-6 rounded-md border border-ember/40 bg-ember/5 p-6 text-sm text-ink">
          Database not configured — no email history is available.
        </div>
      ) : emails.length === 0 ? (
        <p className="mt-6 text-sm text-ink/60">No emails yet.</p>
      ) : (
        <ul className="mt-6 space-y-3">
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
    </div>
  );
}
