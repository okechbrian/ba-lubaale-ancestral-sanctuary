import type { Metadata } from "next";
import { getSettings } from "@/lib/db/settings";

// Same reasoning as /immersions: a policy figure the owner can change in
// /admin/settings must not be frozen into this file. Re-render every minute.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Policies",
  description:
    "Deposits, cancellation, payments, safety, and sanctuary rules.",
};

export default async function PoliciesPage() {
  // The deposit percentage was written out four times as a literal "50%", so a
  // change in /admin/settings moved the actual charge and left the published
  // policy contradicting it. It is now read from the same place the checkout
  // reads it from.
  const { depositPercent } = await getSettings();
  const pct = `${depositPercent}%`;

  return (
    <>
      {/* Hero */}
      <section className="bg-dusk py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-4xl font-semibold text-cream sm:text-5xl">
            Policies
          </h1>
          <p className="mt-3 max-w-xl text-cream/80">
            The sanctuary runs on clarity, not fine print. These policies exist
            to protect both the guest and the practice.
          </p>
        </div>
      </section>

      {/* Deposits */}
      <section className="bg-cream py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-ink">
            Deposits
          </h2>
          <div className="mt-6 space-y-3 text-ink/70">
            <p>
              <strong>Day sessions:</strong> 100% at booking.
            </p>
            <p>
              <strong>3–5 day retreats:</strong> {pct} non-refundable to lock
              dates; balance 14 days before the boat.
            </p>
            <p>
              <strong>Whole-island buyouts:</strong> {pct} non-refundable; balance
              30 days before the boat.
            </p>
          </div>
        </div>
      </section>

      {/* Payments */}
      <section className="bg-mist py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-ink">
            Payments
          </h2>
          <p className="mt-4 text-ink/70">
            International wire transfer, card invoice, or approved mobile
            money. Details are shared after your application is accepted.
          </p>
        </div>
      </section>

      {/* Cancellation */}
      <section className="bg-cream py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-ink">
            Cancellation
          </h2>
          <div className="mt-6 space-y-3 text-ink/70">
            <p>
              <strong>30+ days before arrival:</strong> Deposit becomes a
              12-month credit toward a future stay.
            </p>
            <p>
              <strong>14–29 days before arrival:</strong> {pct} of total
              retained.
            </p>
            <p>
              <strong>Less than 14 days:</strong> Non-refundable. {pct} credit
              only for documented medical emergency.
            </p>
            <p>
              <strong>No-show or early departure:</strong> No refund.
            </p>
          </div>
        </div>
      </section>

      {/* Rules */}
      <section className="bg-dusk py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-cream">
            Sanctuary Rules
          </h2>
          <ul className="mt-6 space-y-3 text-cream/70">
            <li>Observe a digital sunset: phones must be silent in the Lake House, none in the cave</li>
            <li>Please do not litter; carry what you bring, respect the land</li>
            <li>No harming plants or animals</li>
            <li>Fire and cave sessions are guided only, and you must never enter alone</li>
            <li>Shoes off on sacred ground</li>
            <li>No photography inside the cave or shrines</li>
            <li>No alcohol or recreational drugs</li>
            <li>Long-leg coverings required on sacred ground</li>
          </ul>
        </div>
      </section>

      {/* Female-visitor food protocol */}
      <section className="bg-cream py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-ink">
            Female-Visitor Food Protocol
          </h2>
          <p className="mt-4 text-ink/70">
            As a house and cultural rule, female visitors do not eat chicken or
            eggs while at the sanctuary. This is a traditional protocol. It is
            stated plainly here and on the application form.
          </p>
        </div>
      </section>

      {/* Safety & privacy */}
      <section className="bg-mist py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-ink">
            Safety &amp; Privacy
          </h2>
          <p className="mt-4 text-ink/70">
            Guest information is kept private and never shared. We do not sell,
            rent, or distribute your data to any third party. Application
            details are used solely to prepare for your stay and are retained
            only as long as necessary.
          </p>
          <p className="mt-4 text-ink/70">
            The sanctuary does not provide medical or emergency services. If you
            have severe allergies, mobility limits, or mental health conditions,
            disclose them on the application form so we can prepare.
          </p>
        </div>
      </section>

      {/* Legal lines */}
      <section className="bg-dusk py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-cream">
            Disclaimer
          </h2>
          <p className="mt-4 text-cream/70">
            Sessions here are traditional, energetic, and artisanal. They
            complement and do not replace medical or psychiatric care. The
            sanctuary does not provide emergency or clinical services.
          </p>
          <p className="mt-4 text-cream/70">
            Photography and recording are not permitted inside the cave or
            shrines.
          </p>
        </div>
      </section>
    </>
  );
}
