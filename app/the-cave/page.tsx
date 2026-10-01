import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Cave",
  description:
    "More than a hundred caves on Ssese, three open to guests — Nalubaale, Musisi, and Wanema. Guided sessions only. No photography.",
};

export default function TheCavePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[50vh] items-end overflow-hidden">
        <div className="absolute inset-0 bg-dusk" />
        <Image
          src="/images/og-cave-shore.jpg"
          alt="Mossed rock mouth of Nalubaale Cave seen from the water"
          fill
          priority
          quality={85}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dusk/70 to-transparent" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <h1 className="font-display text-4xl font-semibold text-cream sm:text-5xl">
            The Cave
          </h1>
          <p className="mt-3 max-w-xl text-cream/80">
            Deep inside the quiet chambers, guests work with silence, breath,
            and voice to set down what is heavy and hear what has been waiting.
          </p>
        </div>
      </section>

      {/* What happens here */}
      <section className="bg-cream py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-semibold text-ink">
                More Than a Hundred Caves
              </h2>
              <p className="mt-4 text-ink/70">
                Ssese holds more than a hundred caves. Only three are open to
                guests. The rest are visited only after a calling from
                themselves — they are never offered as an add-on to a booking,
                and they are not listed here.
              </p>
              <p className="mt-4 text-ink/70">
                Sessions are guided by the host. You do not enter alone. You do
                not enter on a schedule. The cave keeps its own time.
              </p>
            </div>
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-md">
                <Image
                  src="/images/cave-silhouette.jpg"
                  alt="Silhouette in the mouth of Nalubaale Cave"
                  width={600}
                  height={338}
                  className="aspect-[16/9] w-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The three open chambers */}
      <section id="cave" className="bg-mist py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-ink">
            The Three Open Chambers
          </h2>
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <div className="rounded-md border border-cream bg-cream p-6">
              <h3 className="font-display text-xl text-ink">
                Nalubaale Chamber
              </h3>
              <p className="mt-3 text-sm text-ink/70">
                Belonging to Nalongo Nalubaale, the twin mother — a Queen and
                mother to creation. People appeal to her for childbearing,
                marriage, and prosperity. You may visit the cave; closeness to
                her requires deep spiritual and physical cleansing.
              </p>
            </div>
            <div className="rounded-md border border-cream bg-cream p-6">
              <h3 className="font-display text-xl text-ink">
                Lubaale Musisi Chamber
              </h3>
              <p className="mt-3 text-sm text-ink/70">
                Known for movement and for the earthquake, and for waking every
                person from sleep. When your life has gone stagnant, this is
                the chamber to visit. Work with him may include his traditional
                diet.
              </p>
            </div>
            <div className="rounded-md border border-cream bg-cream p-6">
              <h3 className="font-display text-xl text-ink">
                Lubaale Wanema Chamber
              </h3>
              <p className="mt-3 text-sm text-ink/70">
                Father of Lubaale Mukasa. Reserved, and responsible for putting
                things straight. Go to him in the seasons when nothing you do
                lands right and people find fault in everything.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Cave etiquette */}
      <section className="bg-dusk py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-cream">
            Cave Etiquette
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div className="rounded-md border border-cream/10 p-6">
              <h3 className="font-display text-lg text-bark-soft">Shoes Off</h3>
              <p className="mt-2 text-sm text-cream/70">
                Shoes are removed before entering the cave. This is non-negotiable.
                Garments can be obtained at the sanctuary.
              </p>
            </div>
            <div className="rounded-md border border-cream/10 p-6">
              <h3 className="font-display text-lg text-bark-soft">
                No Phones or Photography
              </h3>
              <p className="mt-2 text-sm text-cream/70">
                Photography and recording are not permitted inside the cave or
                shrines. Phones are silenced before entry. The digital sunset
                rule applies here.
              </p>
            </div>
            <div className="rounded-md border border-cream/10 p-6">
              <h3 className="font-display text-lg text-bark-soft">Guided Only</h3>
              <p className="mt-2 text-sm text-cream/70">
                You do not wander the cave alone. Every session is led by the
                host or under her direction. The cave is a working sacred space,
                not a self-guided attraction.
              </p>
            </div>
            <div className="rounded-md border border-cream/10 p-6">
              <h3 className="font-display text-lg text-bark-soft">
                Traditional Work
              </h3>
              <p className="mt-2 text-sm text-cream/70">
                Sessions here are traditional, energetic, and artisanal. They
                complement and do not replace medical or psychiatric care. The
                sanctuary does not provide emergency or clinical services.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Cave images */}
      <section className="bg-cream py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-ink">
            Inside the Cave
          </h2>
          <p className="mt-3 text-ink/70">
            These images were taken by the host. Visitor photography inside the
            cave remains forbidden.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="overflow-hidden rounded-md">
              <Image
                src="/images/bark-cloth-cave-entrance.jpg"
                alt="Person in bark cloth standing at the rocky cave entrance"
                width={400}
                height={300}
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            <div className="overflow-hidden rounded-md">
              <Image
                src="/images/cave-threshold-hay.jpg"
                alt="First chamber of Nalubaale Cave with hay on the floor"
                width={400}
                height={300}
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            <div className="overflow-hidden rounded-md">
              <Image
                src="/images/cave-mouth-congregation.jpg"
                alt="Looking out toward the light from inside the cave"
                width={400}
                height={300}
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            <div className="overflow-hidden rounded-md">
              <Image
                src="/images/cave-kneeling.jpg"
                alt="White cloth kneeling work inside the cave"
                width={400}
                height={300}
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            <div className="overflow-hidden rounded-md">
              <Image
                src="/images/bark-cloth-hillside.jpg"
                alt="Person in bark cloth on the rocky hillside near the cave"
                width={400}
                height={300}
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-mist py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-ink">
            Ready to Enter the Cave?
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
