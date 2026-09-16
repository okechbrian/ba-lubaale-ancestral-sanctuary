import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home",
};

export default function HomePage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-semibold text-ink">
        Ba Lubaale Ancestral Sanctuary
      </h1>
      <p className="mt-4 text-lg text-ink/70">
        A living ancestral sanctuary of cave, craft, herd, and lake — coming in
        Phase 2.
      </p>
    </section>
  );
}
