import { useMemo, useSyncExternalStore } from "react";
import { formatTime, fromMinutes, restaurantNow, toMinutes } from "@/lib/format";
import { siteConfig } from "@/lib/site-config";

export interface RestaurantClock {
  /** Restaurant-local "YYYY-MM-DD" */
  date: string;
  /** 0 = Sunday */
  weekday: number;
  /** Restaurant-local "HH:mm" */
  time: string;
}

const SLOT_STEP_MINUTES = 15;
/** The last schedulable slot is this many minutes before close. */
const LAST_SLOT_BEFORE_CLOSE_MINUTES = 30;
const TICK_MS = 15_000;

// ---------- Live restaurant clock (client-only, SSR-safe) ----------

let cachedBucket = -1;
let cachedSnapshot = "";

function subscribe(onChange: () => void) {
  const interval = window.setInterval(onChange, TICK_MS);
  const onVisible = () => {
    if (document.visibilityState === "visible") onChange();
  };
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    window.clearInterval(interval);
    document.removeEventListener("visibilitychange", onVisible);
  };
}

function getSnapshot(): string {
  // Intl formatting is comparatively slow, so recompute at most once per tick window.
  const bucket = Math.floor(Date.now() / TICK_MS);
  if (bucket !== cachedBucket) {
    cachedBucket = bucket;
    const now = restaurantNow();
    cachedSnapshot = `${now.date}|${now.weekday}|${now.time}`;
  }
  return cachedSnapshot;
}

function getServerSnapshot(): string {
  return "";
}

/** Current wall-clock time at the restaurant, refreshed every 15 s. `null` during SSR / the first client render. */
export function useRestaurantClock(): RestaurantClock | null {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(() => {
    if (!snapshot) return null;
    const [date, weekday, time] = snapshot.split("|");
    return { date, weekday: Number(weekday), time };
  }, [snapshot]);
}

// ---------- Pure schedule helpers ----------

function hoursFor(weekday: number) {
  const day = siteConfig.hours.find((h) => h.day === weekday);
  if (!day?.open || !day.close) return null;
  const open = toMinutes(day.open);
  let close = toMinutes(day.close);
  // A close past midnight still only allows same-day ("today") slots.
  if (close <= open) close = 24 * 60;
  return { label: day.label, open, close, openLabel: formatTime(day.open), closeLabel: formatTime(day.close) };
}

/**
 * 15-minute slots for later today: from now + lead time (never before opening + lead time)
 * until 30 minutes before close. Values are restaurant-local "HH:mm".
 */
export function getScheduleSlots(clock: RestaurantClock, leadMinutes: number): string[] {
  const hours = hoursFor(clock.weekday);
  if (!hours) return [];
  const earliest = Math.max(toMinutes(clock.time), hours.open) + leadMinutes;
  const first = Math.ceil(earliest / SLOT_STEP_MINUTES) * SLOT_STEP_MINUTES;
  const last = Math.min(hours.close - LAST_SLOT_BEFORE_CLOSE_MINUTES, 23 * 60 + 45);
  const slots: string[] = [];
  for (let t = first; t <= last; t += SLOT_STEP_MINUTES) slots.push(fromMinutes(t));
  return slots;
}

export type KitchenStatus =
  | { isOpen: true; closesAt: string }
  | { isOpen: false; nextOpening: string | null };

/** Whether the kitchen is open right now, and when it next opens if not. */
export function getKitchenStatus(clock: RestaurantClock): KitchenStatus {
  const now = toMinutes(clock.time);
  const today = hoursFor(clock.weekday);
  if (today && now >= today.open && now < today.close) {
    return { isOpen: true, closesAt: today.closeLabel };
  }
  if (today && now < today.open) {
    return { isOpen: false, nextOpening: `today at ${today.openLabel}` };
  }
  for (let offset = 1; offset <= 7; offset++) {
    const weekday = (clock.weekday + offset) % 7;
    const day = hoursFor(weekday);
    if (day) {
      return {
        isOpen: false,
        nextOpening: `${offset === 1 ? "tomorrow" : day.label} at ${day.openLabel}`,
      };
    }
  }
  return { isOpen: false, nextOpening: null };
}
