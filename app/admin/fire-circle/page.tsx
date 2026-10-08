import type { Metadata } from "next";
import { DatabaseNotConfiguredError } from "@/lib/db/client";
import { getFireCircleConfig, listFireCircleRequests } from "@/lib/db/fire-circle";
import FireCircleAdmin from "@/components/admin/FireCircleAdmin";

export const metadata: Metadata = { title: "Fire circle" };
export const dynamic = "force-dynamic";

type Loaded =
  | { ok: true; config: Awaited<ReturnType<typeof getFireCircleConfig>>; requests: Awaited<ReturnType<typeof listFireCircleRequests>> }
  | { ok: false; missingDatabase: true };

/**
 * Load the data only. The try/catch wraps the awaits and nothing else:
 * constructing JSX inside a try block does not catch render errors anyway, so
 * the catch cannot do the job it looks like it is doing.
 */
async function load(): Promise<Loaded> {
  try {
    const [config, requests] = await Promise.all([
      getFireCircleConfig(),
      listFireCircleRequests(),
    ]);
    return { ok: true, config, requests };
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) {
      return { ok: false, missingDatabase: true };
    }
    throw err;
  }
}

export default async function AdminFireCirclePage() {
  const data = await load();

  if (!data.ok) {
    return (
      <p className="text-sm text-ink">
        Database not configured. Apply supabase/migrations/20261008000002_fire_circle.sql.
      </p>
    );
  }

  return <FireCircleAdmin config={data.config} requests={data.requests} />;
}