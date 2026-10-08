import { z } from "zod";

export const fireCircleRequestSchema = z
  .object({
    name: z.string().trim().min(1, "Tell us your name.").max(160),
    email: z.string().trim().email("A valid email is required.").max(320),
    message: z
      .string()
      .trim()
      .min(10, "A sentence or two is plenty.")
      .max(2000, "Please keep it under 2000 characters."),
    website: z.string().max(0).optional(),
  })
  .strict();

export type FireCircleRequestInput = z.infer<typeof fireCircleRequestSchema>;
