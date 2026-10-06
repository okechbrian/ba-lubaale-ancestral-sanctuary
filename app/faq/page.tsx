import type { Metadata } from "next";
import { resolveContent } from "@/lib/cms";
import { faqBlockSchema } from "@/lib/cms/blocks";
import { faqDefault } from "@/content/faq";
import InlineText from "@/components/InlineText";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Food, safety, what to bring, one household, photography, and cancellation — answered plainly.",
};

export const revalidate = 60;

export default async function FaqPage() {
  const { items } = await resolveContent(
    "content:faq",
    faqBlockSchema,
    faqDefault,
  );

  return (
    <>
      {/* Hero */}
      <section className="bg-dusk py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-4xl font-semibold text-cream sm:text-5xl">
            Questions
          </h1>
          <p className="mt-3 max-w-xl text-cream/80">
            The same answers you will find on the prepare and policies pages,
            gathered in one place.
          </p>
        </div>
      </section>

      {items.map((item, i) => {
        const last = i === items.length - 1;
        const dark = last;
        return (
          <section
            key={item.q}
            className={`py-16 sm:py-20 ${
              dark ? "bg-dusk" : i % 2 === 0 ? "bg-cream" : "bg-mist"
            }`}
          >
            <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
              <h2
                className={`font-display text-3xl font-semibold ${
                  dark ? "text-cream" : "text-ink"
                }`}
              >
                {item.q}
              </h2>
              {item.paragraphs.map((p, j) => (
                <p
                  key={j}
                  className={`mt-4 ${dark ? "text-cream/70" : "text-ink/70"}`}
                >
                  <InlineText text={p} />
                </p>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
