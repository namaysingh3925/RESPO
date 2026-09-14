import type { LucideIcon } from "lucide-react";
import { CalendarDays, Clock, Phone, Users } from "lucide-react";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";
import { groupWeeklyHours, TABLE_HOLD_MINUTES } from "@/components/reserve/reserve-utils";

const {
  minPartySize,
  maxPartySize,
  bookingWindowDays,
  minLeadMinutes,
  lastSeatingMinutesBeforeClose,
  largePartyMessage,
} = siteConfig.reservations;

/** 60 → "1 hour", 120 → "2 hours", 75 → "75 minutes" */
function durationLabel(minutes: number): string {
  if (minutes % 60 !== 0) return `${minutes} minutes`;
  const hours = minutes / 60;
  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
}

const POLICIES: Array<{ icon: LucideIcon; title: string; body: string }> = [
  {
    icon: Clock,
    title: `Tables are held for ${TABLE_HOLD_MINUTES} minutes`,
    body: "Running late? Call us and let us know you're on the way.",
  },
  {
    icon: Users,
    title: `Book online for ${minPartySize}–${maxPartySize} guests`,
    body: largePartyMessage,
  },
  {
    icon: CalendarDays,
    title: `Open for bookings ${bookingWindowDays} days ahead`,
    body: `Same-day tables need ${durationLabel(minLeadMinutes)}'s notice. Last seating is ${durationLabel(lastSeatingMinutesBeforeClose)} before close.`,
  },
];

interface ReserveInfoProps {
  /** "dark" sits on the photo panel (md+); "light" is a standalone card below the form on mobile. */
  tone: "dark" | "light";
  className?: string;
}

/** Weekly hours and booking policies for /reserve. */
export function ReserveInfo({ tone, className }: ReserveInfoProps) {
  const dark = tone === "dark";
  const hoursHeadingId = `reserve-hours-${tone}`;
  const policiesHeadingId = `reserve-policies-${tone}`;
  const eyebrow = cn("text-xs font-bold tracking-[0.2em] uppercase", dark ? "text-cream/70" : "text-muted-foreground");
  const muted = dark ? "text-cream/75" : "text-muted-foreground";

  return (
    <div
      className={cn(
        "space-y-6",
        dark ? "text-cream" : "rounded-3xl border border-border bg-card p-5 text-card-foreground sm:p-8",
        className,
      )}
    >
      <section aria-labelledby={hoursHeadingId}>
        <h2 id={hoursHeadingId} className={eyebrow}>
          Opening hours
        </h2>
        <dl className="mt-3 text-sm">
          {groupWeeklyHours().map((group) => (
            <div
              key={group.label}
              className={cn(
                "flex items-baseline justify-between gap-4 border-b border-dashed py-1.5 last:border-b-0",
                dark ? "border-cream/15" : "border-border",
              )}
            >
              <dt className="font-semibold">{group.label}</dt>
              <dd className={cn("text-right tabular-nums", muted)}>{group.hours}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby={policiesHeadingId}>
        <h2 id={policiesHeadingId} className={eyebrow}>
          Good to know
        </h2>
        <ul className="mt-3 space-y-3">
          {POLICIES.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-3">
              <span
                aria-hidden="true"
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-full",
                  dark ? "bg-ember text-charcoal" : "bg-accent text-ember-dark",
                )}
              >
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 text-sm">
                <p className="font-semibold">{title}</p>
                <p className={cn("mt-0.5 text-pretty", muted)}>{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <a
        href={siteConfig.phoneHref}
        className={cn(
          "inline-flex min-h-11 items-center gap-2 rounded-full text-sm font-semibold underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
          dark ? "text-cream" : "text-foreground",
        )}
      >
        <Phone className="size-4 text-ember" aria-hidden="true" />
        <span>
          <span className={muted}>Questions? Call </span>
          {siteConfig.phone}
        </span>
      </a>
    </div>
  );
}
