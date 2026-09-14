"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CartButton } from "@/components/cart/cart-button";
import { isActivePath } from "@/components/site/hours";
import { MobileNav } from "@/components/site/mobile-nav";
import { Wordmark } from "@/components/site/wordmark";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

/** How far the home page scrolls before the header turns solid. */
const SOLID_AFTER_PX = 40;

function subscribeToScroll(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

/** `true` once the window has scrolled past the threshold; `false` on the server and during hydration. */
function useScrolledPast(px: number): boolean {
  return useSyncExternalStore(
    subscribeToScroll,
    () => window.scrollY > px,
    () => false,
  );
}

/**
 * Fixed 64px site header. Transparent over the home hero until the page scrolls, solid charcoal everywhere else.
 * md+: inline nav, cart and "Book a table". Below md: cart and the MobileNav sheet.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const scrolled = useScrolledPast(SOLID_AFTER_PX);
  const solid = pathname !== "/" || scrolled;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 h-16 text-white transition-[background-color,box-shadow] duration-300 motion-reduce:transition-none",
        solid
          ? "bg-charcoal/95 shadow-[0_1px_0_rgb(255_255_255/0.08)] backdrop-blur-md"
          : "bg-linear-to-b from-black/55 to-transparent",
      )}
    >
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Wordmark />

        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex items-center gap-0.5 lg:gap-1">
            {siteConfig.nav.map((link) => {
              const active = isActivePath(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative inline-flex h-11 items-center rounded-full px-2.5 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ember lg:px-3.5",
                      "after:absolute after:inset-x-2.5 after:bottom-1.5 after:h-0.5 after:rounded-full after:bg-ember after:transition-transform lg:after:inset-x-3.5",
                      active
                        ? "text-white after:scale-x-100"
                        : "text-white/75 after:scale-x-0 hover:text-white",
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-1 md:gap-2">
          <CartButton className="focus-visible:ring-ember focus-visible:ring-offset-0" />
          <Button
            asChild
            className="hidden h-11 rounded-full bg-ember px-5 text-sm font-semibold text-white hover:bg-ember-dark md:inline-flex"
          >
            <Link href="/reserve">Book a table</Link>
          </Button>
          <MobileNav className="md:hidden" />
        </div>
      </div>
    </header>
  );
}
