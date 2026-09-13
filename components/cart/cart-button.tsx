"use client";

import { ShoppingBag } from "lucide-react";
import { useCartHydrated } from "@/components/cart/use-cart-hydrated";
import { selectItemCount, useCart } from "@/lib/store/cart";
import { cn } from "@/lib/utils";

/** Header cart trigger: 44px icon button with a live item-count badge. Opens <CartSheet />. */
export function CartButton({ className }: { className?: string }) {
  const hydrated = useCartHydrated();
  const count = useCart(selectItemCount);
  const setOpen = useCart((state) => state.setOpen);

  const visibleCount = hydrated ? count : 0;
  const label = hydrated
    ? `Open cart, ${count} ${count === 1 ? "item" : "items"}`
    : "Open cart";

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label={label}
      aria-haspopup="dialog"
      className={cn(
        "relative inline-flex size-11 shrink-0 items-center justify-center rounded-full text-current transition-colors hover:bg-current/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      <ShoppingBag className="size-5" aria-hidden="true" />
      {visibleCount > 0 && (
        <span
          // Re-keying replays the pop-in animation whenever the count changes.
          key={visibleCount}
          aria-hidden="true"
          className="absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-ember px-1 text-[11px] leading-none font-bold text-white tabular-nums shadow-sm ring-2 ring-background animate-in fade-in-0 zoom-in-50 duration-300 motion-reduce:animate-none"
        >
          {visibleCount > 99 ? "99+" : visibleCount}
        </span>
      )}
    </button>
  );
}
