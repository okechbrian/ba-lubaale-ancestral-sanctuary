import { z } from "zod";
import { revalidatePath } from "next/cache";
import { isAdminRequest } from "@/lib/admin/session";
import { DatabaseNotConfiguredError } from "@/lib/db/client";
import { recordAudit } from "@/lib/db/audit";
import { saveSettings, settingsValueSchema } from "@/lib/db/settings";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ settings: settingsValueSchema });

export async function POST(request: Request): Promise<Response> {
  if (!(await isAdminRequest(request))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      {
        error: "invalid_settings",
        issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      },
      { status: 400 },
    );
  }

  try {
    await saveSettings(parsed.data.settings);
    await recordAudit({
      action: "settings_saved",
      details: parsed.data.settings,
    });
    // The pages that display these numbers are cached for 60s. Without an
    // explicit invalidation the owner saves a new price, is told "Saved", and
    // the public page keeps showing the old figure until the window lapses —
    // which reads as the save having failed. The checkout routes are dynamic
    // and read straight from the database, so they were never stale.
    revalidatePath("/immersions");
    revalidatePath("/policies");
    revalidatePath("/vouchers");
    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) {
      return Response.json({ error: "database_not_configured" }, { status: 503 });
    }
    console.error(
      "settings save failed:",
      err instanceof Error ? err.message : "unknown",
    );
    return Response.json({ error: "settings_failed" }, { status: 500 });
  }
}
