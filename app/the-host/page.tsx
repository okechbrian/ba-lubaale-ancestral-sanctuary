import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { HearHer } from "@/components/HearHer";
import { resolveContent } from "@/lib/cms";
import { hostBlockSchema } from "@/lib/cms/blocks";
import { hostDefault } from "@/content/the-host";
import InlineText from "@/components/InlineText";

export const metadata: Metadata = {
  title: "The Host",
  description:
    "Queen Nalubaale — Mama Nalubaale. Seer, healer, and master artisan. The heart of the sanctuary.",
};

export const revalidate = 60;

export default async function TheHostPage() {
  const c = await resolveContent("content:the-host", hostBlockSchema, hostDefault);

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
                  src={c.bio.image.src}
                  alt={c.bio.image.alt}
                  width={600}
                  height={450}
                  className="aspect-[4/3] w-full object-cover"
                />
              </div>
            </div>
            <div className="lg:col-span-4 lg:col-start-9">
              <h2 className="font-display text-3xl font-semibold text-ink">
                {c.bio.heading}
              </h2>
              <div className="mt-4 max-w-md space-y-4 text-ink/70">
                {c.bio.paragraphs.map((p, i) => (
                  <p key={i}>
                    <InlineText text={p} />
                  </p>
                ))}
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
            {c.work.heading}
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {c.work.images.map((img) => (
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

      {/* Quote */}
      <section className="bg-dusk py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <blockquote className="font-display text-2xl leading-relaxed text-cream sm:text-3xl">
            {c.quote.text}
          </blockquote>
          <cite className="mt-6 block text-sm not-italic text-bark-soft">
            {c.quote.cite}
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
