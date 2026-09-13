"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { siteConfig } from "@/lib/site-config";
import type { MenuItemDTO } from "@/lib/types";

export interface CartLine {
  /** Menu item slug — stable across reseeds, sent to POST /api/orders. */
  slug: string;
  name: string;
  /** Display estimate only; the server re-prices every order. */
  priceCents: number;
  imageUrl: string;
  quantity: number;
  notes?: string;
}

export type CartProduct = Pick<MenuItemDTO, "slug" | "name" | "priceCents" | "imageUrl">;

interface CartState {
  lines: CartLine[];
  isOpen: boolean;
  addItem: (product: CartProduct, quantity?: number) => void;
  removeItem: (slug: string) => void;
  setQuantity: (slug: string, quantity: number) => void;
  setNotes: (slug: string, notes: string) => void;
  clear: () => void;
  setOpen: (open: boolean) => void;
}

const clampQty = (n: number) =>
  Math.max(0, Math.min(siteConfig.ordering.maxQuantityPerLine, Math.floor(n)));

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      isOpen: false,
      addItem: (product, quantity = 1) =>
        set((state) => {
          const existing = state.lines.find((l) => l.slug === product.slug);
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.slug === product.slug ? { ...l, quantity: clampQty(l.quantity + quantity) } : l,
              ),
            };
          }
          return {
            lines: [
              ...state.lines,
              {
                slug: product.slug,
                name: product.name,
                priceCents: product.priceCents,
                imageUrl: product.imageUrl,
                quantity: clampQty(quantity) || 1,
              },
            ],
          };
        }),
      removeItem: (slug) => set((state) => ({ lines: state.lines.filter((l) => l.slug !== slug) })),
      setQuantity: (slug, quantity) =>
        set((state) => {
          const q = clampQty(quantity);
          return {
            lines:
              q === 0
                ? state.lines.filter((l) => l.slug !== slug)
                : state.lines.map((l) => (l.slug === slug ? { ...l, quantity: q } : l)),
          };
        }),
      setNotes: (slug, notes) =>
        set((state) => ({
          lines: state.lines.map((l) => (l.slug === slug ? { ...l, notes: notes || undefined } : l)),
        })),
      clear: () => set({ lines: [] }),
      setOpen: (open) => set({ isOpen: open }),
    }),
    {
      name: "ember-house-cart",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ lines: state.lines }),
      // Rehydrated after mount by <CartHydrator /> so server and first client render match.
      skipHydration: true,
    },
  ),
);

export const selectItemCount = (state: CartState) =>
  state.lines.reduce((sum, line) => sum + line.quantity, 0);

export const selectSubtotalCents = (state: CartState) =>
  state.lines.reduce((sum, line) => sum + line.priceCents * line.quantity, 0);
