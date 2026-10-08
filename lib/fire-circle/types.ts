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
