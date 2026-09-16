import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Land",
  description:
    "Ten acres of forest, lake shore, spring, herd, and fire on the Ssese Islands of Lake Victoria, Uganda.",
};

export default function TheLandPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[50vh] items-end overflow-hidden">
        <div className="absolute inset-0 bg-dusk" />
        <Image
          src="/images/forest-roots.jpg"
          alt="Buttress roots in the forest fed by an ancestral spring"
          fill
          priority
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dusk/70 to-transparent" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <h1 className="font-display text-4xl font-semibold text-cream sm:text-5xl">
            The Land
          </h1>
          <p className="mt-3 max-w-xl text-cream/80">
            Nestled on a secluded island wrapped in the rhythm of lake waves and
            morning birdsong. Built upon ten acres of forest fed by an ancestral
            spring.
          </p>
        </div>
      </section>

      {/* Overview */}
      <section className="bg-cream py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-semibold text-ink">
                A Living Place
              </h2>
              <p className="mt-4 text-ink/70">
                Home to a three-chambered sacred cave, free-roaming goats and
                cows, naturally fed lake fish, and an ancient resident tortoise.
                The forest is fed by an ancestral spring. The Lake House sits
                over living water.
              </p>
              <p className="mt-4 text-ink/70">
                Fire burns on the shore most evenings. Board over fish. Goat bell
                at dusk. Weaver nest in the branches above the path to the cave.
              </p>
            </div>
            <div className="relative overflow-hidden rounded-md">
              <Image
                src="/images/arrival-boat.jpg"
                alt="The water the Lake House sits on"
                width={600}
                height={450}
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="bg-mist py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <h3 className="font-display text-xl text-ink">The Lake House</h3>
              <p className="mt-2 text-sm text-ink/70">
                Rooms over the water. Organic meals cooked from the island —
                fish, herbs, farm milk, matooke, sweet potato. The sound of the
                lake is the only alarm.
              </p>
            </div>
            <div>
              <h3 className="font-display text-xl text-ink">The Forest</h3>
              <p className="mt-2 text-sm text-ink/70">
                Ten acres of indigenous trees, buttress roots, and forest
                trails. Coffee cherries on the branch. Butterflies in the
                understory. Bicycle trails to the far shore.
              </p>
            </div>
            <div>
              <h3 className="font-display text-xl text-ink">
                The Ancestral Spring
              </h3>
              <p className="mt-2 text-sm text-ink/70">
                Root water rising beneath tree roots. Used for cleansing before
                and after cave sessions. Not a tourist attraction — a working
                part of the sanctuary practice.
              </p>
            </div>
            <div>
              <h3 className="font-display text-xl text-ink">The Herd</h3>
              <p className="mt-2 text-sm text-ink/70">
                Free-roaming goats and cows. Naturally fed. The herd is part of
                the land, not a photo opportunity. Guest interaction is welcome
                but never staged.
              </p>
            </div>
            <div>
              <h3 className="font-display text-xl text-ink">The Fire</h3>
              <p className="mt-2 text-sm text-ink/70">
                The fireplace on the shore is where evening conversations happen.
                Where couples sit with the host. Where the day is laid down
                before sleep.
              </p>
            </div>
            <div>
              <h3 className="font-display text-xl text-ink">
                The Resident Tortoise
              </h3>
              <p className="mt-2 text-sm text-ink/70">
                A leopard tortoise who has lived on the island longer than any
                current guest. Seen on the stony shore most afternoons.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Lake Victoria Cruise */}
      <section className="bg-cream py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div className="relative overflow-hidden rounded-md">
              <Image
                src="/images/arrival-canoe.jpg"
                alt="Wooden canoe crossing to the sanctuary island"
                width={600}
                height={450}
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            <div>
              <h2 className="font-display text-3xl font-semibold text-ink">
                Arrival by Boat
              </h2>
              <p className="mt-4 text-ink/70">
                The sanctuary is reached by boat from the mainland. The crossing
                takes you past islands, fishing villages, and open water. The
                sound of the engine fades before the shore comes into view.
              </p>
              <p className="mt-4 text-ink/70">
                There is no dock sign. No resort flag. A wooden jetty, warm
                earth, and someone waiting.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tortoise video */}
      <section className="bg-dusk py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-cream">
            The Resident Tortoise
          </h2>
          <p className="mt-3 text-cream/70">
            A leopard tortoise on the stony shore. Silent. Patient. Older than
            any of us can say.
          </p>
          <div className="mt-8 overflow-hidden rounded-md">
            <video
              src="/video/tortoise.mp4"
              poster="/images/tortoise-poster.jpg"
              controls
              muted
              className="w-full"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-cream py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-ink">
            Ready to Walk the Land?
          </h2>
          <p className="mt-3 text-ink/70">
            The sanctuary is open by application only. One household at a time.
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
