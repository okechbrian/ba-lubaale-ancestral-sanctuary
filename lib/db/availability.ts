import "server-only";
import { getDb } from "@/lib/db/client";
import { getActiveRanges } from "@/lib/db/bookings";
import { assertAvailable } from "@/lib/booking/availability";
import type { DateRange } from "@/lib/booking/availability";

/** Owner-blocked days (YYYY-MM-DD). */
export async function getBlockedDays(): Promise<string[]> {
  const db = getDb();
  const { data, error } = await db.from("blocked_dates").select("day");
  if (error) throw new Error(`getBlockedDays failed: ${error.message}`);
  return (data ?? []).map((row) => row.day as string);
}

/** Throws AvailabilityConflictError when [checkIn, checkOut) cannot be booked. */
export async function assertWindowAvailable(candidate: DateRange): Promise<void> {
  const [ranges, blocked] = await Promise.all([getActiveRanges(), getBlockedDays()]);
  assertAvailable(candidate, ranges, blocked);
}
