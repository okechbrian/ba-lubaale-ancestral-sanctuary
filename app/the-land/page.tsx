import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Land",
  description:
    "Vast forest, lake shore, spring, herd, and fire on the Ssese Islands of Lake Victoria, Uganda.",
};

export default function TheLandPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[50vh] items-end overflow-hidden">
        <div className="absolute inset-0 bg-dusk" />
        <Image
          src="/images/forest-lake-view.jpg"
          alt="A spreading tree with mossy buttress roots, the lake showing through the trunks"
          fill
          priority
          quality={85}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dusk/70 to-transparent" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <h1 className="font-display text-4xl font-semibold text-cream sm:text-5xl">
            The Land
          </h1>
          <p className="mt-3 max-w-xl text-cream/80">
            Nestled on a secluded island wrapped in the rhythm of lake waves and
            morning birdsong. Set within vast forest fed by an ancestral
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
                Ba Lubaale Ancestral Sanctuary Kiwamirembe is a living place —
                ground to approach the Lubaale of Ssese and Lake Nalubaale in a
                single visit, with the host holding the door.
              </p>
              <p className="mt-4 text-ink/70">
                It is older than the people now standing on it. It was passed
                to her in 1998.
              </p>
              <p className="mt-4 text-ink/70">
                The forest, the spring, the fire, the herd, and more than a
                hundred caves are here. Three of the caves are open to guests —
                Nalubaale, Lubaale Musisi, and Lubaale Wanema. The rest are
                visited only after a calling.{" "}
                <Link
                  href="/the-cave"
                  className="font-semibold text-leaf hover:underline"
                >
                  See the three open caves →
                </Link>
              </p>
            </div>
            <div className="relative overflow-hidden rounded-md">
              <Image
                src="/images/lake-house.jpg"
                alt="The Lake House on stilts over Lake Victoria, framed by mango trees"
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
            <div className="overflow-hidden rounded-md">
              <Image
                src="/images/lake-house.jpg"
                alt="The Lake House on stilts over Lake Victoria"
                width={400}
                height={300}
                className="aspect-[4/3] w-full object-cover"
              />
              <h3 className="mt-3 font-display text-xl text-ink">The Lake House</h3>
              <p className="mt-2 text-sm text-ink/70">
                Organic meals cooked from the island — fish, herbs, farm milk,
                matooke, sweet potato.
              </p>
            </div>
            <div className="overflow-hidden rounded-md">
              <Image
                src="/images/forest-canopy.jpg"
                alt="Dense canopy of indigenous trees in the sanctuary forest"
                width={400}
                height={300}
                className="aspect-[4/3] w-full object-cover"
              />
              <h3 className="mt-3 font-display text-xl text-ink">The Forest</h3>
              <p className="mt-2 text-sm text-ink/70">
                Tropical forest set against the grassland that surrounds it. An
                ancient tree stands inside, and the spring rises in its roots.
                Birds, monkeys, butterflies — and the sound of water that is
                not always seen. Weaver nests hang in the branches above the
                path to the cave.
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
            <div className="overflow-hidden rounded-md">
              <Image
                src="/images/herd-goats.jpg"
                alt="Free-roaming goats in the sanctuary compound"
                width={400}
                height={300}
                className="aspect-[4/3] w-full object-cover"
              />
              <h3 className="mt-3 font-display text-xl text-ink">The Herd</h3>
              <p className="mt-2 text-sm text-ink/70">
                Free-roaming goats and cows. Naturally fed. Goat bell at dusk.
                The herd is part of the land, not a photo opportunity. Guest
                interaction is welcome but never staged.
              </p>
            </div>
            <div>
              <h3 className="font-display text-xl text-ink">The Fire</h3>
              <p className="mt-2 text-sm text-ink/70">
                Fire burns on the shore most evenings. Evening conversation
                here, with the host and her people. The day is laid down before
                sleep.
              </p>
            </div>
            <div>
              <h3 className="font-display text-xl text-ink">
                The Resident Tortoise
              </h3>
              <p className="mt-2 text-sm text-ink/70">
                Mutaka, a leopard tortoise who has lived on the island longer
                than any current guest. Seen most afternoons on the stony shore.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Lake House video */}
      <section className="bg-cream py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-ink">
            The Lake House
          </h2>
          <p className="mt-3 text-ink/70">
            The Lake House sits on the water and hosts the ba Lubaale who stay
            in the lake. Fish feeding is done here, always guided.
          </p>
          <p className="mt-3 text-ink/70">
            Rooms sit over the water on stilts, and the lake is the only alarm.
          </p>
          <div className="mt-8 overflow-hidden rounded-md">
            <video
              src="/video/lake-house.mp4"
              muted
              playsInline
              loop
              className="w-full"
            />
          </div>
        </div>
      </section>

      {/* Island food */}
      <section className="bg-mist py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-ink">
            Island Food
          </h2>
          <p className="mt-3 max-w-2xl text-ink/70">
            Everything served at the sanctuary comes from the island or the lake.
            Fish caught that morning. Matooke from the garden. Herbs from the
            forest. Milk from the herd.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="overflow-hidden rounded-md">
              <Image
                src="/images/fresh-tilapia.jpg"
                alt="Fresh tilapia caught from Lake Victoria"
                width={400}
                height={300}
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            <div className="overflow-hidden rounded-md">
              <Image
                src="/images/pineapple-farm-lake.jpg"
                alt="Pineapple farm on the hillside with Lake Victoria behind"
                width={400}
                height={300}
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            <div className="overflow-hidden rounded-md">
              <Image
                src="/images/bark-cloth-banana-harvest.jpg"
                alt="Preparing banana harvest in the cookhouse"
                width={400}
                height={300}
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Forest trails */}
      <section className="bg-cream py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-semibold text-ink">
                The Forest
              </h2>
              <p className="mt-4 text-ink/70">
                Tropical forest against the grassland that surrounds it. An
                ancient tree stands inside, and the spring rises in its roots —
                clean water, sacred and healing. Birds, monkeys, butterflies,
                and the sound of water that is not always seen.
              </p>
              <p className="mt-4 text-ink/70">
                Trails wind through the canopy to the far shore. Bicycle paths
                for those who want to move. Still spots for those who want to
                sit.
              </p>
            </div>
            <div className="grid gap-4">
              <div className="overflow-hidden rounded-md">
                <Image
                  src="/images/forest-lake-view.jpg"
                  alt="Moss-covered tree with Lake Victoria visible through the forest canopy"
                  width={600}
                  height={450}
                  className="aspect-[4/3] w-full object-cover"
                />
              </div>
              <div className="overflow-hidden rounded-md">
                <Image
                  src="/images/forest-canopy.jpg"
                  alt="Dense canopy of indigenous trees in the sanctuary forest"
                  width={600}
                  height={450}
                  className="aspect-[4/3] w-full object-cover"
                />
              </div>
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
            Mutaka on the stony shore. Silent. Patient. Older than any of us
            can say.
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
            className="mt-8 inline-block rounded-md bg-lake px-8 py-3 text-sm font-semibold text-cream transition-colors hover:bg-lake/80"
          >
            Request an Immersion
          </Link>
        </div>
      </section>
    </>
  );
}
