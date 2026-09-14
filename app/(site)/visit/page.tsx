import type { Metadata } from "next";
import Image from "next/image";
import { RestaurantJsonLd } from "@/components/seo/restaurant-json-ld";
import { OpenStatus } from "@/components/site/open-status";
import { ContactCard } from "@/components/visit/contact-card";
import { HoursTable } from "@/components/visit/hours-table";
import { MapEmbed } from "@/components/visit/map-embed";
import { VisitFaq } from "@/components/visit/visit-faq";
import { VisitHighlights } from "@/components/visit/visit-highlights";
import { PHOTOS, seedCategories, unsplash } from "@/lib/data/menu";
import { fullAddress, siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Visit us",
  description: `Find ${siteConfig.name} at ${fullAddress}. Opening hours, directions, parking, accessibility and answers to common questions.`,
  alternates: { canonical: "/visit" },
};

const brunchHours = seedCategories.find((category) => category.slug === "brunch")?.description;

export default function VisitPage() {
  const { address, reservations } = siteConfig;

  return (
    <main id="main" tabIndex={-1} className="flex-1 pt-16 pb-16 outline-none sm:pb-24">
      <RestaurantJsonLd />

      <header className="mx-auto max-w-7xl px-4 pt-10 pb-8 sm:px-6 sm:pt-14 sm:pb-10 lg:px-8 lg:pt-20">
        <p className="flex items-center gap-3 text-xs font-bold tracking-[0.2em] text-foreground uppercase">
          <span aria-hidden="true" className="h-0.5 w-8 rounded-full bg-ember" />
          {address.city}, {address.region}
        </p>
        <h1 className="mt-4 text-6xl leading-[0.85] font-black tracking-tighter text-charcoal uppercase sm:text-8xl lg:text-9xl">
          Visit us
        </h1>
        <p className="mt-5 max-w-xl text-base text-pretty text-muted-foreground sm:text-lg">
          Follow the smell of wood smoke to {address.street}. Here&apos;s everything you need before
          you come: hours, directions, getting here and the questions we hear most.
        </p>
        <OpenStatus className="mt-4 text-charcoal" />
      </header>

      <section
        aria-label="Location, contact and hours"
        className="mx-auto grid max-w-7xl gap-4 px-4 sm:px-6 md:gap-6 lg:grid-cols-12 lg:px-8"
      >
        <MapEmbed className="lg:col-span-7" />
        <div className="flex flex-col gap-4 md:gap-6 lg:col-span-5">
          <ContactCard />
          <HoursTable>
            {brunchHours && <p>Weekend brunch: {brunchHours}</p>}
            <p>Last seating is {reservations.lastSeatingMinutesBeforeClose} minutes before close.</p>
          </HoursTable>
        </div>
      </section>

      <div className="mt-16 sm:mt-24">
        <VisitHighlights />
      </div>

      <div className="mx-auto mt-16 grid max-w-7xl gap-8 px-4 sm:mt-24 sm:px-6 lg:grid-cols-12 lg:items-start lg:gap-12 lg:px-8">
        <VisitFaq className="lg:col-span-7" />
        <figure className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted sm:aspect-[16/10] lg:sticky lg:top-24 lg:col-span-5 lg:aspect-[4/5]">
          <Image
            src={unsplash(PHOTOS.terrace, 1400)}
            alt={`Outdoor tables at ${siteConfig.name}`}
            fill
            sizes="(min-width: 1280px) 500px, (min-width: 1024px) 40vw, 100vw"
            className="object-cover"
          />
          <figcaption className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/75 to-transparent px-5 pt-16 pb-5 text-lg font-bold text-white">
            See you soon at {address.street}.
          </figcaption>
        </figure>
      </div>
    </main>
  );
}
