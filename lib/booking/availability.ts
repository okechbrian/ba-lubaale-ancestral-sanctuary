/**
 * Pure availability math. Dates are `YYYY-MM-DD` strings so comparisons are
 * lexicographic — no timezone traps. A booking occupies the half-open range
 * [check_in, check_out): a guest checking out on day X leaves day X free for
 * the next check-in.
 */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDateString(value: string): boolean {
  return DATE_RE.test(value);
}

export interface DateRange {
  check_in: string;
  check_out: string;
}

/** True when [aIn, aOut) and [bIn, bOut) share at least one night. */
export function rangesOverlap(
  aIn: string,
  aOut: string,
  bIn: string,
  bOut: string,
): boolean {
  return aIn < bOut && bIn < aOut;
}

/** True when [day, day] falls inside [checkIn, checkOut) — i.e. a night of the stay. */
export function dayWithin(day: string, checkIn: string, checkOut: string): boolean {
  return checkIn <= day && day < checkOut;
}

/** First conflicting range, or null when the window is free. */
export function findConflict(
  candidate: DateRange,
  existing: readonly DateRange[],
): DateRange | null {
  for (const range of existing) {
    if (
      rangesOverlap(
        candidate.check_in,
        candidate.check_out,
        range.check_in,
        range.check_out,
      )
    ) {
      return range;
    }
  }
  return null;
}

/** True when any blocked day falls inside the candidate window. */
export function blockedDayWithin(
  candidate: DateRange,
  blockedDays: readonly string[],
): string | null {
  for (const day of blockedDays) {
    if (dayWithin(day, candidate.check_in, candidate.check_out)) return day;
  }
  return null;
}

export class AvailabilityConflictError extends Error {
  readonly conflictingDay: string | null;
  constructor(conflictingDay: string | null) {
    super(
      conflictingDay
        ? `Dates unavailable: ${conflictingDay} is blocked.`
        : "Dates unavailable: overlap with an existing booking.",
    );
    this.name = "AvailabilityConflictError";
    this.conflictingDay = conflictingDay;
  }
}

/** Throws AvailabilityConflictError when the window cannot be requested. */
export function assertAvailable(
  candidate: DateRange,
  existing: readonly DateRange[],
  blockedDays: readonly string[],
): void {
  if (!isDateString(candidate.check_in) || !isDateString(candidate.check_out)) {
    throw new Error("Dates must be YYYY-MM-DD.");
  }
  if (candidate.check_out <= candidate.check_in) {
    throw new Error("Check-out must be after check-in.");
  }
  const blocked = blockedDayWithin(candidate, blockedDays);
  if (blocked) throw new AvailabilityConflictError(blocked);
  const conflict = findConflict(candidate, existing);
  if (conflict) throw new AvailabilityConflictError(null);
}
