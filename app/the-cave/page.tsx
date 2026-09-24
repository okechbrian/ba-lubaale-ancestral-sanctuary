import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Cave",
  description:
    "Nalubaale Cave — three chambers of silence, breath, and voice. Guided sessions only. No photography.",
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
                Three Chambers
              </h2>
              <p className="mt-4 text-ink/70">
                Nalubaale Cave is a three-chambered sacred space. The first
                chamber is a threshold — hay on the floor, low light, the sound
                of water somewhere behind the rock. The second is where the
                deeper work happens. The third is for those who need to be
                completely alone.
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

      {/* Cave etiquette */}
      <section className="bg-dusk py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-cream">
            Cave Etiquette
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div className="rounded-md border border-cream/10 p-6">
              <h3 className="font-display text-lg text-bark">Shoes Off</h3>
              <p className="mt-2 text-sm text-cream/70">
                Shoes are removed before entering the cave. This is non-negotiable.
                Garments can be obtained at the sanctuary.
              </p>
            </div>
            <div className="rounded-md border border-cream/10 p-6">
              <h3 className="font-display text-lg text-bark">
                No Phones or Photography
              </h3>
              <p className="mt-2 text-sm text-cream/70">
                Photography and recording are not permitted inside the cave or
                shrines. Phones are silenced before entry. The digital sunset
                rule applies here.
              </p>
            </div>
            <div className="rounded-md border border-cream/10 p-6">
              <h3 className="font-display text-lg text-bark">Guided Only</h3>
              <p className="mt-2 text-sm text-cream/70">
                You do not wander the cave alone. Every session is led by the
                host or under her direction. The cave is a working sacred space,
                not a self-guided attraction.
              </p>
            </div>
            <div className="rounded-md border border-cream/10 p-6">
              <h3 className="font-display text-lg text-bark">
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
