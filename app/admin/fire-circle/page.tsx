import type { Metadata } from "next";
import { DatabaseNotConfiguredError } from "@/lib/db/client";
import { getFireCircleConfig, listFireCircleRequests } from "@/lib/db/fire-circle";
import FireCircleAdmin from "@/components/admin/FireCircleAdmin";

export const metadata: Metadata = { title: "Fire circle" };
export const dynamic = "force-dynamic";

export default async function AdminFireCirclePage() {
  try {
    const [config, requests] = await Promise.all([
      getFireCircleConfig(),
      listFireCircleRequests(),
    ]);
    return <FireCircleAdmin config={config} requests={requests} />;
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) {
      return (
        <p className="text-sm text-ink">
          Database not configured. Apply supabase/migrations/20261008000002_fire_circle.sql.
        </p>
      );
    }
    throw err;
  }
}
