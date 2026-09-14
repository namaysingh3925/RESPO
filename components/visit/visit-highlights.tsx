import type { LucideIcon } from "lucide-react";
import { Accessibility, Mail, PartyPopper, TrainFront } from "lucide-react";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";

const { maxPartySize } = siteConfig.reservations;

const EVENTS_MAILTO = `mailto:${siteConfig.email}?subject=${encodeURIComponent(`Private event at ${siteConfig.name}`)}`;

interface Highlight {
  icon: LucideIcon;
  title: string;
  body: string;
  cta?: { href: string; label: string };
}

const HIGHLIGHTS: Highlight[] = [
  {
    icon: TrainFront,
    title: "Parking & transit",
    body: `Street parking on ${siteConfig.address.street} and the surrounding blocks fills up fast on weekend evenings, so the metro is your friend: Indiranagar station is a short walk away. There's a bike rack out front.`,
  },
  {
    icon: Accessibility,
    title: "Accessibility",
    body: "Step-free entrance, an accessible restroom and tables with room to pull up a wheelchair. Add a note when you book and we'll have the right table ready.",
  },
  {
    icon: PartyPopper,
    title: "Private events",
    body: `Birthdays, team dinners, rehearsal dinners: groups larger than ${maxPartySize} gather at the long table, and we'll plan a menu around the wood oven with you. Tell us your date and headcount.`,
    cta: { href: EVENTS_MAILTO, label: "Email us about an event" },
  },
];

/** Parking & transit, accessibility and private events cards. */
export function VisitHighlights() {
  return (
    <section aria-labelledby="visit-plan" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <h2
        id="visit-plan"
        className="text-4xl leading-[0.9] font-black tracking-tighter text-charcoal uppercase sm:text-6xl"
      >
        Plan your visit
      </h2>
      <ul className="mt-6 grid gap-4 md:grid-cols-3 md:gap-6">
        {HIGHLIGHTS.map(({ icon: Icon, title, body, cta }) => (
          <li key={title} className="flex flex-col rounded-2xl border border-border bg-card p-5 sm:p-6">
            <span
              aria-hidden="true"
              className="grid size-12 place-items-center rounded-full bg-ember/10 text-ember"
            >
              <Icon className="size-6" />
            </span>
            <h3 className="mt-4 text-xl font-bold tracking-tight">{title}</h3>
            <p className="mt-2 flex-1 text-base leading-relaxed text-muted-foreground">{body}</p>
            {cta && (
              <Button
                asChild
                variant="outline"
                className="mt-5 h-12 self-start rounded-full px-6 text-base font-semibold"
              >
                <a href={cta.href}>
                  <Mail aria-hidden="true" />
                  {cta.label}
                </a>
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
