import { z } from "zod";

/** One gallery moment (homepage strip). src = /images/... or https://. */
export const momentSchema = z
  .object({
    src: z
      .string()
      .min(1)
      .refine((s) => s.startsWith("/images/") || s.startsWith("https://"), {
        message: "src must be /images/<file> or an https URL",
      }),
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
} as const;
