import type { z } from "zod";
import type { Metadata } from "next";
import ContentEditor from "@/components/admin/ContentEditor";
import { CMS_KEYS } from "@/lib/cms/blocks";
import { getContentOverride, resolveContent } from "@/lib/cms";
import { listLibraryImages } from "@/lib/cms/media";
import {
  atelierBlockSchema,
  caveBlockSchema,
  faqBlockSchema,
  hostBlockSchema,
  landBlockSchema,
  momentsBlockSchema,
  testimonialsBlockSchema,
} from "@/lib/cms/blocks";
import { atelierDefault } from "@/content/atelier";
import { caveDefault } from "@/content/the-cave";
import { faqDefault } from "@/content/faq";
import { hostDefault } from "@/content/the-host";
import { landDefault } from "@/content/the-land";
import { momentsDefault } from "@/content/moments";
import { testimonialsDefault } from "@/content/testimonials";

export const metadata: Metadata = { title: "Content" };
export const dynamic = "force-dynamic";

function block<T>(
  key: string,
  schema: z.ZodType<T>,
  defaults: T,
  label: string,
  blurb: string,
) {
  return { key, schema, defaults, label, blurb };
}

const BLOCKS = [
  block(
    CMS_KEYS.moments,
    momentsBlockSchema,
    momentsDefault,
    "Homepage gallery",
    "The Sanctuary Moments strip on the homepage. Add, remove, reorder; pick a photo from the library and write its alt text and caption.",
  ),
  block(
    CMS_KEYS.faq,
    faqBlockSchema,
    faqDefault,
    "FAQ",
    "Questions and answers on /faq. Links: write [label](/path) inside an answer.",
  ),
  block(
    CMS_KEYS.testimonials,
    testimonialsBlockSchema,
    testimonialsDefault,
    "Guest voices",
    "The guest-voice section on the homepage. Three slots. Only real, said-out-loud quotes - never write a quote that was not actually given. A slot with an empty quote stays hidden; empty all three and the section disappears.",
  ),
  block(
    CMS_KEYS.theLand,
    landBlockSchema,
    landDefault,
    "The Land",
    "/the-land — hero, story sections, feature grid and galleries.",
  ),
  block(
    CMS_KEYS.theHost,
    hostBlockSchema,
    hostDefault,
    "The Host",
    "/the-host — portrait, bio, working portraits and the pull quote.",
  ),
  block(
    CMS_KEYS.theCave,
    caveBlockSchema,
    caveDefault,
    "The Cave",
    "/the-cave — chambers, etiquette and the gallery. Etiquette and house rules appear elsewhere too — keep them consistent with /prepare and /policies.",
  ),
  block(
    CMS_KEYS.atelier,
    atelierBlockSchema,
    atelierDefault,
    "Atelier",
    "/atelier — craft story and the three galleries.",
  ),
];

export default async function AdminContentPage() {
  const images = await listLibraryImages();
  const blocks = await Promise.all(
    BLOCKS.map(async (b) => ({
      ...b,
      value: await resolveContent(b.key, b.schema, b.defaults),
      hasOverride: (await getContentOverride(b.key)) !== undefined,
    })),
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-ink">
          Site content
        </h1>
        <p className="mt-2 text-sm text-ink/70">
          Edit the words and photographs of the site. Changes appear on the
          public pages within a minute — no deploy needed. Anything left
          untouched keeps the version committed to the repository. Prices live
          in Settings; policies are deliberately not here.
        </p>
        {images.length === 0 && (
          <p className="mt-3 rounded-md border border-ember/40 bg-ember/5 p-3 text-sm text-ink">
            No photo library found — image pickers will be empty until{" "}
            <code>public/images</code> is available.
          </p>
        )}
      </header>

      <div className="space-y-6">
        {blocks.map((b) => (
          <ContentEditor
            key={b.key}
            blockKey={b.key}
            label={b.label}
            blurb={b.blurb}
            initial={b.value}
            hasOverride={b.hasOverride}
            images={images}
          />
        ))}
      </div>
    </div>
  );
}
