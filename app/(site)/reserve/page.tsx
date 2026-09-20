import type { Metadata } from "next";
import Image from "next/image";
import { CallToOrder } from "@/components/site/call-to-order";
import { ReserveInfo } from "@/components/reserve/reserve-info";
import { PHOTOS, unsplash } from "@/lib/data/menu";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Book a table",
  description: `Reserve a table at ${siteConfig.name} on ${siteConfig.address.street}, ${siteConfig.address.city}. Pick your party size, date and time — bookings open ${siteConfig.reservations.bookingWindowDays} days ahead.`,
  alternates: { canonical: "/reserve" },
};

export default function ReservePage() {
  return (
    <main id="main" className="pt-16 pb-28 md:pb-16">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 pt-4 sm:px-6 sm:pt-6 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:items-start md:gap-8 lg:gap-12 lg:px-8 lg:pt-10">
        <section
          aria-labelledby="reserve-title"
          className="relative isolate flex min-h-60 flex-col overflow-hidden rounded-3xl bg-charcoal text-cream sm:min-h-72 md:sticky md:top-20 md:min-h-[calc(100svh-7rem)]"
        >
          <Image
            src={unsplash(PHOTOS.fineDiningTable, 1600)}
            alt=""
            fill
            sizes="(min-width: 1280px) 500px, (min-width: 768px) 42vw, 100vw"
            quality={75}
            loading="eager"
            fetchPriority="high"
            className="-z-10 object-cover"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-linear-to-t from-charcoal/95 via-charcoal/65 to-charcoal/25 md:from-charcoal md:via-charcoal/80 md:to-charcoal/55"
          />

          <div className="flex flex-1 flex-col justify-end gap-10 p-6 sm:p-8 md:justify-between">
            <header>
              <p className="flex items-center gap-3 text-xs font-bold tracking-[0.2em] text-cream uppercase">
                <span aria-hidden="true" className="h-0.5 w-8 rounded-full bg-ember" />
                Reservations
              </p>
              <h1
                id="reserve-title"
                className="mt-3 text-5xl leading-[0.85] font-black tracking-tighter text-balance uppercase sm:text-6xl lg:text-7xl"
              >
                Book a table
              </h1>
              <p className="mt-4 max-w-md text-sm text-pretty text-cream/85 sm:text-base">
                Weekday lunch, wood-fired dinners and weekend brunch at {siteConfig.address.street}. Pick a time and
                we&apos;ll have your table ready.
              </p>
            </header>

            <ReserveInfo tone="dark" className="hidden md:block" />
          </div>
        </section>

        <div className="min-w-0">
          <CallToOrder action="book a table" />
        </div>

        <ReserveInfo tone="light" className="md:hidden" />
      </div>
    </main>
  );
}
