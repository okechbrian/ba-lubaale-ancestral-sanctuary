import { z } from "zod";

/**
 * /for-groups enquiry intake.
 *
 * `strict()` and no unknown keys, same contract as the booking form. `window` is
 * free text because groups ask about seasons before they have dates. Nothing
 * here is a quote or a booking: the row records an enquiry and nothing more.
 */
export const groupInquirySchema = z
  .object({
    name: z.string().trim().min(1, "Tell us your name.").max(160),
    email: z.string().trim().email("A valid email is required.").max(320),
    organisation: z.string().trim().max(160).optional(),
    group_size: z.coerce
      .number()
      .int("How many people?")
      .min(1, "How many people?")
      .max(500, "For groups above 500, please write to us directly.")
      .optional(),
    window: z.string().trim().max(300).optional(),
    message: z
      .string()
      .trim()
      .min(10, "A sentence or two is plenty.")
      .max(4000, "Please keep it under 4000 characters."),
    /** Honeypot — humans never see it. */
    website: z.string().max(0).optional(),
  })
  .strict();

export type GroupInquiryInput = z.infer<typeof groupInquirySchema>;