import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { resolveContent } from "@/lib/cms";
import { atelierBlockSchema } from "@/lib/cms/blocks";
import { atelierDefault } from "@/content/atelier";
import InlineText from "@/components/InlineText";

export const metadata: Metadata = {
  title: "Atelier",
  description:
    "Using bark cloth, banana fibre, and cowrie, we explore craft as healing and make intention tangible.",
};

export const revalidate = 60;

export default async function AtelierPage() {
  const c = await resolveContent(
    "content:atelier",
    atelierBlockSchema,
    atelierDefault,
  );

  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[50vh] items-end overflow-hidden">
        <div className="absolute inset-0 bg-dusk" />
        <Image
          src={c.heroImage.src}
          alt={c.heroImage.alt}
          fill
          priority
          quality={85}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dusk/70 to-transparent" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <h1 className="font-display text-4xl font-semibold text-cream sm:text-5xl">
            The Atelier
          </h1>
          <p className="mt-3 max-w-xl text-cream/80">{c.heroLead}</p>
        </div>
      </section>

      {/* Bark cloth */}
      <section className="bg-cream py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-semibold text-ink">
                {c.bark.heading}
              </h2>
              {c.bark.paragraphs.map((p, i) => (
                <p key={i} className="mt-4 text-ink/70">
                  <InlineText text={p} />
                </p>
              ))}
            </div>
            <div className="relative overflow-hidden rounded-md">
              <Image
                src={c.bark.image.src}
                alt={c.bark.image.alt}
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
            {c.gallery.heading}
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {c.gallery.images.map((img) => (
              <div key={img.src + img.alt} className="overflow-hidden rounded-md">
                <Image
                  src={img.src}
                  alt={img.alt}
                  width={400}
                  height={300}
                  className="aspect-[4/3] w-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Finished pieces — portrait frames so the object is not cut short */}
      <section className="bg-cream py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-ink">
            {c.finished.heading}
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {c.finished.images.map((img) => (
              <div key={img.src + img.alt} className="overflow-hidden rounded-md">
                <Image
                  src={img.src}
                  alt={img.alt}
                  width={400}
                  height={533}
                  className="aspect-[3/4] w-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Worn craft */}
      <section className="bg-cream py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-ink">
            {c.worn.heading}
          </h2>
          <p className="mt-3 text-ink/70">{c.worn.intro}</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {c.worn.images.map((img) => (
              <div key={img.src + img.alt} className="overflow-hidden rounded-md">
                <Image
                  src={img.src}
                  alt={img.alt}
                  width={400}
                  height={300}
                  className="aspect-[4/3] w-full object-cover"
                />
              </div>
            ))}
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
