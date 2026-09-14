"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, MapPin, Menu, Phone, ShoppingBag, X } from "lucide-react";
import { isActivePath } from "@/components/site/hours";
import { OpenStatus } from "@/components/site/open-status";
import { TodayHours } from "@/components/site/today-hours";
import { Wordmark } from "@/components/site/wordmark";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { fullAddress, siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

const LINKS = [{ label: "Home", href: "/" }, ...siteConfig.nav];

const ICON_BUTTON =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-full text-current transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember";

/** Below-md navigation: a full-height sheet with big links, today's hours, contact and the two CTAs. */
export function MobileNav({ className }: { className?: string }) {
  const pathname = usePathname();
  // Remember which route the sheet was opened on: any navigation (links, back/forward) closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn !== null && openOn === pathname;
  const close = () => setOpenOn(null);

  return (
    <Sheet open={open} onOpenChange={(next) => setOpenOn(next ? pathname : null)}>
      <SheetTrigger asChild>
        <button type="button" aria-label="Open menu" className={cn(ICON_BUTTON, className)}>
          <Menu className="size-6" aria-hidden="true" />
        </button>
      </SheetTrigger>

      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full gap-0 border-none bg-charcoal p-0 text-white data-[side=right]:w-full data-[side=right]:sm:max-w-sm"
      >
        <SheetHeader className="h-16 shrink-0 flex-row items-center justify-between gap-3 border-b border-white/10 px-4 py-0">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SheetDescription className="sr-only">
            Pages, today&apos;s opening hours and how to reach {siteConfig.name}.
          </SheetDescription>
          <Wordmark onClick={close} className="text-white" />
          <SheetClose asChild>
            <button type="button" aria-label="Close menu" className={ICON_BUTTON}>
              <X className="size-6" aria-hidden="true" />
            </button>
          </SheetClose>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          <nav aria-label="Mobile" className="px-4 pt-4 pb-6">
            <ul className="flex flex-col">
              {LINKS.map((link) => {
                const active = isActivePath(pathname, link.href);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={close}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-14 items-center justify-between rounded-xl px-2 text-4xl leading-none font-black tracking-tighter uppercase transition-colors outline-none hover:text-ember focus-visible:ring-2 focus-visible:ring-ember",
                        active ? "text-ember" : "text-white",
                      )}
                    >
                      {link.label}
                      {active && (
                        <span aria-hidden="true" className="size-2.5 rounded-full bg-ember" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="mx-4 flex flex-col gap-4 border-t border-white/10 py-6">
            <TodayHours labelClassName="text-white/60" hoursClassName="text-white" />
            <OpenStatus className="text-white/85" />
            <a
              href={siteConfig.phoneHref}
              className="inline-flex min-h-11 items-center gap-3 rounded-lg text-lg font-semibold outline-none hover:text-ember focus-visible:ring-2 focus-visible:ring-ember"
            >
              <Phone className="size-5 text-ember" aria-hidden="true" />
              <span>
                <span className="sr-only">Call </span>
                {siteConfig.phone}
              </span>
            </a>
            <p className="flex items-start gap-3 text-base text-white/75">
              <MapPin className="mt-0.5 size-5 shrink-0 text-ember" aria-hidden="true" />
              {fullAddress}
            </p>
          </div>
        </div>

        <SheetFooter className="mt-0 grid shrink-0 grid-cols-2 gap-2 border-t border-white/10 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button
            asChild
            className="h-12 rounded-full bg-ember px-4 text-base font-semibold text-white hover:bg-ember-dark"
          >
            <Link href="/menu" onClick={close}>
              <ShoppingBag aria-hidden="true" />
              Order online
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-12 rounded-full border-white/25 bg-white/5 px-4 text-base font-semibold text-white hover:bg-white/15 hover:text-white"
          >
            <Link href="/reserve" onClick={close}>
              <CalendarDays aria-hidden="true" />
              Book a table
            </Link>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
