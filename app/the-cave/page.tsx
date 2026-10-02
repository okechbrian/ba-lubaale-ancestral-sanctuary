import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { resolveContent } from "@/lib/cms";
import { caveBlockSchema } from "@/lib/cms/blocks";
import { caveDefault } from "@/content/the-cave";
import InlineText from "@/components/InlineText";

export const metadata: Metadata = {
  title: "The Cave",
  description:
    "More than a hundred caves on Ssese, three open to guests — Nalubaale, Musisi, and Wanema. Guided sessions only. No photography.",
};

export const revalidate = 60;

export default async function TheCavePage() {
  const c = await resolveContent("content:the-cave", caveBlockSchema, caveDefault);

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
            The Cave
          </h1>
          <p className="mt-3 max-w-xl text-cream/80">{c.heroLead}</p>
        </div>
      </section>

      {/* What happens here */}
      <section className="bg-cream py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-semibold text-ink">
                {c.intro.heading}
              </h2>
              {c.intro.paragraphs.map((p, i) => (
                <p key={i} className="mt-4 text-ink/70">
                  <InlineText text={p} />
                </p>
              ))}
            </div>
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-md">
                <Image
                  src={c.intro.image.src}
                  alt={c.intro.image.alt}
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
            {c.chambers.heading}
          </h2>
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {c.chambers.items.map((ch) => (
              <div
                key={ch.title}
                className="rounded-md border border-cream bg-cream p-6"
              >
                <h3 className="font-display text-xl text-ink">{ch.title}</h3>
                <p className="mt-2 text-sm font-semibold text-ember">
                  {ch.tagline}
                </p>
                <p className="mt-3 text-sm text-ink/70">{ch.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cave etiquette */}
      <section className="bg-dusk py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-cream">
            {c.etiquette.heading}
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {c.etiquette.items.map((rule) => (
              <div
                key={rule.title}
                className="rounded-md border border-cream/10 p-6"
              >
                <h3 className="font-display text-lg text-bark-soft">
                  {rule.title}
                </h3>
                <p className="mt-2 text-sm text-cream/70">{rule.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cave images */}
      <section className="bg-cream py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-ink">
            {c.gallery.heading}
          </h2>
          <p className="mt-3 text-ink/70">{c.gallery.intro}</p>
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
