import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Prepare",
  description:
    "Arrival, packing, protocols, and what to know before you come to the sanctuary.",
};

export default function PreparePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[50vh] items-end overflow-hidden">
        <div className="absolute inset-0 bg-dusk" />
        <Image
          src="/images/shore-calm-blue.jpg"
          alt="Calm water on the lake with the far shore in the distance"
          fill
          priority
          quality={85}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dusk/70 to-transparent" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <h1 className="font-display text-4xl font-semibold text-cream sm:text-5xl">
            Prepare
          </h1>
          <p className="mt-3 max-w-xl text-cream/80">
            What to know before you arrive. The sanctuary runs on protocols, not
            schedules.
          </p>
        </div>
      </section>

      {/* Arrival */}
      <section className="bg-cream py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-semibold text-ink">
                Arrival
              </h2>
              <p className="mt-4 text-ink/70">
                The sanctuary is reached by boat from the mainland. We arrange
                the crossing. Arrive at the designated jetty on the agreed day.
                Someone will be waiting.
              </p>
              <p className="mt-4 text-ink/70">
                Bring light clothing, a head covering for sun, and shoes you
                can remove easily. Long-leg coverings are required on sacred
                ground. Garments can be obtained at the sanctuary if needed.
              </p>
              <Link
                href="/arrive"
                className="mt-4 inline-block text-sm font-semibold text-leaf hover:underline"
              >
                The journey →
              </Link>
            </div>
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-md">
                <Image
                  src="/images/arrival-canoe.jpg"
                  alt="Wooden canoe crossing to the sanctuary"
                  width={600}
                  height={338}
                  className="aspect-[16/9] w-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Packing */}
      <section className="bg-mist py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-ink">
            What to Bring
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-md border border-cream p-4">
              <h3 className="font-display text-lg text-ink">Pack</h3>
              <ul className="mt-2 space-y-1 text-sm text-ink/70">
                <li>Light, modest clothing</li>
                <li>Long-leg coverings for sacred ground</li>
                <li>Head covering for sun</li>
                <li>Easy-off shoes</li>
                <li>Insect repellent</li>
                <li>A journal or notebook</li>
              </ul>
            </div>
            <div className="rounded-md border border-cream p-4">
              <h3 className="font-display text-lg text-ink">Leave Behind</h3>
              <ul className="mt-2 space-y-1 text-sm text-ink/70">
                <li>Expectations of Wi-Fi or signal</li>
                <li>A heavy schedule</li>
                <li>Alcohol or recreational drugs</li>
                <li>The need to document everything</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Digital sunset */}
      <section className="bg-dusk py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-cream">
            Digital Sunset
          </h2>
          <p className="mt-4 text-cream/70">
            Phones are silenced in the Lake House and never allowed in the cave.
            This is not a suggestion. The digital sunset protocol means no
            screens after dark. If you need to make an urgent call, step away
            from the shared spaces.
          </p>
          <div className="mt-8 max-w-md overflow-hidden rounded-md">
            <Image
              src="/images/fire-embers.jpg"
              alt="Low embers glowing on the evening shore fire"
              width={400}
              height={300}
              className="aspect-[4/3] w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Substance-free */}
      <section className="bg-cream py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-ink">
            Substance-Free
          </h2>
          <p className="mt-4 text-ink/70">
            The sanctuary is alcohol-free and drug-free. No recreational
            substances. Plant-respect protocols apply to all herbal teas and
            remedies offered on the land.
          </p>
        </div>
      </section>

      {/* Female-visitor food protocol */}
      <section className="bg-mist py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-ink">
            Female-Visitor Food Protocol
          </h2>
          <p className="mt-4 text-ink/70">
            As a house and cultural rule, female visitors do not eat chicken or
            eggs while at the sanctuary. This is a traditional protocol rooted
            in the practices of this land. It applies to all female guests
            regardless of age, origin, or reason for visiting.
          </p>
          <p className="mt-4 text-ink/70">
            The food served is island-grown and lake-sourced: fish, matooke,
            sweet potato, herbs, farm milk, fruit. The protocol is stated plainly
            here and will appear as a yes/no question on the application form.
          </p>
          <div className="mt-6 max-w-sm overflow-hidden rounded-md">
            <Image
              src="/images/food-whole-fish.jpg"
              alt="A whole fish served on a banana leaf"
              width={400}
              height={300}
              className="aspect-[4/3] w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Photography */}
      <section className="bg-cream py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-ink">
            Photography
          </h2>
          <p className="mt-4 text-ink/70">
            Photography and recording are not permitted inside the cave or
            shrines. Outside the sacred spaces, photographs are welcome but
            never staged. Do not photograph other guests without permission.
          </p>
        </div>
      </section>

      {/* Legal lines */}
      <section className="bg-dusk py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-cream">
            Important
          </h2>
          <p className="mt-4 text-cream/70">
            Fish feeding and chamber work are guided by the host — never
            self-serve. You are shown what to do, and when.
          </p>
          <p className="mt-4 text-cream/70">
            Sessions here are traditional, energetic, and artisanal. They
            complement and do not replace medical or psychiatric care. The
            sanctuary does not provide emergency or clinical services.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-cream py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-ink">
            Ready?
          </h2>
          <p className="mt-3 text-ink/70">
            This is a request, not a confirmed booking. We will be in touch
            within several days.
          </p>
          <Link
            href="/apply"
            className="mt-8 inline-block rounded-md bg-lake px-8 py-3 text-sm font-semibold text-cream transition-colors hover:bg-lake/80"
          >
            Request an Immersion
          </Link>
        </div>
      </section>
    </>
  );
}
