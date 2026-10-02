import { DatabaseNotConfiguredError } from "@/lib/db/client";
import { getActiveRanges } from "@/lib/db/bookings";
import { getBlockedDays } from "@/lib/db/availability";

export const dynamic = "force-dynamic";

/**
 * GET /api/availability — busy ranges (approved/paid bookings) + owner-blocked
 * days, so the apply-form calendar can grey them out. The server re-checks
 * every submission; this is a UI hint only.
 */
export async function GET(): Promise<Response> {
  try {
    const [ranges, blocked] = await Promise.all([getActiveRanges(), getBlockedDays()]);
    return Response.json({
      ranges,
      blocked,
      today: new Date().toISOString().slice(0, 10),
    });
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) {
      return Response.json({ error: "database_not_configured" }, { status: 503 });
    }
    console.error(
      "availability GET failed:",
      err instanceof Error ? err.message : "unknown",
    );
    return Response.json({ error: "availability_unavailable" }, { status: 503 });
  }
}
