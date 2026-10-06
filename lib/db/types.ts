export type BookingStatus = "pending" | "approved" | "declined" | "paid";
export type PaymentKind = "deposit" | "balance";
export type PaymentStatus =
  | "pending"
  | "initiated"
  | "completed"
  | "failed"
  | "cancelled";
export type PartyType = "solo" | "couple" | "family" | "buyout";
export type StaySlug = "essential" | "master" | "buyout";

export interface BookingRow {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  email: string;
  whatsapp: string | null;
  country: string;
  requested_window: string | null;
  party: PartyType;
  stay_slug: StaySlug;
  check_in: string; // YYYY-MM-DD
  check_out: string; // YYYY-MM-DD
  drawing: string;
  comfort: string;
  limits: string | null;
  protocols: boolean;
  digital_sunset: boolean;
  burden: string;
  policies_ok: boolean;
  complementary_ok: boolean;
  status: BookingStatus;
  amount_usd: string | null; // numeric comes back as string
  approved_at: string | null;
}

export interface PaymentRow {
  id: string;
  created_at: string;
  updated_at: string;
  booking_id: string | null; // null for a voucher purchase
  /** "stay" = deposit/balance for a booking, "voucher" = gift voucher. */
  subject_kind: "stay" | "voucher";
  kind: PaymentKind;
  amount_usd: string;
  amount_ugx: string;
  currency: string;
  provider: string;
  provider_ref: string;
  provider_payment_id: string | null;
  redirect_url: string | null;
  status: PaymentStatus;
  paid_at: string | null;
}

export type VoucherStatus = "issued" | "redeemed" | "void";

export interface VoucherRow {
  id: string;
  created_at: string;
  updated_at: string;
  /** SHA-256 hex of the code. The code itself is never stored. */
  code_hash: string;
  /** Last four characters, for display only. */
  code_hint: string;
  payment_id: string;
  amount_usd: string;
  amount_ugx: string;
  currency: string;
  buyer_email: string;
  recipient_email: string | null;
  status: VoucherStatus;
  issued_at: string;
  redeemed_at: string | null;
  redeemed_booking_id: string | null;
  voided_at: string | null;
  void_reason: string | null;
}

export interface BlockedDateRow {
  id: string;
  day: string; // YYYY-MM-DD
  reason: string | null;
}

export interface EmailLogRow {
  id: string;
  created_at: string;
  to_email: string;
  template: string;
  subject: string;
  body: string;
  status: "sent" | "stubbed" | "failed";
  error: string | null;
}

export type EmailOutboxStatus = "pending" | "sent" | "failed";

export interface EmailOutboxRow {
  id: string;
  created_at: string;
  updated_at: string;
  category: string;
  recipient: string;
  subject: string;
  body: string;
  booking_id: string | null;
  payment_id: string | null;
  status: EmailOutboxStatus;
  attempts: number;
  resends: number;
  last_error: string | null;
  next_attempt_at: string;
  sent_at: string | null;
}

export type SubscriberStatus = "pending" | "confirmed" | "unsubscribed";

export interface SubscriberRow {
  id: string;
  created_at: string;
  updated_at: string;
  email: string; // stored normalized (trimmed, lowercased)
  status: SubscriberStatus;
  confirm_token: string;
  unsub_token: string;
  confirmed_at: string | null;
  unsubscribed_at: string | null;
}

/** Owner-editable business settings (validated when read). */
export interface StayPrices {
  essential: { solo: number; couple: number };
  master: { solo: number; couple: number };
  buyout: { base: number; extraGuest: number; maxGuests: number };
}

export interface Settings {
  stayPrices: StayPrices;
  depositPercent: number;
  ugxRate: number;
  /**
   * Fixed voucher prices in USD, exactly as the owner typed them in
   * /admin/settings. Empty (the default) means vouchers are not on sale — the
   * site never invents a price.
   */
  voucherAmountsUsd: number[];
}
