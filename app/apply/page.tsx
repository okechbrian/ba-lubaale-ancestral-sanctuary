import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Apply",
};

export default function ApplyPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-semibold text-ink">
        Request an Immersion
      </h1>
      <p className="mt-4 text-lg text-ink/70">
        This is a request, not a confirmed booking. We will be in touch within
        several days.
      </p>
    </section>
  );
}
