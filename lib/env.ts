import { z } from "zod";

/**
 * Server-side environment. Read lazily so `next build` can statically render
 * pages without any secrets present. Missing values surface as clear errors
 * (or documented stubs) — never as fake behaviour.
 */
const envSchema = z.object({
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  PESAPAL_ENV: z.enum(["sandbox", "live"]).default("sandbox"),
  PESAPAL_CONSUMER_KEY: z.string().min(1).optional(),
  PESAPAL_CONSUMER_SECRET: z.string().min(1).optional(),
  PESAPAL_IPN_URL: z.string().url().optional(),
  SMTP_HOST: z.string().min(1).default("smtp.gmail.com"),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASS: z.string().min(1).optional(),
  ADMIN_USERNAME: z.string().min(1).default("admin"),
  ADMIN_PASSWORD: z.string().min(1).optional(),
  ADMIN_SESSION_SECRET: z.string().min(16).optional(),
  OWNER_NOTIFY_EMAIL: z.string().email().default("queennalubaale@gmail.com"),
});

export type ServerEnv = z.infer<typeof envSchema>;

export function getServerEnv(): ServerEnv {
  return envSchema.parse(process.env);
}

/** Public (browser-safe) settings. */
export function getPublicEnv() {
  return {
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    /** Dummy number until the owner supplies the real one; empty hides the button. */
    whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "",
  };
}
