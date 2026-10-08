import { isAdminRequest } from "@/lib/admin/session";
import { DatabaseNotConfiguredError } from "@/lib/db/client";
import { listSubscribers } from "@/lib/db/subscribers";

export const dynamic = "force-dynamic";

const VALID_STATUSES = new Set(["pending", "confirmed", "unsubscribed"]);

function toCsv(rows: Awaited<ReturnType<typeof listSubscribers>>): string {
  const header = ["created_at", "email", "status", "confirmed_at", "unsubscribed_at"];
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [r.created_at, r.email, r.status, r.confirmed_at ?? "", r.unsubscribed_at ?? ""]
        .map(esc)
        .join(","),
    );
  }
  return lines.join("\n") + "\n";
}

/**
 * GET /api/admin/subscribers — JSON list, or CSV (?format=csv) for export.
 * Session-guarded. `status=confirmed|pending|unsubscribed` filters both.
 */
export async function GET(request: Request): Promise<Response> {
  if (!(await isAdminRequest(request))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status");
  const status =
    statusParam && VALID_STATUSES.has(statusParam)
      ? (statusParam as "pending" | "confirmed" | "unsubscribed")
      : undefined;
  try {
    const rows = await listSubscribers(status);
    if (url.searchParams.get("format") === "csv") {
      return new Response(toCsv(rows), {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="subscribers${status ? `-${status}` : ""}-${new Date().toISOString().slice(0, 10)}.csv"`,
          "cache-control": "no-store",
        },
      });
    }
    return Response.json({ ok: true, rows });
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) {
      return Response.json({ error: "database_not_configured" }, { status: 503 });
    }
    console.error("listSubscribers failed:", err instanceof Error ? err.message : "unknown");
    return Response.json({ error: "subscribers_failed" }, { status: 500 });
  }
}
