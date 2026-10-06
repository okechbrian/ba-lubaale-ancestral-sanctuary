import { z } from "zod";
import { isAdminRequest } from "@/lib/admin/session";
import { DatabaseNotConfiguredError } from "@/lib/db/client";
import { addBlockedDay, removeBlockedDay } from "@/lib/db/availability";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  action: z.enum(["add", "remove"]),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD"),
  reason: z.string().max(200).optional(),
});

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
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    if (parsed.data.action === "add") {
      await addBlockedDay(parsed.data.day, parsed.data.reason);
    } else {
      await removeBlockedDay(parsed.data.day);
    }
    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) {
      return Response.json({ error: "database_not_configured" }, { status: 503 });
    }
    console.error(
      "blocked-dates failed:",
      err instanceof Error ? err.message : "unknown",
    );
    return Response.json({ error: "blocked_dates_failed" }, { status: 500 });
  }
}
