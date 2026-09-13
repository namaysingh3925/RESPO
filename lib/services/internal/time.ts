/**
 * Calendar and time-zone helpers for restaurant-local dates ("YYYY-MM-DD") and times ("HH:mm").
 * Pure functions with no database access — covered by time.test.ts (`npm run test:unit`).
 */
import { siteConfig } from "@/lib/site-config";

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const HH_MM = /^([01]\d|2[0-3]):([0-5]\d)$/;

function parseIsoDate(date: string): { year: number; month: number; day: number } | null {
  const match = ISO_DATE.exec(date);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

/** True for a real calendar date in YYYY-MM-DD form ("2026-02-30" is false). */
export function isValidIsoDate(date: string): boolean {
  const parts = parseIsoDate(date);
  if (!parts) return false;
  const probe = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12));
  return (
    probe.getUTCFullYear() === parts.year &&
    probe.getUTCMonth() === parts.month - 1 &&
    probe.getUTCDate() === parts.day
  );
}

/** True for a 24h "HH:mm" wall-clock time. */
export function isValidTime(time: string): boolean {
  return HH_MM.test(time);
}

function toUtcNoon(date: string): number {
  const parts = parseIsoDate(date);
  if (!parts) throw new RangeError(`Invalid ISO date: ${date}`);
  return Date.UTC(parts.year, parts.month - 1, parts.day, 12);
}

function formatUtcDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** Calendar arithmetic on YYYY-MM-DD strings (no time-zone involved). */
export function addDays(date: string, days: number): string {
  return formatUtcDate(toUtcNoon(date) + days * DAY_MS);
}

/** Whole calendar days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtcNoon(to) - toUtcNoon(from)) / DAY_MS);
}

/** 0 = Sunday … 6 = Saturday for a calendar date, matching siteConfig.hours[].day. */
export function weekdayOf(date: string): number {
  return new Date(toUtcNoon(date)).getUTCDay();
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function zoneFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatterCache.set(timeZone, formatter);
  }
  return formatter;
}

function wallClockParts(instantMs: number, timeZone: string) {
  const parts = zoneFormatter(timeZone).formatToParts(new Date(instantMs));
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value ?? NaN);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    // Some engines still report midnight as "24" even with h23.
    hour: get("hour") % 24,
    minute: get("minute"),
    second: get("second"),
  };
}

/** UTC offset of `timeZone` at an instant, in minutes (New York in winter → -300). */
export function timeZoneOffsetMinutes(instant: Date | number, timeZone: string = siteConfig.timeZone): number {
  const ms = typeof instant === "number" ? instant : instant.getTime();
  const p = wallClockParts(ms, timeZone);
  const wallAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const truncated = Math.floor(ms / 1000) * 1000;
  return Math.round((wallAsUtc - truncated) / MINUTE_MS);
}

/** Wall-clock date and time of an instant in `timeZone`. */
export function toZonedDateTime(
  instant: Date | number,
  timeZone: string = siteConfig.timeZone,
): { date: string; time: string } {
  const ms = typeof instant === "number" ? instant : instant.getTime();
  const p = wallClockParts(ms, timeZone);
  return {
    date: `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`,
    time: `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`,
  };
}

/**
 * Converts a restaurant-local wall-clock date + time into the UTC instant it denotes.
 * DST-safe: offsets are read from Intl on both sides of any transition.
 * - Ambiguous times (clocks fall back, the hour happens twice) resolve to the EARLIER instant.
 * - Non-existent times (clocks spring forward) shift forward by the gap (02:30 → 03:30).
 */
export function zonedTimeToUtc(date: string, time: string, timeZone: string = siteConfig.timeZone): Date {
  const dateParts = parseIsoDate(date);
  const timeMatch = HH_MM.exec(time);
  if (!dateParts || !timeMatch || !isValidIsoDate(date)) {
    throw new RangeError(`Invalid restaurant-local date/time: ${date} ${time}`);
  }
  const wallAsUtc = Date.UTC(
    dateParts.year,
    dateParts.month - 1,
    dateParts.day,
    Number(timeMatch[1]),
    Number(timeMatch[2]),
  );

  // Offsets a day either side bracket any single DST transition near this wall time.
  const offsets = new Set([
    timeZoneOffsetMinutes(wallAsUtc - DAY_MS, timeZone),
    timeZoneOffsetMinutes(wallAsUtc + DAY_MS, timeZone),
  ]);
  const candidates = [...offsets].map((offset) => wallAsUtc - offset * MINUTE_MS).sort((a, b) => a - b);

  for (const candidate of candidates) {
    const wall = toZonedDateTime(candidate, timeZone);
    if (wall.date === date && wall.time === time) return new Date(candidate);
  }
  // Inside a spring-forward gap: the pre-transition offset yields the later instant.
  return new Date(candidates[candidates.length - 1]);
}

/** UTC instants bounding a restaurant-local calendar day: [start, end). Handles 23h/25h DST days. */
export function restaurantDayUtcRange(
  date: string,
  timeZone: string = siteConfig.timeZone,
): { start: Date; end: Date } {
  return {
    start: zonedTimeToUtc(date, "00:00", timeZone),
    end: zonedTimeToUtc(addDays(date, 1), "00:00", timeZone),
  };
}
