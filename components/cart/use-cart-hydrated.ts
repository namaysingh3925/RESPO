"use client";

import { useSyncExternalStore } from "react";
import { useCart } from "@/lib/store/cart";

// `useCart.persist` is undefined when localStorage is unavailable (e.g. on the server),
// so every access is guarded even though the types say it always exists.

function subscribe(onChange: () => void) {
  const persist = useCart.persist;
  if (!persist) return () => {};
  const offStart = persist.onHydrate(onChange);
  const offFinish = persist.onFinishHydration(onChange);
  return () => {
    offStart();
    offFinish();
  };
}

function getSnapshot() {
  return useCart.persist?.hasHydrated() ?? false;
}

function getServerSnapshot() {
  return false;
}

/**
 * `true` once <CartHydrator /> has loaded the persisted cart from localStorage.
 * Always `false` during SSR and the first client render, so cart-dependent UI never causes a hydration mismatch.
 */
export function useCartHydrated(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
