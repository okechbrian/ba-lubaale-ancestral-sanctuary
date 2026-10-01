import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { HearHer } from "@/components/HearHer";

export const metadata: Metadata = {
  title: "The Host",
  description:
    "Queen Nalubaale — Mama Nalubaale. Seer, healer, and master artisan. The heart of the sanctuary.",
};

export default function TheHostPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[50vh] items-end overflow-hidden">
        <div className="absolute inset-0 bg-dusk" />
        <Image
          src="/images/host-portrait-headwrap.jpg"
          alt="Queen Nalubaale outdoors in a brown headwrap and gold collar"
          fill
          priority
          quality={85}
          className="absolute inset-0 h-full w-full object-cover object-[center_22%]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dusk/70 to-transparent" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <h1 className="font-display text-4xl font-semibold text-cream sm:text-5xl">
            Queen Nalubaale
          </h1>
          <p className="mt-2 text-bark-soft text-lg">Mama Nalubaale</p>
          <p className="mt-1 text-cream/70 text-sm">Seer, Healer, Master Artisan</p>
        </div>
      </section>

      {/* Bio */}
      <section className="bg-cream py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-7">
              <div className="overflow-hidden rounded-md">
                <Image
                  src="/images/host-measuring-bark.jpg"
                  alt="Queen Nalubaale measuring bark cloth with tape in the banana grove"
                  width={600}
                  height={450}
                  className="aspect-[4/3] w-full object-cover"
                />
              </div>
            </div>
            <div className="lg:col-span-4 lg:col-start-9">
              <h2 className="font-display text-3xl font-semibold text-ink">
                Seer, Healer, Master Artisan
              </h2>
              <div className="mt-4 max-w-md space-y-4 text-ink/70">
                <p>
                  I work with voice, hands, breath, water, fire, wind, and earth
                  — and with bark, cowrie, and root water beside the fire that
                  has burned on this shore longer than any of us can remember.
                  Being of Ssese origin, I am close to my ancestors.
                </p>
                <p>
                  This sanctuary is not a place I started. It is a place I was
                  given — I knowingly inherited this responsibility in August
                  1998. The work I carry came from the women who kept this place
                  long before me. It is old, it is living, and it is not mine to
                  sell — only to hold and share.
                </p>
                <p>
                  My Munyoro mother taught me the techniques I work with here.
                  Her mother — my grandmother, a princess of Tooro — raised me in
                  my early years.
                </p>
                <p>
                  I do not offer guarantees. I offer time, silence, and those
                  techniques. What happens in the cave is between you and the
                  space. I am the one who holds the door.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hear her — the film shelf */}
      <HearHer />

      {/* Working portraits */}
      <section className="bg-mist py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-ink">
            The Work
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="overflow-hidden rounded-md">
              <Image
                src="/images/host-compound-walk.jpg"
                alt="Queen Nalubaale walking through the compound in blue wax print"
                width={400}
                height={300}
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            <div className="overflow-hidden rounded-md">
              <Image
                src="/images/host-night-fire.jpg"
                alt="Queen Nalubaale at night by the fire in bark cloth and cowrie"
                width={400}
                height={300}
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            <div className="overflow-hidden rounded-md">
              <Image
                src="/images/host-lake-scarf.jpg"
                alt="Queen Nalubaale with green scarf, lake behind"
                width={400}
                height={300}
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Quote */}
      <section className="bg-dusk py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <blockquote className="font-display text-2xl leading-relaxed text-cream sm:text-3xl">
            &ldquo;I listen to the wave upon the shore, the breath within your
            chest, and the stories carried in the roots of this land. Welcome
            home to yourself.&rdquo;
          </blockquote>
          <cite className="mt-6 block text-sm not-italic text-bark-soft">
            — Queen Nalubaale
          </cite>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-cream py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-ink">
            Work with the Host
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
