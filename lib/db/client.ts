import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super(
      "Database not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see .env.example).",
    );
    this.name = "DatabaseNotConfiguredError";
  }
}

let cached: SupabaseClient | null = null;

/** Server-only database client. Throws instead of faking anything when unset. */
export function getDb(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new DatabaseNotConfiguredError();
  if (!cached) {
    cached = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
