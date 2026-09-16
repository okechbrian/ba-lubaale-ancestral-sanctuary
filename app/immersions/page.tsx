import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Immersions",
  description:
    "Three-day, five-day, and whole-island immersions — private, screened, one household at a time.",
};

export default function ImmersionsPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[50vh] items-end overflow-hidden">
        <div className="absolute inset-0 bg-dusk" />
        <img
          src="/images/closing-shore.jpg"
          alt="Shore gathering on Lake Victoria"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dusk/70 to-transparent" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <h1 className="font-display text-4xl font-semibold text-cream sm:text-5xl">
            Immersions
          </h1>
          <p className="mt-3 max-w-xl text-cream/80">
            One household at a time. Private. Screened. Application-gated.
          </p>
        </div>
      </section>

      {/* International table */}
      <section className="bg-cream py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-ink">
            International Immersions
          </h2>
          <p className="mt-3 text-ink/70">
            Prices in USD. All immersions include Lake House accommodation,
            organic meals, and guided sessions with the host.
          </p>

          <div className="mt-10 space-y-8">
            {/* Essential */}
            <div className="rounded-md border border-mist p-6 sm:p-8">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <h3 className="font-display text-2xl text-ink">
                    Essential Healing Immersion
                  </h3>
                  <p className="mt-1 text-sm text-bark">3 days / 2 nights</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl text-ink">
                    USD 2,200 <span className="text-sm text-ink/60">solo</span>
                  </p>
                  <p className="font-display text-xl text-ink">
                    USD 3,600{" "}
                    <span className="text-sm text-ink/60">couple</span>
                  </p>
                </div>
              </div>
              <ul className="mt-6 space-y-2 text-sm text-ink/70">
                <li>Lake House room, organic meals</li>
                <li>1 cave diagnostic &amp; sound session</li>
                <li>1 root-water spring rinse</li>
                <li>Cowrie talisman workshop</li>
              </ul>
            </div>

            {/* Master */}
            <div className="rounded-md border border-mist p-6 sm:p-8">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <h3 className="font-display text-2xl text-ink">
                    Master Transformation &amp; Craft Immersion
                  </h3>
                  <p className="mt-1 text-sm text-bark">5 days / 4 nights</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl text-ink">
                    USD 4,500 <span className="text-sm text-ink/60">solo</span>
                  </p>
                  <p className="font-display text-xl text-ink">
                    USD 7,200{" "}
                    <span className="text-sm text-ink/60">couple</span>
                  </p>
                </div>
              </div>
              <ul className="mt-6 space-y-2 text-sm text-ink/70">
                <li>Full sanctuary access</li>
                <li>2 cave sessions (diagnostic &amp; trauma-release work)</li>
                <li>Daily root-water cleansing</li>
                <li>Fireplace arbitration if a couple</li>
                <li>Bark-cloth garment or wall hanging</li>
                <li>Custom herbal teas</li>
              </ul>
            </div>

            {/* Buyout */}
            <div className="rounded-md border border-mist p-6 sm:p-8">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <h3 className="font-display text-2xl text-ink">
                    Whole-Island Buyout
                  </h3>
                  <p className="mt-1 text-sm text-bark">3 days</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl text-ink">
                    USD 10,000{" "}
                    <span className="text-sm text-ink/60">up to 4 guests</span>
                  </p>
                  <p className="text-sm text-ink/60">
                    + USD 1,500 per extra guest (max 8)
                  </p>
                </div>
              </div>
              <ul className="mt-6 space-y-2 text-sm text-ink/70">
                <li>Exclusive 10 acres, cave, Lake House, spring, livestock</li>
                <li>Unlimited 1-on-1 sessions and workshops for the group</li>
                <li>
                  Private cook using farm milk, eggs, fish, herbs
                </li>
              </ul>
            </div>
          </div>

          <p className="mt-8 text-sm text-ink/60">
            East Africa resident rates are offered on conversation and listed
            with day sessions on{" "}
            <Link href="/practices" className="text-ember hover:underline">
              Practices
            </Link>
            .
          </p>
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
            className="mt-8 inline-block rounded-md bg-bark px-8 py-3 text-sm font-semibold text-cream transition-colors hover:bg-bark/90"
          >
            Request an Immersion
          </Link>
        </div>
      </section>
    </>
  );
}
