/** Last Saturday of a month, in UTC. monthIndex is 0-based, and may be 12. */
export function lastSaturdayUtc(year: number, monthIndex: number): Date {
  const last = new Date(Date.UTC(year, monthIndex + 1, 0));
  const back = (last.getUTCDay() + 1) % 7;
  last.setUTCDate(last.getUTCDate() - back);
  return last;
}

/** The next fire: this month's last Saturday, or next month's if that day has passed. */
export function nextFireSaturday(now: Date = new Date()): Date {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const thisMonth = lastSaturdayUtc(y, m);
  const today = Date.UTC(y, m, now.getUTCDate());
  if (thisMonth.getTime() >= today) return thisMonth;
  return lastSaturdayUtc(y, m + 1);
}

export function formatFireDate(day: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(day);
}
