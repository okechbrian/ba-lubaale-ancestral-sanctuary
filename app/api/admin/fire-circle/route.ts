import { isAdminRequest } from "@/lib/admin/session";
import { DatabaseNotConfiguredError } from "@/lib/db/client";
import {
  approveFireCircleRequest,
  declineFireCircleRequest,
  getFireCircleConfig,
  listFireCircleRequests,
  saveFireCircleConfig,
} from "@/lib/db/fire-circle";
import {
  prepareFireCircleApprovedEmail,
  prepareFireCircleDeclinedEmail,
} from "@/lib/fire-circle/emails";
import { randomSeatToken, hashSeatToken } from "@/lib/fire-circle/token";
import { z } from "zod";

export const dynamic = "force-dynamic";

const configSchema = z.object({
  fee_usd: z.number().min(1).max(10000).nullable(),
  join_url: z.string().trim().max(500).nullable(),
});

export async function GET(request: Request): Promise<Response> {
  if (!(await isAdminRequest(request))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const [config, requests] = await Promise.all([
      getFireCircleConfig(),
      listFireCircleRequests(),
    ]);
    return Response.json({ ok: true, config, requests });
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) {
      return Response.json({ error: "database_not_configured" }, { status: 503 });
    }
    return Response.json({ error: "unavailable" }, { status: 500 });
  }
}

export async function PUT(request: Request): Promise<Response> {
  if (!(await isAdminRequest(request))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  const parsed = configSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  const join = parsed.data.join_url?.trim() || null;
  if (join && !/^https:\/\//.test(join)) {
    return Response.json({ error: "join_url_must_be_https" }, { status: 400 });
  }
  try {
    await saveFireCircleConfig({ feeUsd: parsed.data.fee_usd, joinUrl: join });
    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) {
      return Response.json({ error: "database_not_configured" }, { status: 503 });
    }
    return Response.json({ error: "save_failed" }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!(await isAdminRequest(request))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  const id = (body as { id?: unknown }).id;
  const action = (body as { action?: unknown }).action;
  if (typeof id !== "string" || (action !== "approve" && action !== "decline")) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    if (action === "decline") {
      const row = await declineFireCircleRequest(id);
      if (!row) return Response.json({ error: "not_open" }, { status: 409 });
      await queue({
        ...prepareFireCircleDeclinedEmail(row),
        booking_id: null,
        payment_id: null,
      });
      return Response.json({ ok: true });
    }

    const config = await getFireCircleConfig();
    const fee = config.fee_usd == null ? null : Number(config.fee_usd);
    if (fee == null || !Number.isFinite(fee) || fee < 1) {
      return Response.json({ error: "fee_required" }, { status: 409 });
    }
    const token = randomSeatToken();
    const row = await approveFireCircleRequest(id, await hashSeatToken(token), fee);
    if (!row) return Response.json({ error: "not_open" }, { status: 409 });
    await queue({
      ...prepareFireCircleApprovedEmail({
        name: row.name,
        email: row.email,
        token,
        feeUsd: fee,
      }),
      booking_id: null,
      payment_id: null,
    });
    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) {
      return Response.json({ error: "database_not_configured" }, { status: 503 });
    }
    console.error("fire circle admin failed:", err instanceof Error ? err.message : "unknown");
    return Response.json({ error: "action_failed" }, { status: 500 });
  }
}

async function queue(row: {
  category: string;
  to: string;
  subject: string;
  body: string;
  booking_id: null;
  payment_id: null;
}): Promise<void> {
  const { getDb } = await import("@/lib/db/client");
  const { error } = await getDb().from("email_outbox").insert(row);
  if (error) {
    console.error("fire circle mail could not be queued:", error.message);
  }
}
