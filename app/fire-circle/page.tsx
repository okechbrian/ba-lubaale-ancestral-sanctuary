import type { Metadata } from "next";
import FireCircleForm from "@/components/FireCircleForm";
import { formatFireDate, nextFireSaturday } from "@/lib/fire-circle/date";

export const metadata: Metadata = {
  title: "The Fire Circle",
  description:
    "A monthly online fire circle with Queen Nalubaale. Her voice, then questions. The last Saturday of the month. Paid after she approves a seat.",
};

export default function FireCirclePage() {
  const when = formatFireDate(nextFireSaturday());

  return (
    <>
      <section className="bg-dusk py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bark-soft">
            Members
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold text-cream sm:text-5xl">
            The fire circle
          </h1>
          <p className="mt-4 max-w-xl text-cream/80">
            One evening a month, online. Queen Nalubaale speaks, then there are
            questions. No class, no recording, no chat.
          </p>
        </div>
      </section>

      <section className="bg-cream py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-semibold text-ink">When</h2>
          <p className="mt-3 text-ink/70">
            The Saturday of the last weekend of each month. The next one is {when}.
          </p>
          <h2 className="mt-10 font-display text-2xl font-semibold text-ink">
            How a seat works
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-ink/70">
            <li>You ask.</li>
            <li>She approves, or she does not.</li>
            <li>If she approves, the fee is in that email. You pay then.</li>
            <li>The way in for the evening appears only after payment.</li>
          </ol>
          <p className="mt-4 text-sm text-ink/60">
            The amount is not on this page. It is confirmed when she approves.
            Nothing is taken with this request.
          </p>
        </div>
      </section>

      <section className="bg-mist py-16 sm:py-20" id="request">
        <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-semibold text-ink">Request a seat</h2>
          <div className="mt-6">
            <FireCircleForm />
          </div>
        </div>
      </section>
    </>
  );
}
