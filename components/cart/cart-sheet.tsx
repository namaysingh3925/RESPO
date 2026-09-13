"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, X } from "lucide-react";
import { toast } from "sonner";
import { CartLine } from "@/components/cart/cart-line";
import { useCartHydrated } from "@/components/cart/use-cart-hydrated";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/format";
import { siteConfig } from "@/lib/site-config";
import { selectItemCount, selectSubtotalCents, useCart, type CartLine as CartLineData } from "@/lib/store/cart";

/** Slide-over cart. Mounted once by the (site) layout and opened via `useCart().setOpen(true)`. */
export function CartSheet() {
  const hydrated = useCartHydrated();
  const isOpen = useCart((state) => state.isOpen);
  const setOpen = useCart((state) => state.setOpen);
  const lines = useCart((state) => state.lines);
  const itemCount = useCart(selectItemCount);
  const subtotalCents = useCart(selectSubtotalCents);
  const setQuantity = useCart((state) => state.setQuantity);
  const setNotes = useCart((state) => state.setNotes);
  const listRef = useRef<HTMLUListElement>(null);

  // Close whenever the route changes (e.g. after tapping Checkout or a link inside the sheet).
  const pathname = usePathname();
  useEffect(() => {
    if (useCart.getState().isOpen) useCart.getState().setOpen(false);
  }, [pathname]);

  const close = () => setOpen(false);

  const removeLine = (line: CartLineData) => {
    useCart.getState().removeItem(line.slug);
    // Keep focus inside the dialog instead of dropping it on <body>.
    requestAnimationFrame(() => listRef.current?.focus());
    toast(`Removed ${line.name}`, {
      action: {
        label: "Undo",
        onClick: () => {
          const { addItem, setNotes: restoreNotes } = useCart.getState();
          addItem(line, line.quantity);
          if (line.notes) restoreNotes(line.slug, line.notes);
        },
      },
    });
  };

  const isEmpty = hydrated && lines.length === 0;

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full gap-0 bg-paper p-0 data-[side=right]:w-full sm:max-w-md data-[side=right]:sm:max-w-md"
      >
        <SheetHeader className="flex-row items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <SheetTitle className="text-xl font-black tracking-tight uppercase">Your order</SheetTitle>
            <SheetDescription>
              {hydrated && itemCount > 0
                ? `${itemCount} ${itemCount === 1 ? "item" : "items"} · Pickup or delivery from ${siteConfig.name}`
                : `Pickup or delivery from ${siteConfig.name}`}
            </SheetDescription>
          </div>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" className="size-11 shrink-0 rounded-full">
              <X className="size-5" aria-hidden="true" />
              <span className="sr-only">Close cart</span>
            </Button>
          </SheetClose>
        </SheetHeader>

        {!hydrated ? (
          <div className="flex-1 space-y-5 px-4 py-6 sm:px-6" aria-busy="true" aria-label="Loading your cart">
            {[0, 1].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="size-18 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="h-11 w-32 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : isEmpty ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
            <div className="grid size-16 place-items-center rounded-full bg-ember/10 text-ember">
              <ShoppingBag className="size-7" aria-hidden="true" />
            </div>
            <p className="mt-5 text-lg font-bold">Your cart is empty</p>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              Smash burgers, wood-fired pizza and late-night desserts are a few taps away.
            </p>
            <Button asChild className="mt-6 h-12 rounded-full px-6 text-base">
              <Link href="/menu" onClick={close}>
                Browse the menu
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <ul
              ref={listRef}
              tabIndex={-1}
              aria-label="Items in your cart"
              className="flex-1 divide-y divide-border overflow-y-auto overscroll-contain px-4 focus:outline-none sm:px-6"
            >
              {lines.map((line) => (
                <CartLine
                  key={line.slug}
                  line={line}
                  onQuantityChange={(quantity) =>
                    quantity <= 0 ? removeLine(line) : setQuantity(line.slug, quantity)
                  }
                  onRemove={() => removeLine(line)}
                  onNotesChange={(notes) => setNotes(line.slug, notes)}
                />
              ))}
            </ul>

            <SheetFooter className="mt-0 gap-3 border-t border-border bg-background px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
              <div className="flex items-baseline justify-between">
                <span className="text-base font-semibold">Subtotal</span>
                <span className="text-lg font-bold tabular-nums">{formatPrice(subtotalCents)}</span>
              </div>
              <p className="-mt-2 text-sm text-muted-foreground">Tax, fees and tip calculated at checkout</p>
              <Button asChild className="h-12 w-full rounded-full px-6 text-base font-semibold">
                <Link href="/order" onClick={close}>
                  Checkout · {formatPrice(subtotalCents)}
                </Link>
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
