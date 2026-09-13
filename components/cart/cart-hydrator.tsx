"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/store/cart";

/** Loads the persisted cart from localStorage after the first render to avoid hydration mismatches. */
export function CartHydrator() {
  useEffect(() => {
    void useCart.persist.rehydrate();
  }, []);
  return null;
}
