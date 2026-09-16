import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Policies",
};

export default function PoliciesPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-semibold text-ink">
        Policies
      </h1>
      <p className="mt-4 text-lg text-ink/70">
        Deposits, cancellation, payments, safety, and sanctuary rules.
      </p>
    </section>
  );
}
