"use client";

import { useCallback, useSyncExternalStore } from "react";

// ---------- useNow: one shared 30-second clock for relative ages ----------

const CLOCK_TICK_MS = 30_000;
let clockNow = Date.now();
let clockTimer: ReturnType<typeof setInterval> | undefined;
const clockListeners = new Set<() => void>();

function subscribeClock(listener: () => void) {
  clockListeners.add(listener);
  if (clockListeners.size === 1) {
    clockNow = Date.now();
    clockTimer = setInterval(() => {
      clockNow = Date.now();
      clockListeners.forEach((notify) => notify());
    }, CLOCK_TICK_MS);
  }
  return () => {
    clockListeners.delete(listener);
    if (clockListeners.size === 0 && clockTimer !== undefined) {
      clearInterval(clockTimer);
      clockTimer = undefined;
    }
  };
}

const getClock = () => clockNow;

/**
 * Current epoch ms, re-rendering every 30 s. `serverNow` is used for the server render and hydration
 * so relative times ("6 min ago") never cause hydration mismatches.
 */
export function useNow(serverNow: number): number {
  return useSyncExternalStore(subscribeClock, getClock, () => serverNow);
}

// ---------- useMediaQuery ----------

/** `null` during the server render and hydration (render responsive fallbacks with CSS), then a boolean. */
export function useMediaQuery(query: string): boolean | null {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore<boolean | null>(
    subscribe,
    () => window.matchMedia(query).matches,
    () => null,
  );
}
