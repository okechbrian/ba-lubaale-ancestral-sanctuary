import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Immersions",
};

export default function ImmersionsPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-semibold text-ink">
        Immersions
      </h1>
      <p className="mt-4 text-lg text-ink/70">
        Three-day, five-day, and whole-island immersions — private, screened,
        one household at a time.
      </p>
    </section>
  );
}
