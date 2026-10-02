import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { prepareDefault } from "@/content/prepare";

export const metadata: Metadata = {
  title: "Prepare",
  description:
    "Arrival, packing, protocols, and what to know before you come to the sanctuary.",
};

const p = prepareDefault;

export default function PreparePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[50vh] items-end overflow-hidden">
        <div className="absolute inset-0 bg-dusk" />
        <Image
          src="/images/shore-calm-blue.jpg"
          alt="Calm water on the lake with the far shore in the distance"
          fill
          priority
          quality={85}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dusk/70 to-transparent" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <h1 className="font-display text-4xl font-semibold text-cream sm:text-5xl">
            {p.hero.title}
          </h1>
          <p className="mt-3 max-w-xl text-cream/80">{p.hero.lead}</p>
        </div>
      </section>

      {/* Arrival */}
      <section className="bg-cream py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-semibold text-ink">
                {p.arrival.heading}
              </h2>
              {p.arrival.paragraphs.map((text) => (
                <p key={text} className="mt-4 text-ink/70">
                  {text}
                </p>
              ))}
              <Link
                href={p.arrival.link.href}
                className="mt-4 inline-block text-sm font-semibold text-leaf hover:underline"
              >
                {p.arrival.link.label} →
              </Link>
            </div>
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-md">
                <Image
                  src="/images/arrival-canoe.jpg"
                  alt="Wooden canoe crossing to the sanctuary"
                  width={600}
                  height={338}
                  className="aspect-[16/9] w-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Packing */}
      <section className="bg-mist py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-ink">
            {p.packing.heading}
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-md border border-cream p-4">
              <h3 className="font-display text-lg text-ink">
                {p.packing.packTitle}
              </h3>
              <ul className="mt-2 space-y-1 text-sm text-ink/70">
                {p.packing.pack.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-md border border-cream p-4">
              <h3 className="font-display text-lg text-ink">
                {p.packing.leaveTitle}
              </h3>
              <ul className="mt-2 space-y-1 text-sm text-ink/70">
                {p.packing.leaveBehind.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Digital sunset */}
      <section className="bg-dusk py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-cream">
            {p.digitalSunset.heading}
          </h2>
          <p className="mt-4 text-cream/70">{p.digitalSunset.body}</p>
          <div className="mt-8 max-w-md overflow-hidden rounded-md">
            <Image
              src="/images/fire-embers.jpg"
              alt="Low embers glowing on the evening shore fire"
              width={400}
              height={300}
              className="aspect-[4/3] w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Substance-free */}
      <section className="bg-cream py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-ink">
            {p.substanceFree.heading}
          </h2>
          <p className="mt-4 text-ink/70">{p.substanceFree.body}</p>
        </div>
      </section>

      {/* Female-visitor food protocol */}
      <section className="bg-mist py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-ink">
            {p.foodProtocol.heading}
          </h2>
          {p.foodProtocol.paragraphs.map((text) => (
            <p key={text} className="mt-4 text-ink/70">
              {text}
            </p>
          ))}
          <div className="mt-6 max-w-sm overflow-hidden rounded-md">
            <Image
              src="/images/food-whole-fish.jpg"
              alt="A whole fish served on a banana leaf"
              width={400}
              height={300}
              className="aspect-[4/3] w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Photography */}
      <section className="bg-cream py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-ink">
            {p.photography.heading}
          </h2>
          <p className="mt-4 text-ink/70">{p.photography.body}</p>
        </div>
      </section>

      {/* Legal lines */}
      <section className="bg-dusk py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-cream">
            {p.important.heading}
          </h2>
          {p.important.paragraphs.map((text) => (
            <p key={text} className="mt-4 text-cream/70">
              {text}
            </p>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-cream py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-ink">
            {p.cta.heading}
          </h2>
          <p className="mt-3 text-ink/70">{p.cta.body}</p>
          <Link
            href="/apply"
            className="mt-8 inline-block rounded-md bg-lake px-8 py-3 text-sm font-semibold text-cream transition-colors hover:bg-lake/80"
          >
            {p.cta.label}
          </Link>
        </div>
      </section>
    </>
  );
}
