import { DatabaseNotConfiguredError } from "@/lib/db/client";
import { getBookingContacts } from "@/lib/db/bookings";
import { listPaymentsNeedingAttention } from "@/lib/db/payments";
import { STUCK_AFTER_MS } from "@/lib/payments/reconcile";
import type { PaymentRow } from "@/lib/db/types";
import { RecheckPaymentButton } from "@/components/admin/RecheckPaymentButton";

export const dynamic = "force-dynamic";

function minutesAgo(iso: string, now: number): string {
  const mins = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
  if (mins < 90) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours} h`;
  return `${Math.floor(hours / 24)} days`;
}

function PaymentList({
  rows,
  contacts,
  now,
}: {
  rows: PaymentRow[];
  contacts: Map<string, { name: string; email: string }>;
  now: number;
}) {
  return (
    <ul className="mt-3 space-y-3">
      {rows.map((p) => {
        const who = p.booking_id ? contacts.get(p.booking_id) : undefined;
        return (
          <li key={p.id} className="rounded-md border border-mist bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="text-sm">
                <span className="font-medium text-ink">
                  {p.subject_kind === "voucher"
                    ? "Gift voucher"
                    : (who?.name ?? "Unknown booking")}
                </span>
                {who && <span className="ml-2 text-ink/50">{who.email}</span>}
                <div className="mt-1 text-xs text-ink/50">
                  {p.subject_kind === "voucher" ? "voucher purchase" : p.kind}
                  {" - USD "}
                  {Number(p.amount_usd).toLocaleString("en-US")}
                  {" ("}
                  {p.currency} {Number(p.amount_ugx).toLocaleString("en-US")}
                  {")"}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span
                  className={`rounded-full px-2.5 py-1 font-medium ${
                    p.status === "failed"
                      ? "bg-ember/20 text-ember"
                      : "bg-bark-soft/20 text-ink"
                  }`}
                >
                  {p.status}
                </span>
                <RecheckPaymentButton id={p.id} />
              </div>
            </div>
            <div className="mt-2 text-xs text-ink/40">
              opened {p.created_at.replace("T", " ").slice(0, 16)} (
              {minutesAgo(p.created_at, now)} ago)
              {" - last checked "}
              {minutesAgo(p.updated_at, now)} ago
              {" - provider ref "}
              <span className="font-mono">{p.provider_ref.slice(0, 12)}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default async function AdminPaymentsPage() {
  const now = new Date();
  let rows: PaymentRow[] = [];
  let contacts = new Map<string, { name: string; email: string }>();
  let dbMissing = false;
  try {
    rows = await listPaymentsNeedingAttention({ now, stuckAfterMs: STUCK_AFTER_MS });
    contacts = await getBookingContacts(
      rows.flatMap((p) => (p.booking_id ? [p.booking_id] : [])),
    );
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) dbMissing = true;
    else throw err;
  }

  const stuck = rows.filter((p) => p.status === "initiated");
  const failed = rows.filter((p) => p.status === "failed");

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Payments</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink/60">
        Payments that need a second look. <strong>Stuck</strong> means the guest
        was sent to Pesapal over 30 minutes ago and we never heard the result. A
        background job re-checks these automatically; <strong>Re-check</strong>{" "}
        does it now. Nothing here is ever marked paid on our say-so - only
        Pesapal confirming the exact amount completes a payment.
      </p>

      {dbMissing ? (
        <div className="mt-6 rounded-md border border-ember/40 bg-ember/5 p-6 text-sm text-ink">
          Database not configured - no payments are available.
        </div>
      ) : (
        <>
          <h2 className="mt-8 font-display text-lg font-semibold text-ink">
            Stuck ({stuck.length})
          </h2>
          {stuck.length === 0 ? (
            <p className="mt-3 text-sm text-ink/60">
              Nothing stuck. Every payment that was started has been resolved or
              is still inside its first 30 minutes.
            </p>
          ) : (
            <PaymentList rows={stuck} contacts={contacts} now={now.getTime()} />
          )}

          <h2 className="mt-10 font-display text-lg font-semibold text-ink">
            Failed ({failed.length})
          </h2>
          {failed.length === 0 ? (
            <p className="mt-3 text-sm text-ink/60">No failed payments.</p>
          ) : (
            <>
              <p className="mt-2 max-w-2xl text-sm text-ink/60">
                Pesapal reported these as failed. A failure can be superseded if
                the guest retried and paid, so Re-check asks again.
              </p>
              <PaymentList rows={failed} contacts={contacts} now={now.getTime()} />
            </>
          )}
        </>
      )}
    </div>
  );
}
