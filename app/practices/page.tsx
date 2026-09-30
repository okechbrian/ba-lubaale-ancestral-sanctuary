import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Practices",
  description:
    "Resident and day sessions — cave readings, breath work, craft, water meditation, and fire.",
};

export default function PracticesPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[50vh] items-end overflow-hidden">
        <div className="absolute inset-0 bg-dusk" />
        <Image
          src="/images/fire-night.jpg"
          alt="Night bonfire on the shore"
          fill
          priority
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dusk/70 to-transparent" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <h1 className="font-display text-4xl font-semibold text-cream sm:text-5xl">
            Resident &amp; Day Sessions
          </h1>
          <p className="mt-3 max-w-xl text-cream/80">
            Five families of practice. Work done on the island or at your
            location.
          </p>
        </div>
      </section>

      {/* Day sessions */}
      <section className="bg-cream py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-ink">
            Day Sessions
          </h2>
          <p className="mt-3 text-ink/70">
            Available to East Africa residents and visitors. Prices in USD.
          </p>

          <div className="mt-8 space-y-4">
            <div className="flex items-start justify-between gap-4 rounded-md border border-mist p-4">
              <div>
                <h3 className="font-display text-lg text-ink">
                  Cave Diagnostic &amp; Seer Reading
                </h3>
                <p className="mt-1 text-sm text-ink/60">90 minutes</p>
              </div>
              <p className="font-display text-lg text-ink shrink-0">USD 250</p>
            </div>

            <div className="flex items-start justify-between gap-4 rounded-md border border-mist p-4">
              <div>
                <h3 className="font-display text-lg text-ink">
                  Breath, Voice &amp; Hand Trauma Healing
                </h3>
                <p className="mt-1 text-sm text-ink/60">2 hours</p>
              </div>
              <p className="font-display text-lg text-ink shrink-0">USD 350</p>
            </div>

            <div className="flex items-start justify-between gap-4 rounded-md border border-mist p-4">
              <div>
                <h3 className="font-display text-lg text-ink">
                  Fireplace Relationship Arbitration
                </h3>
                <p className="mt-1 text-sm text-ink/60">
                  2.5 hours · per couple/family
                </p>
              </div>
              <p className="font-display text-lg text-ink shrink-0">USD 450</p>
            </div>

            <div className="flex items-start justify-between gap-4 rounded-md border border-mist p-4">
              <div>
                <h3 className="font-display text-lg text-ink">
                  Home / Workplace Energy Cleansing
                </h3>
              </div>
              <p className="font-display text-lg text-ink shrink-0">
                USD 500–1,500
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Resident stays */}
      <section className="bg-mist py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-ink">
            Resident Stays
          </h2>
          <p className="mt-3 text-ink/70">
            Multi-day immersions for East Africa residents. Prices in USD.
          </p>

          <div className="mt-8 space-y-4">
            <div className="flex items-start justify-between gap-4 rounded-md border border-cream p-4">
              <div>
                <h3 className="font-display text-lg text-ink">
                  The Sacred Reconnect
                </h3>
                <p className="mt-1 text-sm text-ink/60">Solo stay</p>
              </div>
              <p className="font-display text-lg text-ink shrink-0">
                USD 1,800
              </p>
            </div>

            <div className="flex items-start justify-between gap-4 rounded-md border border-cream p-4">
              <div>
                <h3 className="font-display text-lg text-ink">
                  Union &amp; Mending
                </h3>
                <p className="mt-1 text-sm text-ink/60">
                  Couples / family stay
                </p>
              </div>
              <p className="font-display text-lg text-ink shrink-0">
                USD 2,800
              </p>
            </div>

            <div className="flex items-start justify-between gap-4 rounded-md border border-cream p-4">
              <div>
                <h3 className="font-display text-lg text-ink">
                  Master Artisan &amp; Seer Immersion
                </h3>
                <p className="mt-1 text-sm text-ink/60">5 days</p>
              </div>
              <p className="font-display text-lg text-ink shrink-0">
                USD 3,500
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Workshop practices */}
      <section className="bg-cream py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-ink">
            Workshop Practices
          </h2>
          <p className="mt-3 text-ink/70">
            Included in longer stays or available separately.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-md border border-mist p-4">
              <h3 className="font-display text-lg text-ink">
                Sunset Lake &amp; Water Meditation Cruise
              </h3>
              <p className="mt-1 text-sm text-ink/60">
                Evening boat on the lake. Silence, sunset, and water.
              </p>
            </div>
            <div className="rounded-md border border-mist p-4">
              <h3 className="font-display text-lg text-ink">
                Forest &amp; Island Mountain Bike Trails
              </h3>
              <p className="mt-1 text-sm text-ink/60">
                Guided rides through the forest and along the shore.
              </p>
            </div>
            <div className="rounded-md border border-mist p-4">
              <h3 className="font-display text-lg text-ink">
                Weaving Intention Workshop
              </h3>
              <p className="mt-1 text-sm text-ink/60">
                Banana fibre, palm leaf, and bark cloth. Intention made
                tangible.
              </p>
            </div>
            <div className="rounded-md border border-mist p-4">
              <h3 className="font-display text-lg text-ink">
                Bark Cloth Attire &amp; Wall Hanging
              </h3>
              <p className="mt-1 text-sm text-ink/60">
                Full olubugo craft — from bark to garment.
              </p>
            </div>
            <div className="rounded-md border border-mist p-4 sm:col-span-2">
              <h3 className="font-display text-lg text-ink">
                Talisman Assembly
              </h3>
              <p className="mt-1 text-sm text-ink/60">
                Cowrie, stone, seed, and thread. A protective object made with
                your own hands.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Supporting stills */}
      <section className="bg-mist py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="overflow-hidden rounded-md">
              <Image
                src="/images/fire-embers.jpg"
                alt="Low embers glowing on the shore fire"
                width={400}
                height={300}
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            <div className="overflow-hidden rounded-md">
              <Image
                src="/images/host-measuring-bark.jpg"
                alt="Hands measuring bark cloth in the banana grove"
                width={400}
                height={300}
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            <div className="overflow-hidden rounded-md">
              <Image
                src="/images/sunset-calm-lake.jpg"
                alt="Golden sunset on calm Lake Victoria water"
                width={400}
                height={300}
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-dusk py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-cream">
            Ready to Begin?
          </h2>
          <p className="mt-3 text-cream/70">
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
