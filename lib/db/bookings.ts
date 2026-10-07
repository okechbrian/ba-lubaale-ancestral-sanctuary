import "server-only";
import { getDb } from "@/lib/db/client";
import type { BookingRow, BookingStatus } from "@/lib/db/types";
import type { DateRange } from "@/lib/booking/availability";

export interface NewBooking {
  name: string;
  email: string;
  whatsapp?: string;
  country: string;
  requested_window?: string;
  party: BookingRow["party"];
  stay_slug: BookingRow["stay_slug"];
  check_in: string;
  check_out: string;
  drawing: string;
  comfort: string;
  limits?: string;
  protocols: boolean;
  digital_sunset: boolean;
  burden: string;
}

export async function insertBooking(input: NewBooking): Promise<BookingRow> {
  const db = getDb();
  const { data, error } = await db
    .from("bookings")
    .insert({ ...input, policies_ok: true, complementary_ok: true })
    .select()
    .single();
  if (error) throw new Error(`insertBooking failed: ${error.message}`);
  return data as BookingRow;
}

export async function listBookings(
  status?: BookingStatus,
): Promise<BookingRow[]> {
  const db = getDb();
  let query = db.from("bookings").select("*").order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw new Error(`listBookings failed: ${error.message}`);
  return (data ?? []) as BookingRow[];
}

export async function getBooking(id: string): Promise<BookingRow | null> {
  const db = getDb();
  const { data, error } = await db
    .from("bookings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getBooking failed: ${error.message}`);
  return data as BookingRow | null;
}

/** Thrown when a write would put a booking into approved/paid on top of an
 * existing approved/paid stay — i.e. the `bookings_no_overlap` EXCLUDE
 * constraint (23P01) fired. Routes map this to HTTP 409. */
export class OverlappingBookingError extends Error {
  constructor() {
    super("Dates overlap an existing approved/paid booking.");
    this.name = "OverlappingBookingError";
  }
}

/** PostgREST forwards SQLSTATE codes; exclusion violations are 23P01. */
export function isOverlapViolation(error: {
  code?: string;
  message?: string;
}): boolean {
  return (
    error.code === "23P01" ||
    /bookings_no_overlap|exclusion constraint/i.test(error.message ?? "")
  );
}

export async function updateBookingStatus(
  id: string,
  status: BookingStatus,
  extra: { amount_usd?: number; approved_at?: string } = {},
): Promise<BookingRow> {
  const db = getDb();
  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
    ...extra,
  };
  const { data, error } = await db
    .from("bookings")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    if (isOverlapViolation(error)) throw new OverlappingBookingError();
    throw new Error(`updateBookingStatus failed: ${error.message}`);
  }
  return data as BookingRow;
}

/** Approved/paid date ranges — what makes a window unavailable. */
export async function getActiveRanges(): Promise<DateRange[]> {
  const db = getDb();
  const { data, error } = await db
    .from("bookings")
    .select("check_in, check_out")
    .in("status", ["approved", "paid"]);
  if (error) throw new Error(`getActiveRanges failed: ${error.message}`);
  return (data ?? []) as DateRange[];
}

/** Name + email for a set of bookings, keyed by id (admin payment listing). */
export async function getBookingContacts(
  ids: string[],
): Promise<Map<string, { name: string; email: string }>> {
  const out = new Map<string, { name: string; email: string }>();
  if (ids.length === 0) return out;
  const db = getDb();
  const { data, error } = await db
    .from("bookings")
    .select("id, name, email")
    .in("id", ids);
  if (error) throw new Error(`getBookingContacts failed: ${error.message}`);
  for (const row of (data ?? []) as { id: string; name: string; email: string }[]) {
    out.set(row.id, { name: row.name, email: row.email });
  }
  return out;
}
