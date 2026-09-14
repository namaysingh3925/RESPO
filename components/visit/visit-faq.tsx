import type { ReactNode } from "react";
import Link from "next/link";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DIETARY_LABELS, DIETARY_TAGS } from "@/lib/constants";
import { formatPrice } from "@/lib/format";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

const { reservations, ordering } = siteConfig;

/** 60 → "an hour", 90 → "90 minutes". */
function minutesPhrase(minutes: number): string {
  if (minutes === 60) return "an hour";
  if (minutes % 60 === 0) return `${minutes / 60} hours`;
  return `${minutes} minutes`;
}

/** "Vegetarian, Vegan, Gluten-free, Dairy-free, Spicy, or Contains nuts" */
const dietaryList = new Intl.ListFormat(siteConfig.locale, { style: "long", type: "disjunction" }).format(
  DIETARY_TAGS.map((tag) => DIETARY_LABELS[tag]),
);

const FAQS: Array<{ id: string; question: string; answer: ReactNode }> = [
  {
    id: "reservations",
    question: "Do I need a reservation?",
    answer: (
      <>
        <p>
          Walk-ins are welcome whenever we have room, but tables go quickly on Friday and Saturday
          nights. You can <Link href="/reserve">book online</Link> up to {reservations.bookingWindowDays}{" "}
          days ahead. Same-day bookings need to be made at least{" "}
          {minutesPhrase(reservations.minLeadMinutes)} in advance, and the last seating is{" "}
          {reservations.lastSeatingMinutesBeforeClose} minutes before close.
        </p>
        <p>
          Running late or can&apos;t make it? Call us on{" "}
          <a href={siteConfig.phoneHref}>{siteConfig.phone}</a> so we can offer the table to someone
          else.
        </p>
      </>
    ),
  },
  {
    id: "large-parties",
    question: "Can you seat a large group?",
    answer: (
      <p>
        Online booking covers parties of {reservations.minPartySize} to {reservations.maxPartySize}.{" "}
        {reservations.largePartyMessage} You can also email{" "}
        <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a> with your date and headcount.
      </p>
    ),
  },
  {
    id: "allergens",
    question: "How do you handle allergies and dietary needs?",
    answer: (
      <p>
        Dishes on the <Link href="/menu">menu</Link> are tagged {dietaryList} where it applies, and
        you can filter the menu by those tags. Our kitchen handles nuts, gluten and dairy, so we
        can&apos;t promise a dish is free of traces. Tell your server, or add a note to your order,
        and the kitchen will walk you through your options.
      </p>
    ),
  },
  {
    id: "delivery",
    question: "How far do you deliver?",
    answer: (
      <p>
        We deliver within {ordering.deliveryRadiusMiles} miles of the restaurant. Delivery orders
        start at {formatPrice(ordering.minimumDeliverySubtotalCents)}, the delivery fee is{" "}
        {formatPrice(ordering.deliveryFeeCents)}, and it&apos;s free on orders over{" "}
        {formatPrice(ordering.freeDeliveryThresholdCents)}. Allow about {ordering.deliveryLeadMinutes}{" "}
        minutes for delivery, or about {ordering.pickupLeadMinutes} minutes for pickup.{" "}
        <Link href="/menu">Start an order</Link>.
      </p>
    ),
  },
  {
    id: "cocktails",
    question: "Can I order cocktails for pickup or delivery?",
    answer: (
      <p>
        Not at the moment. Our smoked cocktails and the rest of the bar list are dine-in only, so
        they&apos;re one more reason to <Link href="/reserve">grab a table</Link>. Lemonade,
        milkshakes and coffee travel just fine.
      </p>
    ),
  },
];

/** Visit-page FAQ: reservations, large parties, allergens, delivery radius and dine-in-only cocktails. */
export function VisitFaq({ className }: { className?: string }) {
  return (
    <section aria-labelledby="visit-faq" className={className}>
      <h2
        id="visit-faq"
        className="text-4xl leading-[0.9] font-black tracking-tighter text-charcoal uppercase sm:text-6xl"
      >
        Good to know
      </h2>
      <Accordion type="single" collapsible className="mt-6 rounded-2xl border border-border bg-card px-5 sm:px-6">
        {FAQS.map((faq) => (
          <AccordionItem key={faq.id} value={faq.id}>
            <AccordionTrigger
              className={cn(
                "min-h-14 items-center py-4 text-base font-semibold hover:no-underline sm:text-lg",
                "focus-visible:ring-offset-2 **:data-[slot=accordion-trigger-icon]:size-5",
              )}
            >
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="pb-5 text-base leading-relaxed text-muted-foreground [&_a]:font-semibold [&_a]:text-foreground">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
