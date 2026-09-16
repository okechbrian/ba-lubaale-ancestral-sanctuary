import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Land",
};

export default function TheLandPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-semibold text-ink">
        The Land
      </h1>
      <p className="mt-4 text-lg text-ink/70">
        Ten acres of forest, lake shore, spring, herd, and fire — built on the
        Ssese Islands of Lake Victoria, Uganda.
      </p>
    </section>
  );
}
