"use client";

import { useSyncExternalStore } from "react";
import { restaurantNow } from "@/lib/format";

function subscribe(onTick: () => void) {
  const id = window.setInterval(onTick, 30_000);
  return () => window.clearInterval(id);
}

/** Minute-resolution string so consecutive reads compare equal. */
function getSnapshot(): string {
  const now = restaurantNow();
  return `${now.date}T${now.time}`;
}

function getServerSnapshot(): null {
  return null;
}

/**
 * Restaurant-local "today" and "now", available only after hydration (null on the server and during
 * the hydrating render) so server HTML never bakes in a stale date. Re-checks every 30 seconds.
 */
export function useRestaurantClock(): { date: string | null; time: string | null } {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    date: snapshot ? snapshot.slice(0, 10) : null,
    time: snapshot ? snapshot.slice(11) : null,
  };
}
