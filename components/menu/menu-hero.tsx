import type { LucideIcon } from "lucide-react";
import { Bike, ShoppingBag, Wine } from "lucide-react";
import { siteConfig } from "@/lib/site-config";

const { pickupLeadMinutes, deliveryRadiusMiles } = siteConfig.ordering;

const INFO_CHIPS: Array<{ icon: LucideIcon; label: string }> = [
  { icon: ShoppingBag, label: `Pickup in ~${pickupLeadMinutes} min` },
  { icon: Bike, label: `Delivery within ${deliveryRadiusMiles} mi` },
  { icon: Wine, label: "Cocktails are dine-in only" },
];

/** Title block for /menu. The page-level h1 lives here. */
export function MenuHero() {
  return (
    <header className="mx-auto max-w-7xl px-4 pt-10 pb-8 sm:px-6 sm:pt-14 sm:pb-10 lg:px-8 lg:pt-20">
      <p className="flex items-center gap-3 text-xs font-bold tracking-[0.2em] text-foreground uppercase">
        <span aria-hidden="true" className="h-0.5 w-8 rounded-full bg-ember" />
        Eat · Drink · Repeat
      </p>
      <h1
        id="menu-title"
        className="mt-4 text-6xl leading-[0.85] font-black tracking-tighter text-charcoal uppercase sm:text-8xl lg:text-9xl"
      >
        The Menu
      </h1>
      <p className="mt-5 max-w-xl text-base text-pretty text-muted-foreground sm:text-lg">
        Smash burgers, blistered wood-fired pizza, bright bowls and desserts baked in-house. Order
        for pickup or delivery, or pull up a chair in {siteConfig.address.city}.
      </p>
      <ul className="mt-6 flex flex-wrap gap-2" aria-label="Ordering at a glance">
        {INFO_CHIPS.map(({ icon: Icon, label }) => (
          <li
            key={label}
            className="inline-flex min-h-9 items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-medium text-foreground"
          >
            <Icon className="size-4 shrink-0 text-ember" aria-hidden="true" />
            {label}
          </li>
        ))}
      </ul>
    </header>
  );
}
