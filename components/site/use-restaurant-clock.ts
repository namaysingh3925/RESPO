"use client";

import { useMemo, useSyncExternalStore } from "react";
import { restaurantNow } from "@/lib/format";

export type RestaurantClock = ReturnType<typeof restaurantNow>;

const TICK_MS = 30_000;

function subscribe(onChange: () => void) {
  const id = window.setInterval(onChange, TICK_MS);
  const onVisibility = () => {
    if (document.visibilityState === "visible") onChange();
  };
  document.addEventListener("visibilitychange", onVisibility);
  return () => {
    window.clearInterval(id);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}

// A string snapshot stays referentially stable until the minute changes.
function getSnapshot(): string | null {
  const { date, time, weekday } = restaurantNow();
  return `${date}|${time}|${weekday}`;
}

// The server (and the hydrating client render) knows nothing about "now" — callers render a placeholder.
function getServerSnapshot(): string | null {
  return null;
}

/**
 * Wall-clock date/time in the restaurant's time zone, or `null` during SSR and hydration.
 * Re-evaluates every 30 seconds and whenever the tab becomes visible again.
 */
export function useRestaurantClock(): RestaurantClock | null {
  const key = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(() => {
    if (!key) return null;
    const [date, time, weekday] = key.split("|");
    return { date, time, weekday: Number(weekday) };
  }, [key]);
}
