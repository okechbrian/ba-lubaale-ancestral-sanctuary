import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Food, safety, what to bring, one household, photography, and cancellation — answered plainly.",
};

export default function FaqPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-dusk py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-4xl font-semibold text-cream sm:text-5xl">
            Questions
          </h1>
          <p className="mt-3 max-w-xl text-cream/80">
            The same answers you will find on the prepare and policies pages,
            gathered in one place.
          </p>
        </div>
      </section>

      {/* Food */}
      <section className="bg-cream py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-ink">
            Do female visitors really avoid chicken and eggs?
          </h2>
          <p className="mt-4 text-ink/70">
            As a house and cultural rule, female visitors do not eat chicken or
            eggs while at the sanctuary. This is a traditional protocol. It is
            stated plainly here and on the application form.
          </p>
        </div>
      </section>

      {/* Safety */}
      <section className="bg-mist py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-ink">
            Is the sanctuary a clinic?
          </h2>
          <p className="mt-4 text-ink/70">
            No. The sanctuary does not provide medical or emergency services.
            Sessions here are traditional, energetic, and artisanal. They
            complement and do not replace medical or psychiatric care. The
            sanctuary does not provide emergency or clinical services.
          </p>
        </div>
      </section>

      {/* What to bring */}
      <section className="bg-cream py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-ink">
            What should I bring?
          </h2>
          <p className="mt-4 text-ink/70">
            Light, modest clothing. Long-leg coverings for sacred ground. A
            head covering for sun. Easy-off shoes — shoes off on sacred ground,
            and phones are silenced in the Lake House and never allowed in the
            cave.
          </p>
          <p className="mt-4 text-ink/70">
            The digital sunset protocol means no screens after dark. Leave
            behind expectations of Wi-Fi or signal, a heavy schedule, alcohol
            or recreational drugs, and the need to document everything.
          </p>
        </div>
      </section>

      {/* One household */}
      <section className="bg-mist py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-ink">
            Can several groups visit at once?
          </h2>
          <p className="mt-4 text-ink/70">
            No. One household at a time. Private. Screened.
            Application-gated.
          </p>
        </div>
      </section>

      {/* Photography */}
      <section className="bg-cream py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-ink">
            May I take photographs?
          </h2>
          <p className="mt-4 text-ink/70">
            Photography and recording are not permitted inside the cave or
            shrines. Outside the sacred spaces, photographs are welcome but
            never staged. Do not photograph other guests without permission.
          </p>
        </div>
      </section>

      {/* Cancellation */}
      <section className="bg-dusk py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-cream">
            What about cancellation?
          </h2>
          <p className="mt-4 text-cream/70">
            Terms are confirmed in writing after approval.
          </p>
          <p className="mt-4 text-cream/70">
            The full terms are on the{" "}
            <Link href="/policies" className="font-semibold text-leaf hover:underline">
              Policies
            </Link>{" "}
            page.
          </p>
        </div>
      </section>
    </>
  );
}
