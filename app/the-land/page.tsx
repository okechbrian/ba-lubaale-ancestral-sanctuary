import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { resolveContent } from "@/lib/cms";
import { landBlockSchema } from "@/lib/cms/blocks";
import { landDefault } from "@/content/the-land";
import InlineText from "@/components/InlineText";

export const metadata: Metadata = {
  title: "The Land",
  description:
    "Vast forest, lake shore, spring, herd, and fire on the Ssese Islands of Lake Victoria, Uganda.",
};

export const revalidate = 60;

export default async function TheLandPage() {
  const c = await resolveContent("content:the-land", landBlockSchema, landDefault);

  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[50vh] items-end overflow-hidden">
        <div className="absolute inset-0 bg-dusk" />
        <Image
          src={c.hero.image.src}
          alt={c.hero.image.alt}
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
          <p className="mt-3 max-w-xl text-cream/80">{c.hero.lead}</p>
        </div>
      </section>

      {/* Overview */}
      <section className="bg-cream py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-semibold text-ink">
                {c.overview.heading}
              </h2>
              {c.overview.paragraphs.map((p, i) => (
                <p key={i} className="mt-4 text-ink/70">
                  <InlineText text={p} />
                </p>
              ))}
            </div>
            <div className="relative overflow-hidden rounded-md">
              <Image
                src={c.overview.image.src}
                alt={c.overview.image.alt}
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
            {c.features.map((f) => (
              <div key={f.title} className={f.image ? "overflow-hidden rounded-md" : ""}>
                {f.image && (
                  <Image
                    src={f.image.src}
                    alt={f.image.alt}
                    width={400}
                    height={300}
                    className="aspect-[4/3] w-full object-cover"
                  />
                )}
                <h3
                  className={`font-display text-xl text-ink ${
                    f.image ? "mt-3" : ""
                  }`}
                >
                  {f.title}
                </h3>
                <p className="mt-2 text-sm text-ink/70">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lake House video */}
      <section className="bg-cream py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-ink">
            {c.lakeHouse.heading}
          </h2>
          <p className="mt-3 text-ink/70">{c.lakeHouse.blurb}</p>
          <div className="mt-8 overflow-hidden rounded-md">
            <video
              src="/video/lake-house.mp4"
              poster="/images/lake-house-poster.jpg"
              preload="none"
              controls
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
            {c.food.heading}
          </h2>
          <p className="mt-3 max-w-2xl text-ink/70">{c.food.intro}</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {c.food.images.map((img) => (
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

      {/* Forest trails */}
      <section className="bg-cream py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-semibold text-ink">
                {c.forest.heading}
              </h2>
              {c.forest.paragraphs.map((p, i) => (
                <p key={i} className="mt-4 text-ink/70">
                  <InlineText text={p} />
                </p>
              ))}
            </div>
            <div className="grid gap-4">
              {c.forest.images.map((img) => (
                <div key={img.src + img.alt} className="overflow-hidden rounded-md">
                  <Image
                    src={img.src}
                    alt={img.alt}
                    width={600}
                    height={450}
                    className="aspect-[4/3] w-full object-cover"
                  />
                </div>
              ))}
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
                src={c.arrival.image.src}
                alt={c.arrival.image.alt}
                width={600}
                height={450}
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            <div>
              <h2 className="font-display text-3xl font-semibold text-ink">
                {c.arrival.heading}
              </h2>
              {c.arrival.paragraphs.map((p, i) => (
                <p key={i} className="mt-4 text-ink/70">
                  <InlineText text={p} />
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Tortoise video */}
      <section className="bg-dusk py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-cream">
            {c.tortoise.heading}
          </h2>
          <p className="mt-3 text-cream/70">{c.tortoise.blurb}</p>
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
