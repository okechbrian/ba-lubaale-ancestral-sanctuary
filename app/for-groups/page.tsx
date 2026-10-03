import { CMS_KEYS, forGroupsBlockSchema } from "@/lib/cms/blocks";
import { resolveContent } from "@/lib/cms";
import { forGroupsDefault } from "@/content/for-groups";
import GroupInquiryForm from "@/components/GroupInquiryForm";

export const metadata = {
  title: "For groups — Ba Lubaale Ancestral Sanctuary",
  description:
    "Tour operators and retreat leaders: a group visit to a private sanctuary on the lake. Enquire about a window, a group size, or a season of silence.",
};

export const revalidate = 60;

/**
 * /for-groups — tour operators and retreat leaders.
 *
 * All copy is an ordinary CMS block (Admin → Content), so the owner can edit it
 * without a deploy. With no database it renders the in-repo default copy, which
 * is the same page — the honest degradation here is content, not a broken page.
 *
 * There are no prices, no capacity numbers and no availability claims: a group
 * visit is quoted in conversation, and the form asks for an enquiry only.
 */
export default async function ForGroupsPage() {
  const content = await resolveContent(
    CMS_KEYS.forGroups,
    forGroupsBlockSchema,
    forGroupsDefault,
  );

  return (
    <>
      <section className="bg-dusk py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-4xl font-semibold text-cream sm:text-5xl">
            {content.hero.heading}
          </h1>
          <p className="mt-3 max-w-xl text-cream/80">{content.hero.lead}</p>
        </div>
      </section>

      <section className="bg-cream py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">
                {content.intro.heading}
              </h2>
              <div className="mt-4 space-y-4 text-ink/70">
                {content.intro.paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </div>
            <figure>
              <img
                src={content.hero.image.src}
                alt={content.hero.image.alt}
                className="aspect-[3/2] w-full rounded-md object-cover"
              />
            </figure>
          </div>
        </div>
      </section>

      <section className="bg-mist py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-semibold text-ink">
            Who this is for
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {content.offerings.map((o) => (
              <article
                key={o.title}
                className="rounded-md border border-mist bg-white p-5"
              >
                <h3 className="font-display text-lg font-semibold text-ink">
                  {o.title}
                </h3>
                <p className="mt-2 text-sm text-ink/70">{o.body}</p>
                {o.image && (
                  <img
                    src={o.image.src}
                    alt={o.image.alt}
                    className="mt-4 aspect-[3/2] w-full rounded object-cover"
                  />
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-cream py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-semibold text-ink">
            {content.planning.heading}
          </h2>
          <dl className="mt-6 space-y-5">
            {content.planning.items.map((item) => (
              <div key={item.title} className="border-l-2 border-bark pl-4">
                <dt className="font-display text-lg font-semibold text-ink">
                  {item.title}
                </dt>
                <dd className="mt-1 text-sm text-ink/70">{item.body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="bg-dusk py-16 sm:py-20" id="enquire">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-semibold text-cream">
            {content.inquiry.heading}
          </h2>
          <div className="mt-3 space-y-3 text-cream/80">
            {content.inquiry.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <div className="mt-8">
            <GroupInquiryForm />
          </div>
        </div>
      </section>

      <section className="bg-cream py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-xl font-semibold text-ink">
            {content.closing.heading}
          </h2>
          <div className="mt-3 space-y-3 text-ink/70">
            {content.closing.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}