"use client";

import { useMemo, useState } from "react";
import {
  blockedDayWithin,
  findConflict,
  type DateRange,
} from "@/lib/booking/availability";

export interface DateRangePickerProps {
  busy: readonly DateRange[];
  blocked: readonly string[];
  checkIn: string;
  checkOut: string;
  onChange: (checkIn: string, checkOut: string) => void;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dayStr(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function parseDay(value: string): { year: number; month: number; day: number } {
  const [y, m, d] = value.split("-").map(Number);
  return { year: y, month: m - 1, day: d };
}

function formatDay(value: string): string {
  const { year, month, day } = parseDay(value);
  return new Date(year, month, day).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Tap-to-select check-in / check-out calendar. Greyed days are already
 * occupied (approved bookings) or blocked by the owner; a check-out day is
 * free when it starts the next stay, matching the server's half-open rule.
 * The server re-validates every submission — this is a guide, not the gate.
 */
export default function DateRangePicker({
  busy,
  blocked,
  checkIn,
  checkOut,
  onChange,
}: DateRangePickerProps) {
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });

  const today = todayStr();

  const occupied = useMemo(() => {
    const nights = new Set<string>();
    for (const range of busy) {
      const start = parseDay(range.check_in);
      const end = parseDay(range.check_out);
      const d = new Date(start.year, start.month, start.day);
      const last = new Date(end.year, end.month, end.day);
      while (d < last) {
        nights.add(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
        d.setDate(d.getDate() + 1);
      }
    }
    return nights;
  }, [busy]);

  function windowFree(inDay: string, outDay: string): boolean {
    if (outDay <= inDay) return false;
    if (blockedDayWithin({ check_in: inDay, check_out: outDay }, blocked)) return false;
    if (findConflict({ check_in: inDay, check_out: outDay }, busy)) return false;
    return true;
  }

  function dayDisabled(day: string): boolean {
    if (day < today) return true;
    const pickingOut = Boolean(checkIn) && !checkOut;
    if (pickingOut) {
      // Days on/before check-in restart the selection (first-pick rules apply);
      // later days must form a free window.
      if (day <= checkIn) return occupied.has(day) || blocked.includes(day);
      return !windowFree(checkIn, day);
    }
    if (occupied.has(day)) return true;
    if (blocked.includes(day)) return true;
    return false;
  }

  function onPick(day: string): void {
    if (dayDisabled(day)) return;
    const pickingOut = Boolean(checkIn) && !checkOut;
    if (pickingOut) {
      if (day <= checkIn) onChange(day, "");
      else onChange(checkIn, day);
    } else {
      onChange(day, "");
    }
  }

  function shiftMonth(delta: number): void {
    setCursor(({ year, month }) => {
      const next = new Date(year, month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  const first = new Date(cursor.year, cursor.month, 1);
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const leading = (first.getDay() + 6) % 7; // Monday-first

  const cells: Array<string | null> = [
    ...Array<string | null>(leading).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      dayStr(cursor.year, cursor.month, i + 1),
    ),
  ];

  const pickingOut = Boolean(checkIn) && !checkOut;

  return (
    <div className="mt-1 rounded-md border border-mist bg-cream p-3 sm:p-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          aria-label="Previous month"
          className="rounded px-3 py-1 text-sm text-ink hover:bg-mist"
        >
          ←
        </button>
        <span className="text-sm font-semibold text-ink">
          {MONTHS[cursor.month]} {cursor.year}
        </span>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          aria-label="Next month"
          className="rounded px-3 py-1 text-sm text-ink hover:bg-mist"
        >
          →
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((wd) => (
          <div key={wd} className="py-1 text-[11px] font-medium text-ink/50">
            {wd}
          </div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`pad-${i}`} />;
          const disabled = dayDisabled(day);
          const isIn = day === checkIn;
          const isOut = day === checkOut;
          const inRange =
            checkIn && checkOut && day > checkIn && day < checkOut;
          return (
            <button
              key={day}
              type="button"
              disabled={disabled}
              onClick={() => onPick(day)}
              aria-label={formatDay(day)}
              aria-pressed={isIn || isOut}
              className={[
                "aspect-square rounded text-xs sm:text-sm transition-colors",
                disabled
                  ? "cursor-not-allowed bg-mist/60 text-ink/25 line-through"
                  : isIn || isOut
                    ? "bg-lake font-semibold text-cream"
                    : inRange
                      ? "bg-lake/15 text-ink"
                      : "text-ink hover:bg-lake/25",
              ].join(" ")}
            >
              {Number(day.slice(8))}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-mist pt-3 text-xs text-ink/70">
        <span>
          {checkIn
            ? `Check-in: ${formatDay(checkIn)}`
            : "Tap a day for check-in"}
          {checkOut ? ` · Check-out: ${formatDay(checkOut)}` : ""}
        </span>
        <span className="text-ink/50">
          {pickingOut ? "Now tap your check-out day" : "Grey days are taken"}
        </span>
        {(checkIn || checkOut) && (
          <button
            type="button"
            onClick={() => onChange("", "")}
            className="font-semibold text-ember hover:underline"
          >
            Clear dates
          </button>
        )}
      </div>
    </div>
  );
}
