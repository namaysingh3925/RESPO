import Link from "next/link";
import { CalendarDays, MapPin, UtensilsCrossed } from "lucide-react";
import { CartSheet } from "@/components/cart/cart-sheet";
import { MobileActionBar } from "@/components/site/mobile-action-bar";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { SkipLink } from "@/components/site/skip-link";
import { Button } from "@/components/ui/button";

const MORE_LINKS = [
  { label: "Book a table", href: "/reserve", icon: CalendarDays },
  { label: "Hours & directions", href: "/visit", icon: MapPin },
];

/**
 * Branded 404. The root not-found boundary sits outside app/(site)/layout.tsx, so it brings the site chrome with it.
 * Next.js adds `noindex` to 404 responses automatically.
 */
export default function NotFound() {
  return (
    <>
      <SkipLink />
      <SiteHeader />
      <main
        id="main"
        tabIndex={-1}
        className="relative flex flex-1 flex-col overflow-hidden bg-charcoal pt-16 text-white outline-none"
      >
        <p
          aria-hidden="true"
          className="pointer-events-none absolute -right-[4vw] -bottom-[6vw] text-[42vw] leading-none font-black tracking-tighter text-white/[0.04] select-none"
        >
          404
        </p>

        <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <p className="flex items-center gap-3 text-xs font-bold tracking-[0.2em] text-ember uppercase">
            <span aria-hidden="true" className="h-0.5 w-8 rounded-full bg-ember" />
            404 — Page not found
          </p>
          <h1 className="mt-5 text-[clamp(2.75rem,11vw,10rem)] leading-[0.85] font-black tracking-tighter uppercase">
            This table
            <br />
            isn&apos;t set
          </h1>
          <p className="mt-6 max-w-xl text-lg text-pretty text-white/75">
            The page you&apos;re after has moved, sold out or never made it onto the menu. The good
            stuff is still right here.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              asChild
              className="h-12 rounded-full bg-ember px-6 text-base font-semibold text-white hover:bg-ember-dark"
            >
              <Link href="/">Back to home</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-12 rounded-full border-white/30 bg-white/5 px-6 text-base font-semibold text-white hover:bg-white/15 hover:text-white"
            >
              <Link href="/menu">
                <UtensilsCrossed aria-hidden="true" />
                See the menu
              </Link>
            </Button>
          </div>

          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-1 border-t border-white/10 pt-6">
            {MORE_LINKS.map(({ label, href, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="inline-flex min-h-11 items-center gap-2 rounded-md font-semibold text-white/85 underline-offset-4 outline-none hover:text-white hover:underline focus-visible:ring-2 focus-visible:ring-ember"
                >
                  <Icon className="size-4 text-ember" aria-hidden="true" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>
      <SiteFooter />
      <MobileActionBar />
      <CartSheet />
    </>
  );
}
