import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Cave",
};

export default function TheCavePage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-semibold text-ink">
        The Cave
      </h1>
      <p className="mt-4 text-lg text-ink/70">
        Nalubaale Cave — three chambers of silence, breath, and voice. Guided
        sessions only.
      </p>
    </section>
  );
}
