import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Host",
};

export default function TheHostPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-semibold text-ink">
        Queen Nalubaale
      </h1>
      <p className="mt-1 text-bark">Mama Nalubaale</p>
      <p className="mt-4 text-lg text-ink/70">
        Seer, healer, and master artisan — the heart of the sanctuary.
      </p>
    </section>
  );
}
