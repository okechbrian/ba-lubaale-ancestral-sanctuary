import { DatabaseNotConfiguredError } from "@/lib/db/client";
import { listVouchers } from "@/lib/db/vouchers";
import { listBookings } from "@/lib/db/bookings";
import VoucherRedeemForm from "@/components/admin/VoucherRedeemForm";
import type { VoucherRow } from "@/lib/db/types";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  issued: "bg-bark-soft/20 text-ink",
  redeemed: "bg-canopy/15 text-canopy",
  void: "bg-ember/20 text-ember",
};

export default async function AdminVouchersPage() {
  let vouchers: VoucherRow[] = [];
  let bookings: { id: string; name: string; check_in: string; check_out: string; status: string }[] = [];
  let dbMissing = false;
  try {
    // Both are needed for the redeem form; either failing means "no database".
    // No status filter: a voucher can be applied to a pending or approved stay.
    [vouchers, bookings] = await Promise.all([listVouchers(200), listBookings()]);
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) dbMissing = true;
    else throw err;
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Vouchers</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink/60">
        Vouchers are sold at the amounts set in{" "}
        <a href="/admin/settings" className="font-semibold text-lake">
          Settings
        </a>
        . A code is issued the moment payment completes and emailed to the
        buyer. <strong>Only the last four characters are kept here</strong> —
        the code itself is stored as a fingerprint, so it cannot be read out of
        this page or the database.
      </p>

      {!dbMissing && <VoucherRedeemForm bookings={bookings} />}

      {dbMissing ? (
        <div className="mt-6 rounded-md border border-ember/40 bg-ember/5 p-6 text-sm text-ink">
          Database not configured — no vouchers can be listed.
        </div>
      ) : vouchers.length === 0 ? (
        <p className="mt-6 text-sm text-ink/60">No vouchers sold yet.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {vouchers.map((v) => (
            <li key={v.id} className="rounded-md border border-mist bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm">
                  <span className="font-mono font-medium text-ink">
                    …{v.code_hint}
                  </span>
                  <span className="ml-2 text-ink/60">
                    USD {Number(v.amount_usd)}
                  </span>
                  <span className="ml-2 text-ink/50">→ {v.buyer_email}</span>
                  {v.recipient_email && (
                    <span className="ml-2 text-ink/40">
                      gift → {v.recipient_email}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className={`rounded-full px-2.5 py-1 font-medium ${STATUS_STYLE[v.status] || ""}`}
                  >
                    {v.status}
                  </span>
                  <span className="text-ink/40">
                    {v.issued_at.replace("T", " ").slice(0, 16)}
                  </span>
                </div>
              </div>
              {v.redeemed_booking_id && (
                <p className="mt-2 text-xs text-canopy">
                  Redeemed against booking{" "}
                  <span className="font-mono">{v.redeemed_booking_id.slice(0, 8)}</span>{" "}
                  on {v.redeemed_at?.replace("T", " ").slice(0, 16)}
                </p>
              )}
              {v.void_reason && (
                <p className="mt-2 text-xs text-ember">Voided: {v.void_reason}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}