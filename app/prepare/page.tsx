import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Prepare",
};

export default function PreparePage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-semibold text-ink">
        Prepare
      </h1>
      <p className="mt-4 text-lg text-ink/70">
        Arrival, packing, protocols, and what to know before you come.
      </p>
    </section>
  );
}
