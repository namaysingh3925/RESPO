import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, MapPin, Phone, ShoppingBag } from "lucide-react";
import { SignatureShowcase } from "@/components/home/signature-showcase";
import {
  DISPLAY,
  Divider,
  Eyebrow,
  HEADER_CLEARANCE,
  LEAD,
  Pillars,
  type Pillar,
} from "@/components/home/story-type";
import { RestaurantJsonLd } from "@/components/seo/restaurant-json-ld";
import { OpenStatus } from "@/components/site/open-status";
import { TodayHours } from "@/components/site/today-hours";
import { Button } from "@/components/ui/button";
import FlowArt, { FlowSection } from "@/components/ui/story-scroll";
import { PHOTOS, unsplash } from "@/lib/data/menu";
import { directionsUrl, siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const { address } = siteConfig;

const STORY_FACTS: Pillar[] = [
  {
    title: "900°F oven",
    body: "Our oak-fired oven blisters a pizza in about ninety seconds and never really cools down.",
  },
  {
    title: "12-hour brisket",
    body: "Brisket smokes low and slow overnight, so it's ready to stack by lunch.",
  },
  {
    title: "Baked daily",
    body: "Buns, pizza dough and every dessert are made in-house, every morning.",
  },
];

const KITCHEN_PILLARS: Pillar[] = [
  {
    title: "Local farms",
    body: "Produce, dairy and meat come from growers we know, and the menu shifts when the seasons do.",
  },
  {
    title: "Live fire",
    body: "Oak and cherry wood feed the oven and the grill. Everything picks up a little char and a lot of flavour.",
  },
  {
    title: "Baked in-house",
    body: "Potato buns, sourdough crusts and pastry are mixed, proofed and baked right here before we open.",
  },
];

/** Ember/charcoal/cream/forest sections; inline styles because FlowSection applies `style` to its inner panel. */
const SECTION = {
  hero: { backgroundColor: "#0c0a09", color: "#fff", paddingTop: HEADER_CLEARANCE },
  story: { backgroundColor: "#fd5200", color: "#fff", paddingTop: HEADER_CLEARANCE },
  kitchen: { backgroundColor: "#0c0a09", color: "#fff", paddingTop: HEADER_CLEARANCE },
  cooking: { backgroundColor: "#F5F0E8", color: "#000", paddingTop: HEADER_CLEARANCE },
  visit: { backgroundColor: "#1f3a2e", color: "#fff", paddingTop: HEADER_CLEARANCE },
} as const;

const CTA = "h-12 rounded-full px-6 text-base font-semibold";
const CTA_EMBER = `${CTA} bg-ember text-white hover:bg-ember-dark`;
const CTA_GHOST = `${CTA} border-white/35 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 hover:text-white`;

export default function HomePage() {
  return (
    <>
      <RestaurantJsonLd />
      <FlowArt aria-label={`${siteConfig.name} story`}>
        {/* 00 — Hero */}
        <FlowSection aria-label="Welcome" style={SECTION.hero}>
          <div aria-hidden="true" className="absolute inset-0">
            <Image
              src={unsplash(PHOTOS.diningRoom, 2400)}
              alt=""
              fill
              preload
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/55 to-black/65" />
          </div>

          <div
            id="main"
            tabIndex={-1}
            className="relative flex flex-1 flex-col gap-6 pb-24 outline-none md:pb-0"
          >
            <Eyebrow>00 — Wood-fired in {address.city}</Eyebrow>
            <Divider className="border-white/40" />
            <h1 className="mt-auto text-[clamp(2.75rem,11vw,12rem)] leading-[0.85] font-black tracking-tight uppercase">
              Wood-fired
              <br />
              comfort
              <br />
              food
            </h1>
            <Divider className="border-white/40" />
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="flex flex-col gap-2">
                <p className="max-w-[40ch] text-[clamp(1.05rem,1.8vw,1.5rem)] leading-snug font-medium text-white/90">
                  Smash burgers, blistered pizza and weekend brunch on {address.street},{" "}
                  {address.city}.
                </p>
                <OpenStatus className="text-white" />
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild className={CTA_EMBER}>
                  <Link href="/menu">
                    <ShoppingBag aria-hidden="true" />
                    Order online
                  </Link>
                </Button>
                <Button asChild variant="outline" className={CTA_GHOST}>
                  <Link href="/reserve">
                    <CalendarDays aria-hidden="true" />
                    Book a table
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </FlowSection>

        {/* 01 — Our story */}
        <FlowSection aria-label="Our story" style={SECTION.story}>
          <Eyebrow className="text-charcoal">01 — Our story</Eyebrow>
          <Divider className="border-black/25" />
          <h2 className={DISPLAY}>
            Born
            <br />
            from
            <br />
            fire
          </h2>
          <Divider className="border-black/25" />
          {/* Bold, large copy keeps white-on-ember legible (WCAG large-text contrast). */}
          <p className={`${LEAD} font-bold`}>
            {siteConfig.name} started with a secondhand wood oven and one rule: if it tastes better
            over live fire, it gets cooked over live fire. Burgers, pizza, brunch, even dessert —
            it all passes through the flames before it reaches your table.
          </p>
          <Divider className="border-black/25" />
          <Pillars
            aria-label="Kitchen facts"
            items={STORY_FACTS}
            titleClassName="text-[clamp(1.5rem,3vw,2.5rem)] leading-none font-black tracking-tight"
            bodyClassName="font-medium text-charcoal"
          />
        </FlowSection>

        {/* 02 — The kitchen */}
        <FlowSection aria-label="The kitchen" style={SECTION.kitchen}>
          <Eyebrow>02 — The kitchen</Eyebrow>
          <Divider className="border-white/30" />
          <div className="grid gap-8 md:grid-cols-12 md:items-end">
            <div className="flex flex-col gap-6 md:col-span-5">
              <h2 className={DISPLAY}>
                Made
                <br />
                by
                <br />
                hand
              </h2>
              <p className={`${LEAD} text-white/80 md:text-[clamp(1rem,1.6vw,1.5rem)]`}>
                No heat lamps, no shortcuts. Every plate is fired, sliced and finished by the cooks
                you can watch from the dining room.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:col-span-7 md:gap-6">
              <figure className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-white/5">
                <Image
                  src={unsplash(PHOTOS.chefPlating, 1200)}
                  alt="A chef finishing a plate on the pass"
                  fill
                  sizes="(min-width: 768px) 28vw, 46vw"
                  className="object-cover"
                />
              </figure>
              <figure className="relative mt-10 aspect-[3/4] overflow-hidden rounded-2xl bg-white/5 md:mt-16">
                <Image
                  src={unsplash(PHOTOS.openKitchen, 1200)}
                  alt="Cooks at work in the open kitchen"
                  fill
                  sizes="(min-width: 768px) 28vw, 46vw"
                  className="object-cover"
                />
              </figure>
            </div>
          </div>
          <Divider className="border-white/30" />
          <Pillars aria-label="How we cook" items={KITCHEN_PILLARS} bodyClassName="text-white/75" />
        </FlowSection>

        {/* 03 — What we're cooking */}
        <FlowSection aria-label="What we're cooking" style={SECTION.cooking}>
          <Eyebrow>03 — What we&apos;re cooking</Eyebrow>
          <Divider className="border-black/20" />
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <h2 className="text-[clamp(2.5rem,7vw,6.5rem)] leading-[0.85] font-black tracking-tight uppercase">
              Fresh off
              <br />
              the fire
            </h2>
            <p className="max-w-[42ch] text-[clamp(1rem,1.5vw,1.25rem)] leading-relaxed text-black/75">
              Seven things we&apos;re proudest of right now. Tap a dish to see it, then order it
              for pickup or delivery.
            </p>
          </div>
          <Divider className="border-black/20" />
          <SignatureShowcase />
        </FlowSection>

        {/* 04 — Come hungry */}
        <FlowSection aria-label="Come hungry" style={SECTION.visit}>
          <Eyebrow>04 — Come hungry</Eyebrow>
          <Divider className="border-white/30" />
          <h2 className={DISPLAY}>
            Pull
            <br />
            up a
            <br />
            chair
          </h2>
          <Divider className="border-white/30" />
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-2">
              <TodayHours labelClassName="text-white/65" hoursClassName="text-2xl font-bold" />
              <OpenStatus className="text-white/90" />
              <Link
                href="/visit"
                className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-md font-semibold underline decoration-white/40 underline-offset-4 outline-none hover:decoration-white focus-visible:ring-2 focus-visible:ring-white"
              >
                All hours &amp; FAQs
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              <Eyebrow className="text-white/65">Find us</Eyebrow>
              <address className="text-2xl leading-snug font-bold not-italic">
                {address.street}
                <br />
                {address.city}, {address.region} {address.postalCode}
              </address>
            </div>
            <div className="flex flex-col gap-2">
              <Eyebrow className="text-white/65">Call ahead</Eyebrow>
              <p className="text-2xl font-bold tabular-nums">{siteConfig.phone}</p>
              <p className="max-w-[36ch] text-base text-white/75">
                {siteConfig.reservations.largePartyMessage}
              </p>
            </div>
          </div>
          <Divider className="border-white/30" />
          <div className="flex flex-wrap gap-3 pb-24 md:pb-0">
            <Button asChild className={CTA_EMBER}>
              <Link href="/reserve">
                <CalendarDays aria-hidden="true" />
                Reserve a table
              </Link>
            </Button>
            <Button asChild variant="outline" className={CTA_GHOST}>
              <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
                <MapPin aria-hidden="true" />
                Directions
                <ArrowUpRight aria-hidden="true" />
                <span className="sr-only"> (opens Google Maps in a new tab)</span>
              </a>
            </Button>
            <Button asChild variant="outline" className={CTA_GHOST}>
              <a href={siteConfig.phoneHref}>
                <Phone aria-hidden="true" />
                Call <span className="sr-only">{siteConfig.phone}</span>
              </a>
            </Button>
          </div>
        </FlowSection>
      </FlowArt>
    </>
  );
}
