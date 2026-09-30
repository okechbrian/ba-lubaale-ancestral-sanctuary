import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Atelier",
  description:
    "Bark cloth, banana fibre, cowrie — craft as healing, intention made tangible.",
};

export default function AtelierPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[50vh] items-end overflow-hidden">
        <div className="absolute inset-0 bg-dusk" />
        <Image
          src="/images/cowrie-four.jpg"
          alt="Four women wearing cowrie strand necklaces"
          fill
          priority
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dusk/70 to-transparent" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <h1 className="font-display text-4xl font-semibold text-cream sm:text-5xl">
            The Atelier
          </h1>
          <p className="mt-3 max-w-xl text-cream/80">
            As the fingers work banana fibre, palm leaf, and bark cloth beside
            the fire, intention leaves the mouth and enters the object that goes
            home.
          </p>
        </div>
      </section>

      {/* Bark cloth */}
      <section className="bg-cream py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-semibold text-ink">
                Bark Cloth — Olubugo
              </h2>
              <p className="mt-4 text-ink/70">
                The bark of the mutuba tree is beaten with wooden mallets until
                it becomes a soft, wearable cloth. This is one of Uganda&apos;s
                oldest textile traditions — UNESCO recognised. At the
                sanctuary, guests learn to measure, cut, and sew bark cloth
                into garments, wall hangings, and talisman wraps.
              </p>
              <p className="mt-4 text-ink/70">
                You do not only speak the intention. You weave it, sew it, and
                carry it home.
              </p>
            </div>
            <div className="relative overflow-hidden rounded-md">
              <Image
                src="/images/host-measuring-bark.jpg"
                alt="Mama Nalubaale measuring bark cloth with tape"
                width={600}
                height={450}
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="bg-mist py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-ink">
            Craft Gallery
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="overflow-hidden rounded-md">
              <Image
                src="/images/bark-circle.jpg"
                alt="Workshop circle with sheets of olubugo bark cloth"
                width={400}
                height={300}
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            <div className="overflow-hidden rounded-md">
              <Image
                src="/images/weaving-basket.jpg"
                alt="Woman weaving a large basket from natural fibres"
                width={400}
                height={300}
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            <div className="overflow-hidden rounded-md">
              <Image
                src="/images/bark-dress-hearts.jpg"
                alt="Bark cloth dress with decorative heart cutouts and cowrie trim"
                width={400}
                height={300}
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            <div className="overflow-hidden rounded-md">
              <Image
                src="/images/bark-dresses-stand.jpg"
                alt="Finished bark-cloth dresses on a stand"
                width={400}
                height={300}
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            <div className="overflow-hidden rounded-md">
              <Image
                src="/images/bark-dresses-detail.jpg"
                alt="Waist and cowrie detail on bark-cloth garments"
                width={400}
                height={300}
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            <div className="overflow-hidden rounded-md">
              <Image
                src="/images/bananas-woven-mats.jpg"
                alt="Ripe bananas hanging beside woven mats in the cookhouse"
                width={400}
                height={300}
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Finished pieces — portrait frames so the object is not cut short */}
      <section className="bg-cream py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-ink">
            Finished Pieces
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="overflow-hidden rounded-md">
              <Image
                src="/images/cowrie-necklace-still.jpg"
                alt="Finished cowrie and stone necklace"
                width={400}
                height={533}
                className="aspect-[3/4] w-full object-cover"
              />
            </div>
            <div className="overflow-hidden rounded-md">
              <Image
                src="/images/braided-bead-set.jpg"
                alt="Braided bead necklace and bracelet set"
                width={400}
                height={533}
                className="aspect-[3/4] w-full object-cover"
              />
            </div>
            <div className="overflow-hidden rounded-md">
              <Image
                src="/images/cowrie-seed-necklace.jpg"
                alt="Cowrie, seed, and white bead strand"
                width={400}
                height={533}
                className="aspect-[3/4] w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Worn craft */}
      <section className="bg-cream py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-ink">
            Worn Craft
          </h2>
          <p className="mt-3 text-ink/70">
            Cowrie strands, seed beads, and kente-stripe cloth — worn during
            ceremonies and made by hand at the sanctuary.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="overflow-hidden rounded-md">
              <Image
                src="/images/cowrie-two.jpg"
                alt="Two women wearing cowrie necklaces"
                width={400}
                height={300}
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            <div className="overflow-hidden rounded-md">
              <Image
                src="/images/kente-shore-two.jpg"
                alt="Two women in striped cloth by the lake"
                width={400}
                height={300}
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            <div className="overflow-hidden rounded-md">
              <Image
                src="/images/kente-water-rite.jpg"
                alt="Water blessing at the shore"
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
            Make Something with Your Hands
          </h2>
          <p className="mt-3 text-cream/70">
            The atelier is part of every immersion. Or come for a day workshop.
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
