import "server-only";
import { getDb } from "@/lib/db/client";

export type FireCircleStatus = "requested" | "approved" | "paid" | "declined";

export interface FireCircleConfig {
  fee_usd: string | null;
  join_url: string | null;
}

export interface FireCircleRequestRow {
  id: string;
  created_at: string;
  name: string;
  email: string;
  message: string;
  status: FireCircleStatus;
  token_hash: string | null;
  fee_usd: string | null;
  payment_id: string | null;
  approved_at: string | null;
  paid_at: string | null;
}

export async function getFireCircleConfig(): Promise<FireCircleConfig> {
  const db = getDb();
  const { data, error } = await db
    .from("fire_circle_config")
    .select("fee_usd, join_url")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(`getFireCircleConfig failed: ${error.message}`);
  return {
    fee_usd: (data?.fee_usd as string | null) ?? null,
    join_url: (data?.join_url as string | null) ?? null,
  };
}

export async function saveFireCircleConfig(input: {
  feeUsd: number | null;
  joinUrl: string | null;
}): Promise<void> {
  const db = getDb();
  const { error } = await db
    .from("fire_circle_config")
    .update({
      fee_usd: input.feeUsd,
      join_url: input.joinUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) throw new Error(`saveFireCircleConfig failed: ${error.message}`);
}

export async function insertFireCircleRequest(input: {
  name: string;
  email: string;
  message: string;
}): Promise<FireCircleRequestRow> {
  const db = getDb();
  const { data, error } = await db
    .from("fire_circle_requests")
    .insert({
      name: input.name,
      email: input.email,
      message: input.message,
    })
    .select()
    .single();
  if (error) throw new Error(`insertFireCircleRequest failed: ${error.message}`);
  return data as FireCircleRequestRow;
}

export async function listFireCircleRequests(): Promise<FireCircleRequestRow[]> {
  const db = getDb();
  const { data, error } = await db
    .from("fire_circle_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(`listFireCircleRequests failed: ${error.message}`);
  return (data ?? []) as FireCircleRequestRow[];
}

export async function getFireCircleRequestByHash(
  tokenHash: string,
): Promise<FireCircleRequestRow | null> {
  const db = getDb();
  const { data, error } = await db
    .from("fire_circle_requests")
    .select("*")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (error) throw new Error(`getFireCircleRequestByHash failed: ${error.message}`);
  return (data as FireCircleRequestRow | null) ?? null;
}

export async function getFireCircleRequestByPayment(
  paymentId: string,
): Promise<FireCircleRequestRow | null> {
  const db = getDb();
  const { data, error } = await db
    .from("fire_circle_requests")
    .select("*")
    .eq("payment_id", paymentId)
    .maybeSingle();
  if (error) throw new Error(`getFireCircleRequestByPayment failed: ${error.message}`);
  return (data as FireCircleRequestRow | null) ?? null;
}

export class FireCircleFeeMissingError extends Error {
  constructor() {
    super("Set the fire circle fee before approving anyone.");
    this.name = "FireCircleFeeMissingError";
  }
}

export async function approveFireCircleRequest(
  id: string,
  tokenHash: string,
  feeUsd: number,
): Promise<FireCircleRequestRow | null> {
  const db = getDb();
  const now = new Date().toISOString();
  const { data, error } = await db
    .from("fire_circle_requests")
    .update({
      status: "approved",
      token_hash: tokenHash,
      fee_usd: feeUsd,
      approved_at: now,
    })
    .eq("id", id)
    .eq("status", "requested")
    .select()
    .maybeSingle();
  if (error) throw new Error(`approveFireCircleRequest failed: ${error.message}`);
  return (data as FireCircleRequestRow | null) ?? null;
}

export async function declineFireCircleRequest(
  id: string,
): Promise<FireCircleRequestRow | null> {
  const db = getDb();
  const { data, error } = await db
    .from("fire_circle_requests")
    .update({ status: "declined" })
    .eq("id", id)
    .eq("status", "requested")
    .select()
    .maybeSingle();
  if (error) throw new Error(`declineFireCircleRequest failed: ${error.message}`);
  return (data as FireCircleRequestRow | null) ?? null;
}

export async function createFireCirclePayment(input: {
  requestId: string;
  amountUsd: number;
  amountUgx: number;
  providerRef: string;
}): Promise<string> {
  const db = getDb();
  const { data, error } = await db.rpc("create_fire_circle_payment", {
    p_request_id: input.requestId,
    p_amount_usd: input.amountUsd,
    p_amount_ugx: input.amountUgx,
    p_provider_ref: input.providerRef,
  });
  if (error) throw new Error(`createFireCirclePayment failed: ${error.message}`);
  if (typeof data !== "string" || !data) {
    throw new Error("createFireCirclePayment returned no id");
  }
  return data;
}

export async function applyFireCircleCompletion(input: {
  provider: string;
  externalId: string;
  paymentId: string;
  redactedPayload?: unknown;
  emails?: { category: string; to: string; subject: string; body: string }[];
}): Promise<{ claimed: boolean; first_completion?: boolean }> {
  const db = getDb();
  const { data, error } = await db.rpc("apply_fire_circle_completion", {
    p_provider: input.provider,
    p_external_id: input.externalId,
    p_payment_id: input.paymentId,
    p_redacted_payload: input.redactedPayload ?? null,
    p_emails: input.emails ?? [],
  });
  if (error) throw new Error(`applyFireCircleCompletion failed: ${error.message}`);
  return (data ?? {}) as { claimed: boolean; first_completion?: boolean };
}
