import { getSettings } from "@/lib/db/settings";
import VoucherBuyForm from "@/components/VoucherBuyForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Gift vouchers — Ba Lubaale Ancestral Sanctuary",
  description:
    "Give a stay at Ba Lubaale Ancestral Sanctuary as a voucher. Pay securely by card or mobile money; the code arrives by email.",
};

/**
 * /vouchers — buy a gift voucher.
 *
 * The amounts shown come from /admin/settings and nowhere else: with none
 * configured the page says vouchers are not on sale rather than inventing a
 * price. Everything about the purchase is the same Pesapal pipeline the stays
 * use, and the code is issued by the IPN, not by the browser.
 */
export default async function VouchersPage() {
  const settings = await getSettings();
  const amounts = settings.voucherAmountsUsd ?? [];
  const onSale = amounts.length > 0;

  return (
    <>
      <section className="bg-dusk py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-4xl font-semibold text-cream sm:text-5xl">
            Gift a voucher
          </h1>
          <p className="mt-3 max-w-xl text-cream/80">
            A voucher is a fixed amount toward a stay at Ba Lubaale Ancestral
            Sanctuary. You pay once, securely, and the code arrives by email the
            moment payment completes. The recipient redeems it against their
            stay when they apply.
          </p>
        </div>
      </section>

      <section className="bg-cream py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          {onSale ? (
            <VoucherBuyForm amounts={amounts} />
          ) : (
            <div className="rounded-md border border-mist bg-white p-8">
              <p className="font-display text-xl text-ink">
                Vouchers are not on sale yet.
              </p>
              <p className="mt-3 text-ink/70">
                No voucher amounts have been published. Please write to us and
                we will let you know when they open.
              </p>
            </div>
          )}

          <div className="mt-10 space-y-4 text-sm text-ink/70">
            <h2 className="font-display text-lg font-semibold text-ink">
              How it works
            </h2>
            <ol className="list-decimal space-y-2 pl-5">
              <li>Choose an amount and pay by card or mobile money.</li>
              <li>
                Your code is emailed the moment the payment completes — check
                your spam folder if it has not arrived.
              </li>
              <li>
                When you (or the person you gifted it to) applies for a stay,
                send us the code and we apply it to the booking.
              </li>
              <li>
                Each voucher can be used once. We keep only a fingerprint of the
                code, so please keep the email.
              </li>
            </ol>
          </div>
        </div>
      </section>
    </>
  );
}