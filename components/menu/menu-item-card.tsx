"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { Flame, Plus, Wine } from "lucide-react";
import { toast } from "sonner";
import { QuantityStepper } from "@/components/cart/quantity-stepper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DIETARY_LABELS } from "@/lib/constants";
import { formatPrice } from "@/lib/format";
import { siteConfig } from "@/lib/site-config";
import { useCart } from "@/lib/store/cart";
import type { MenuItemDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

interface MenuItemCardProps {
  item: MenuItemDTO;
  className?: string;
}

type FocusTarget = "add" | "stepper";

/** Mobile-first dish card: photo, copy, dietary badges and an add-to-order control bound to the cart store. */
export function MenuItemCard({ item, className }: MenuItemCardProps) {
  const quantity = useCart((state) => state.lines.find((line) => line.slug === item.slug)?.quantity ?? 0);
  const addItem = useCart((state) => state.addItem);
  const setQuantity = useCart((state) => state.setQuantity);
  const setOpen = useCart((state) => state.setOpen);

  const actionsRef = useRef<HTMLDivElement>(null);
  // Swapping Add ⇄ stepper unmounts the focused button; hand focus to its replacement.
  const pendingFocus = useRef<FocusTarget | null>(null);

  const inCart = quantity > 0;
  const headingId = `dish-${item.slug}`;

  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    const actions = actionsRef.current;
    if (!actions) return;
    const next =
      target === "add"
        ? actions.querySelector<HTMLElement>("[data-add-to-order]")
        : (actions.querySelector<HTMLElement>('button[aria-label^="Increase"]') ??
          actions.querySelector<HTMLElement>("button:not(:disabled)"));
    next?.focus();
  }, [inCart]);

  const handleAdd = () => {
    pendingFocus.current = "stepper";
    addItem({
      slug: item.slug,
      name: item.name,
      priceCents: item.priceCents,
      imageUrl: item.imageUrl,
    });
    toast.success(`Added ${item.name}`, {
      id: `menu-add-${item.slug}`,
      action: { label: "View cart", onClick: () => setOpen(true) },
    });
  };

  const handleQuantityChange = (next: number) => {
    if (next <= 0) pendingFocus.current = "add";
    setQuantity(item.slug, next);
  };

  return (
    <article
      aria-labelledby={headingId}
      className={cn(
        "flex h-full gap-3 rounded-2xl border bg-card p-3 text-card-foreground transition-colors sm:gap-4",
        inCart ? "border-primary/60" : "border-border",
        className,
      )}
    >
      <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-muted sm:size-28">
        <Image
          src={item.imageUrl}
          alt={item.name}
          fill
          sizes="112px"
          className={cn("object-cover", !item.isAvailable && "opacity-60 grayscale")}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <h3 id={headingId} className="text-base leading-snug font-semibold text-balance">
          {item.name}
        </h3>
        {/* Not clamped: descriptions list ingredients guests check for allergies, and there's no detail view. */}
        <p className="mt-1 text-sm leading-snug text-pretty text-muted-foreground">{item.description}</p>

        {(item.calories !== null || item.dietaryTags.length > 0) && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {item.calories !== null && (
              <span className="text-xs text-muted-foreground tabular-nums">{item.calories} cal</span>
            )}
            {item.dietaryTags.length > 0 && (
              <ul className="flex flex-wrap items-center gap-1" aria-label="Dietary information">
                {item.dietaryTags.map((tag) => (
                  <li key={tag} className="flex">
                    <Badge
                      variant="outline"
                      className={cn(
                        "bg-background font-medium",
                        tag === "spicy" && "border-ember/40 text-foreground [&>svg]:text-ember",
                      )}
                    >
                      {tag === "spicy" && <Flame aria-hidden="true" />}
                      {DIETARY_LABELS[tag]}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-3">
          <p
            className={cn(
              "text-base font-semibold tabular-nums",
              !item.isAvailable && "text-muted-foreground",
            )}
          >
            {formatPrice(item.priceCents)}
          </p>

          <div ref={actionsRef} className="flex min-h-11 items-center">
            {!item.isAvailable ? (
              <Badge variant="secondary" className="h-7 px-3 text-xs font-semibold">
                Sold out
              </Badge>
            ) : item.dineInOnly ? (
              <Badge variant="secondary" className="h-7 gap-1.5 px-3 text-xs font-medium">
                <Wine aria-hidden="true" />
                Dine-in only
              </Badge>
            ) : inCart ? (
              <QuantityStepper
                value={quantity}
                onChange={handleQuantityChange}
                max={siteConfig.ordering.maxQuantityPerLine}
                label={item.name}
                size="md"
                className="bg-card"
              />
            ) : (
              <Button
                type="button"
                data-add-to-order=""
                onClick={handleAdd}
                aria-label={`Add ${item.name} to order`}
                className="h-11 gap-1.5 rounded-full px-5 text-sm font-semibold"
              >
                <Plus className="size-4" aria-hidden="true" />
                Add
              </Button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
