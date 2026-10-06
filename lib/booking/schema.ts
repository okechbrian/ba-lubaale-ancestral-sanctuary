import { z } from "zod";

/** YYYY-MM-DD calendar date. */
export const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date");

/**
 * The apply form payload — one schema shared by the client form and
 * POST /api/bookings, so the server never accepts what the client rejected.
 * `website` is a honeypot: humans never see it, bots fill it.
 */
export const bookingRequestSchema = z.object({
  name: z.string().min(1, "Full name is required").max(200),
  email: z.string().email("A valid email is required").max(320),
  whatsapp: z.string().max(40).optional(),
  country: z.string().min(1, "Country is required").max(120),
  requested_window: z.string().max(200).optional(),
  party: z.enum(["solo", "couple", "family", "buyout"], {
    message: "Please select a party type",
  }),
  stay_slug: z.enum(["essential", "master", "buyout"], {
    message: "Please select an immersion",
  }),
  check_in: dateString,
  check_out: dateString,
  drawing: z.string().min(1, "Please share what is drawing you here").max(4000),
  comfort: z.string().min(1, "Please share your comfort level").max(4000),
  limits: z.string().max(2000).optional(),
  protocols: z.enum(["yes", "no"], { message: "Please select yes or no" }),
  digital_sunset: z.enum(["yes", "no"], { message: "Please select yes or no" }),
  burden: z.string().min(1, "Please share what you are ready to set down").max(4000),
  policiesCheck: z.literal(true, {
    message: "You must acknowledge the policies",
  }),
  complementaryCheck: z.literal(true, {
    message: "You must acknowledge the complementary-care disclaimer",
  }),
  website: z.string().max(0).optional(), // honeypot (route enforces it first)
  /** Cloudflare Turnstile token — verified server-side when both keys are set. */
  cf_turnstile_response: z.string().max(2048).optional(),
});

export type BookingRequest = z.infer<typeof bookingRequestSchema>;
