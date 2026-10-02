import { z } from "zod";

/** Image path: local /images/... or an https (e.g. Supabase Storage) URL. */
export const imageSrcSchema = z
  .string()
  .min(1)
  .refine((s) => s.startsWith("/images/") || s.startsWith("https://"), {
    message: "src must be /images/<file> or an https URL",
  });

/** An editable image slot (src + alt; sizes/classes stay in the page). */
export const imageRefSchema = z
  .object({
    src: imageSrcSchema,
    alt: z.string().min(1).max(300),
  })
  .strict();
export type ImageRef = z.infer<typeof imageRefSchema>;

/** One gallery moment (homepage strip). src = /images/... or https://. */
export const momentSchema = z
  .object({
    src: imageSrcSchema,
    alt: z.string().min(1).max(300),
    caption: z.string().min(1).max(80),
  })
  .strict();
export type Moment = z.infer<typeof momentSchema>;

export const momentsBlockSchema = z
  .object({
    moments: z.array(momentSchema).min(1).max(60),
  })
  .strict();
export type MomentsBlock = z.infer<typeof momentsBlockSchema>;

export const faqItemSchema = z
  .object({
    q: z.string().min(1).max(300),
    paragraphs: z.array(z.string().min(1).max(2000)).min(1).max(6),
  })
  .strict();
export type FaqItem = z.infer<typeof faqItemSchema>;

export const faqBlockSchema = z
  .object({
    items: z.array(faqItemSchema).min(1).max(40),
  })
  .strict();
export type FaqBlock = z.infer<typeof faqBlockSchema>;

/** Settings-table keys used by the content overrides (P2 CMS). */
export const CMS_KEYS = {
  moments: "content:moments",
  faq: "content:faq",
  theLand: "content:the-land",
  theHost: "content:the-host",
  theCave: "content:the-cave",
  atelier: "content:atelier",
} as const;

const heading = z.string().min(1).max(160);

/** /the-land — hero, overview, feature grid and story sections. */
export const landBlockSchema = z
  .object({
    hero: z
      .object({
        image: imageRefSchema,
        lead: z.string().min(1).max(600),
      })
      .strict(),
    overview: z
      .object({
        heading,
        paragraphs: z.array(z.string().min(1).max(2000)).min(1).max(6),
        image: imageRefSchema,
      })
      .strict(),
    features: z
      .array(
        z
          .object({
            title: heading,
            body: z.string().min(1).max(900),
            image: imageRefSchema.optional(),
          })
          .strict(),
      )
      .min(1)
      .max(12),
    lakeHouse: z
      .object({ heading, blurb: z.string().min(1).max(700) })
      .strict(),
    food: z
      .object({
        heading,
        intro: z.string().min(1).max(700),
        images: z.array(imageRefSchema).min(1).max(6),
      })
      .strict(),
    forest: z
      .object({
        heading,
        paragraphs: z.array(z.string().min(1).max(2000)).min(1).max(6),
        images: z.array(imageRefSchema).min(1).max(4),
      })
      .strict(),
    arrival: z
      .object({
        heading,
        paragraphs: z.array(z.string().min(1).max(2000)).min(1).max(6),
        image: imageRefSchema,
      })
      .strict(),
    tortoise: z
      .object({ heading, blurb: z.string().min(1).max(700) })
      .strict(),
  })
  .strict();
export type LandBlock = z.infer<typeof landBlockSchema>;

/** /the-host — hero portrait, bio, working portraits, pull quote. */
export const hostBlockSchema = z
  .object({
    heroImage: imageRefSchema,
    bio: z
      .object({
        heading,
        paragraphs: z.array(z.string().min(1).max(2000)).min(1).max(6),
        image: imageRefSchema,
      })
      .strict(),
    work: z
      .object({
        heading,
        images: z.array(imageRefSchema).min(1).max(6),
      })
      .strict(),
    quote: z
      .object({
        text: z.string().min(1).max(700),
        cite: z.string().min(1).max(120),
      })
      .strict(),
  })
  .strict();
export type HostBlock = z.infer<typeof hostBlockSchema>;

/** /the-cave — chambers, etiquette cards, gallery. Etiquette text = house
 *  rules; editable but kept out of casual reach by the admin confirm step. */
export const caveBlockSchema = z
  .object({
    heroImage: imageRefSchema,
    heroLead: z.string().min(1).max(700),
    intro: z
      .object({
        heading,
        paragraphs: z.array(z.string().min(1).max(2000)).min(1).max(6),
        image: imageRefSchema,
      })
      .strict(),
    chambers: z
      .object({
        heading,
        items: z
          .array(
            z
              .object({
                title: heading,
                tagline: z.string().min(1).max(240),
                body: z.string().min(1).max(900),
              })
              .strict(),
          )
          .min(1)
          .max(8),
      })
      .strict(),
    etiquette: z
      .object({
        heading,
        items: z
          .array(
            z
              .object({
                title: heading,
                body: z.string().min(1).max(900),
              })
              .strict(),
          )
          .min(1)
          .max(8),
      })
      .strict(),
    gallery: z
      .object({
        heading,
        intro: z.string().min(1).max(700),
        images: z.array(imageRefSchema).min(1).max(10),
      })
      .strict(),
  })
  .strict();
export type CaveBlock = z.infer<typeof caveBlockSchema>;

/** /atelier — story section and three galleries. */
export const atelierBlockSchema = z
  .object({
    heroImage: imageRefSchema,
    heroLead: z.string().min(1).max(700),
    bark: z
      .object({
        heading,
        paragraphs: z.array(z.string().min(1).max(2000)).min(1).max(6),
        image: imageRefSchema,
      })
      .strict(),
    gallery: z
      .object({
        heading,
        images: z.array(imageRefSchema).min(1).max(12),
      })
      .strict(),
    finished: z
      .object({
        heading,
        images: z.array(imageRefSchema).min(1).max(8),
      })
      .strict(),
    worn: z
      .object({
        heading,
        intro: z.string().min(1).max(700),
        images: z.array(imageRefSchema).min(1).max(8),
      })
      .strict(),
  })
  .strict();
export type AtelierBlock = z.infer<typeof atelierBlockSchema>;
