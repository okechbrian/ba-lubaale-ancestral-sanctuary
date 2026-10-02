import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Arrive",
  description:
    "Entebbe, the ferry toward the Ssese Islands, then the sanctuary boat.",
};

export default function ArrivePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[50vh] items-end overflow-hidden">
        <div className="absolute inset-0 bg-dusk" />
        <Image
          src="/images/arrival-canoe.jpg"
          alt="Wooden canoe crossing to the sanctuary"
          fill
          priority
          quality={85}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dusk/70 to-transparent" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <h1 className="font-display text-4xl font-semibold text-cream sm:text-5xl">
            Arrive
          </h1>
          <p className="mt-3 max-w-xl text-cream/80">
            Entebbe, the ferry toward the Ssese Islands, then the sanctuary
            boat.
          </p>
        </div>
      </section>

      {/* The journey */}
      <section className="bg-cream py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-ink">
            The Journey
          </h2>
          <p className="mt-4 text-ink/70">
            The journey runs in three legs:
          </p>
          <ol className="mt-4 max-w-2xl space-y-3 text-ink/70">
            <li>Entebbe.</li>
            <li>The ferry toward the Ssese Islands.</li>
            <li>Then the sanctuary boat.</li>
          </ol>
        </div>
      </section>

      {/* Before you come */}
      <section className="bg-mist py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <p className="max-w-2xl text-ink/70">
            What to know before you come is on the prepare page — clothing,
            protocols, and the house rules.
          </p>
          <Link
            href="/prepare"
            className="mt-4 inline-block text-sm font-semibold text-leaf hover:underline"
          >
            How to Prepare →
          </Link>
        </div>
      </section>
    </>
  );
}
