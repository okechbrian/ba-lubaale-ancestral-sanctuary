import { z } from "zod";

/**
 * Voucher purchase intake. Amount is validated against the owner's configured
 * list at request time (never trusted from the client), and both addresses are
 * normalised. A buyer may name a different recipient (a gift).
 */
export const voucherRequestSchema = z
  .object({
    amount_usd: z
      .number({ message: "Choose a voucher amount." })
      .positive("Choose a voucher amount.")
      .max(100_000, "That amount is not available."),
    email: z.string().trim().email("A valid email is required.").max(320),
    name: z.string().trim().max(120).optional(),
    recipient_email: z
      .string()
      .trim()
      .email("A valid recipient email is required.")
      .max(320)
      .optional()
      .or(z.literal("").transform(() => undefined)),
    /** Honeypot — humans never see it. */
    website: z.string().max(0).optional(),
  })
  .strict();

export type VoucherRequest = z.infer<typeof voucherRequestSchema>;