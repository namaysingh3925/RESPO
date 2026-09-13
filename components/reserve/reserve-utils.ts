/**
 * Pure helpers for the booking flow. Safe to import from Server and Client Components.
 * All dates are restaurant-local calendar dates ("YYYY-MM-DD"); arithmetic happens in UTC so
 * the viewer's own time zone never shifts a day.
 */
import { formatTime, toMinutes } from "@/lib/format";
import { siteConfig, type OpeningHours } from "@/lib/site-config";

/** How long we hold a table past the booked time before releasing it. */
export const TABLE_HOLD_MINUTES = 15;

/** Days shown in the horizontal date strip. */
export const DATE_STRIP_DAYS = 14;

/** Slots starting before this restaurant-local time are grouped under "Lunch". */
export const DINNER_STARTS_AT = "16:00";

const HOURS: readonly OpeningHours[] = siteConfig.hours;

/** Monday-first display order (0 = Sunday). */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

function toUtcNoon(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

/** "2026-09-14" + 3 → "2026-09-17" */
export function addDays(isoDate: string, days: number): string {
  const date = toUtcNoon(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday */
export function weekdayOf(isoDate: string): number {
  return toUtcNoon(isoDate).getUTCDay();
}

export function hoursForWeekday(weekday: number): OpeningHours | undefined {
  return HOURS.find((h) => h.day === weekday);
}

export function isClosedOn(isoDate: string): boolean {
  const hours = hoursForWeekday(weekdayOf(isoDate));
  return !hours || hours.open === null || hours.close === null;
}

/** True for a well-formed "YYYY-MM-DD" between min and max (inclusive). */
export function isDateInRange(value: string, min: string, max: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= min && value <= max;
}

export function isLunchSlot(hhmm: string): boolean {
  return toMinutes(hhmm) < toMinutes(DINNER_STARTS_AT);
}

export interface DayOption {
  date: string;
  isClosed: boolean;
  /** "Today", "Tomorrow" or a short weekday ("Fri"). */
  topLabel: string;
  dayOfMonth: string;
  /** Short month, e.g. "Sep". */
  month: string;
  /** Full accessible name, e.g. "Today, Monday, September 14". */
  ariaLabel: string;
}

const shortWeekday = new Intl.DateTimeFormat(siteConfig.locale, { weekday: "short", timeZone: "UTC" });
const shortMonth = new Intl.DateTimeFormat(siteConfig.locale, { month: "short", timeZone: "UTC" });
const longDate = new Intl.DateTimeFormat(siteConfig.locale, {
  weekday: "long",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

/** The next `count` restaurant-local days starting at `today`. */
export function buildDayOptions(today: string, count: number = DATE_STRIP_DAYS): DayOption[] {
  return Array.from({ length: count }, (_, index) => {
    const date = addDays(today, index);
    const utc = toUtcNoon(date);
    const isClosed = isClosedOn(date);
    const relative = index === 0 ? "Today" : index === 1 ? "Tomorrow" : null;
    const label = longDate.format(utc);
    return {
      date,
      isClosed,
      topLabel: relative ?? shortWeekday.format(utc),
      dayOfMonth: String(utc.getUTCDate()),
      month: shortMonth.format(utc),
      ariaLabel: [relative, label, isClosed ? "closed" : null].filter(Boolean).join(", "),
    };
  });
}

/**
 * Sensible default selection: today if a same-day booking is still realistic
 * (respecting lead time and last seating), otherwise the next open day.
 */
export function pickDefaultDate(days: DayOption[], nowTime: string): string | null {
  const { minLeadMinutes, lastSeatingMinutesBeforeClose } = siteConfig.reservations;
  for (const [index, day] of days.entries()) {
    if (day.isClosed) continue;
    if (index > 0) return day.date;
    const hours = hoursForWeekday(weekdayOf(day.date));
    if (!hours?.open || !hours.close) continue;
    const open = toMinutes(hours.open);
    let close = toMinutes(hours.close);
    if (close <= open) close += 24 * 60; // closes after midnight
    const lastSeating = close - lastSeatingMinutesBeforeClose;
    if (toMinutes(nowTime) + minLeadMinutes <= lastSeating) return day.date;
  }
  return null;
}

export interface HoursGroup {
  /** e.g. "Mon – Thu" or "Fri" */
  label: string;
  /** e.g. "11:30 AM – 10:00 PM" or "Closed" */
  hours: string;
  weekdays: number[];
}

/** Consecutive days with identical hours collapsed into one row, Monday first. */
export function groupWeeklyHours(): HoursGroup[] {
  const groups: { weekdays: number[]; open: string | null; close: string | null }[] = [];
  for (const weekday of WEEK_ORDER) {
    const hours = hoursForWeekday(weekday);
    const open = hours?.open ?? null;
    const close = hours?.close ?? null;
    const last = groups.at(-1);
    if (last && last.open === open && last.close === close) {
      last.weekdays.push(weekday);
    } else {
      groups.push({ weekdays: [weekday], open, close });
    }
  }
  const short = (weekday: number) => (hoursForWeekday(weekday)?.label ?? "").slice(0, 3);
  return groups.map(({ weekdays, open, close }) => {
    const first = short(weekdays[0]);
    const last = short(weekdays[weekdays.length - 1]);
    return {
      weekdays,
      label: weekdays.length === 1 ? first : weekdays.length === 2 ? `${first} & ${last}` : `${first} – ${last}`,
      hours: open && close ? `${formatTime(open)} – ${formatTime(close)}` : "Closed",
    };
  });
}

/** "Sam Rivera" → "Sam" */
export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? "";
}

export function guestsLabel(count: number): string {
  return `${count} ${count === 1 ? "guest" : "guests"}`;
}
