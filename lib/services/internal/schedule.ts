/**
 * Pure business-hours rules shared by the reservation and order services.
 * All dates/times are restaurant-local (siteConfig.timeZone).
 */
import { fromMinutes, restaurantNow, toMinutes } from "@/lib/format";
import { siteConfig } from "@/lib/site-config";
import { daysBetween, isValidIsoDate, weekdayOf } from "@/lib/services/internal/time";

export type RestaurantClock = ReturnType<typeof restaurantNow>;

/** ASAP online orders stop this many minutes before closing. */
export const LAST_ASAP_ORDER_MINUTES_BEFORE_CLOSE = 15;

const MINUTES_PER_DAY = 24 * 60;

/** Opening hours for a calendar date as minutes since midnight, or null when closed. */
export function openingHoursFor(date: string): { open: number; close: number } | null {
  const weekday = weekdayOf(date);
  const entry = siteConfig.hours.find((h) => h.day === weekday);
  if (!entry?.open || !entry.close) return null;
  return { open: toMinutes(entry.open), close: toMinutes(entry.close) };
}

export type ReservationDayPlan =
  | { status: "invalid-date" | "out-of-window" | "closed"; times: string[] }
  | { status: "open"; times: string[] };

/**
 * Bookable slot start times for a date: every `slotMinutes` from opening until
 * (close - lastSeatingMinutesBeforeClose) inclusive; same-day slots inside the lead time are dropped.
 * Dates outside [today, today + bookingWindowDays] are "out-of-window".
 */
export function reservationDayPlan(date: string, now: RestaurantClock = restaurantNow()): ReservationDayPlan {
  if (!isValidIsoDate(date)) return { status: "invalid-date", times: [] };

  const { bookingWindowDays, slotMinutes, lastSeatingMinutesBeforeClose, minLeadMinutes } = siteConfig.reservations;
  const offset = daysBetween(now.date, date);
  if (offset < 0 || offset > bookingWindowDays) return { status: "out-of-window", times: [] };

  const hours = openingHoursFor(date);
  if (!hours) return { status: "closed", times: [] };

  const lastSeating = hours.close - lastSeatingMinutesBeforeClose;
  const earliest = offset === 0 ? toMinutes(now.time) + minLeadMinutes : Number.NEGATIVE_INFINITY;
  const times: string[] = [];
  for (let minute = hours.open; minute <= lastSeating && minute < MINUTES_PER_DAY; minute += slotMinutes) {
    if (minute >= earliest) times.push(fromMinutes(minute));
  }
  return { status: "open", times };
}

/** Whether the kitchen accepts ASAP orders right now (open, and before the last-order cutoff). */
export function isAcceptingAsapOrders(now: RestaurantClock = restaurantNow()): boolean {
  const hours = openingHoursFor(now.date);
  if (!hours) return false;
  const minute = toMinutes(now.time);
  return minute >= hours.open && minute <= hours.close - LAST_ASAP_ORDER_MINUTES_BEFORE_CLOSE;
}

/**
 * Earliest and latest restaurant-local times ("HH:mm") a same-day scheduled order may be requested for,
 * or null when the restaurant is closed today or the window has already passed.
 * The kitchen needs `leadMinutes` from now (or from opening, if it isn't open yet).
 */
export function scheduledOrderWindow(
  leadMinutes: number,
  now: RestaurantClock = restaurantNow(),
): { earliest: string; latest: string } | null {
  const hours = openingHoursFor(now.date);
  if (!hours) return null;
  const earliest = Math.max(toMinutes(now.time), hours.open) + leadMinutes;
  const latest = Math.min(hours.close, MINUTES_PER_DAY - 1);
  if (earliest > latest) return null;
  return { earliest: fromMinutes(earliest), latest: fromMinutes(latest) };
}
