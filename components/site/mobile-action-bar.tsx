"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ShoppingBag } from "lucide-react";
import { useCartHydrated } from "@/components/cart/use-cart-hydrated";
import { isActivePath } from "@/components/site/hours";
import { Button } from "@/components/ui/button";
import { selectItemCount, useCart } from "@/lib/store/cart";

/** Routes that already are the conversion flow, so the bar would only get in the way. */
const HIDDEN_ON = ["/order", "/reserve"];

/**
 * Thumb-reach "Order online / Book a table" bar, fixed to the bottom below md.
 * Once the cart has items the first action becomes "Checkout · n".
 */
export function MobileActionBar() {
  const pathname = usePathname();
  const hydrated = useCartHydrated();
  const count = useCart(selectItemCount);

  if (HIDDEN_ON.some((href) => isActivePath(pathname, href))) return null;

  const hasItems = hydrated && count > 0;

  return (
    <>
      {/* Reserves the bar's height at the end of the page so it never covers the footer. */}
      <div
        aria-hidden="true"
        className="h-[calc(3.75rem_+_max(0.75rem,env(safe-area-inset-bottom)))] shrink-0 bg-charcoal md:hidden"
      />
      <nav
        aria-label="Quick actions"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-charcoal/95 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgb(0_0_0/0.18)] backdrop-blur-md md:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-2 gap-2">
          <Button
            asChild
            className="h-12 rounded-full bg-ember px-4 text-base font-semibold text-white hover:bg-ember-dark"
          >
            {hasItems ? (
              <Link href="/order">
                <ShoppingBag aria-hidden="true" />
                <span className="tabular-nums">
                  Checkout · {count}
                  <span className="sr-only"> {count === 1 ? "item" : "items"}</span>
                </span>
              </Link>
            ) : (
              <Link href="/menu">
                <ShoppingBag aria-hidden="true" />
                Order online
              </Link>
            )}
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-12 rounded-full border-white/25 bg-white/5 px-4 text-base font-semibold text-white hover:bg-white/15 hover:text-white"
          >
            <Link href="/reserve">
              <CalendarDays aria-hidden="true" />
              Book a table
            </Link>
          </Button>
        </div>
      </nav>
    </>
  );
}
