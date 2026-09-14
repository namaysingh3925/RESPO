"use client";

import { useEffect, useId, useRef } from "react";
import { CalendarPlus, Check, Copy, Navigation, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { prefersReducedMotion } from "@/hooks/use-media-query";
import { formatDateLabel, formatTime } from "@/lib/format";
import { directionsUrl, fullAddress, siteConfig } from "@/lib/site-config";
import type { ReservationDTO } from "@/lib/types";
import { cn } from "@/lib/utils";
import { downloadReservationIcs } from "@/components/reserve/ics";
import { firstName, guestsLabel, TABLE_HOLD_MINUTES } from "@/components/reserve/reserve-utils";

const termClass = "text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase";

interface ReservationConfirmationProps {
  reservation: ReservationDTO;
  /** Returns to an empty booking form. */
  onReset: () => void;
}

/** Shown in place of the booking form once a table is confirmed. Takes focus on mount. */
export function ReservationConfirmation({ reservation, onReset }: ReservationConfirmationProps) {
  const headingId = useId();
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const { code, name, date, time, partySize, occasion, notes } = reservation;
  const guest = firstName(name);
  const when = `${formatDateLabel(date)} · ${formatTime(time)}`;

  useEffect(() => {
    sectionRef.current?.scrollIntoView({ block: "start", behavior: prefersReducedMotion() ? "auto" : "smooth" });
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Confirmation code copied");
    } catch {
      toast.error("Couldn't copy the code", { description: `Your code is ${code}.` });
    }
  }

  function addToCalendar() {
    try {
      downloadReservationIcs(reservation);
    } catch {
      toast.error("Couldn't create the calendar file", {
        description: `Add it by hand: ${when}, ${siteConfig.name}.`,
      });
    }
  }

  return (
    <section ref={sectionRef} aria-labelledby={headingId} className="scroll-mt-24">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="grid size-12 shrink-0 place-items-center rounded-full bg-forest text-cream shadow-sm"
        >
          <Check className="size-6" strokeWidth={3} />
        </span>
        <p className="text-xs font-bold tracking-[0.2em] text-forest uppercase">Reservation confirmed</p>
      </div>

      <h2
        ref={headingRef}
        id={headingId}
        tabIndex={-1}
        className="mt-5 text-3xl leading-[0.95] font-black tracking-tight text-balance text-charcoal focus:outline-none sm:text-4xl"
      >
        {guest ? `You're booked, ${guest}` : "You're booked"}
      </h2>
      <p className="mt-3 max-w-prose text-base text-pretty text-muted-foreground">
        Your table at {siteConfig.name} is confirmed. Keep your confirmation code handy — we&apos;ll ask for it if
        you call about your booking.
      </p>

      <dl className="mt-6 grid overflow-hidden rounded-2xl border border-border bg-paper sm:grid-cols-2">
        <div className="border-b border-border p-4 sm:col-span-2 sm:px-5">
          <dt className={termClass}>Confirmation code</dt>
          <dd className="mt-1 flex flex-wrap items-center justify-between gap-3">
            <span className="font-mono text-2xl font-bold tracking-wider text-charcoal">{code}</span>
            <Button type="button" variant="outline" onClick={copyCode} className="h-11 rounded-full px-4">
              <Copy aria-hidden="true" />
              Copy<span className="sr-only"> confirmation code</span>
            </Button>
          </dd>
        </div>
        <div className="border-b border-border p-4 sm:col-span-2 sm:px-5">
          <dt className={termClass}>When</dt>
          <dd className="mt-1 text-base font-semibold">{when}</dd>
        </div>
        <div className={cn("border-b border-border p-4 sm:px-5", !occasion && "sm:col-span-2")}>
          <dt className={termClass}>Party</dt>
          <dd className="mt-1 text-base font-semibold">{guestsLabel(partySize)}</dd>
        </div>
        {occasion ? (
          <div className="border-b border-border p-4 sm:border-l sm:px-5">
            <dt className={termClass}>Occasion</dt>
            <dd className="mt-1 text-base font-semibold">{occasion}</dd>
          </div>
        ) : null}
        <div className="p-4 sm:col-span-2 sm:px-5">
          <dt className={termClass}>Where</dt>
          <dd className="mt-1 text-base">
            <span className="font-semibold">{siteConfig.name}</span>
            <span className="block text-muted-foreground">{fullAddress}</span>
          </dd>
        </div>
      </dl>

      <h3 className="mt-8 text-lg font-bold">What happens next</h3>
      <ul className="mt-3 space-y-3 text-sm text-pretty sm:text-base">
        <li className="flex gap-3">
          <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-ember" />
          <span>
            We&apos;ll hold your table for {TABLE_HOLD_MINUTES} minutes past {formatTime(time)}. Running late? Give us
            a ring and let us know.
          </span>
        </li>
        <li className="flex gap-3">
          <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-ember" />
          <span>
            Need to change or cancel? Call{" "}
            <a
              href={siteConfig.phoneHref}
              className="rounded-sm font-semibold whitespace-nowrap text-foreground underline underline-offset-4 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {siteConfig.phone}
            </a>{" "}
            with your code <span className="font-mono font-semibold">{code}</span>.
          </span>
        </li>
        {notes ? (
          <li className="flex gap-3">
            <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-ember" />
            <span>Your notes are saved with the booking, so the team will see them before you arrive.</span>
          </li>
        ) : null}
      </ul>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Button type="button" onClick={addToCalendar} className="h-12 rounded-full px-6 text-base">
          <CalendarPlus aria-hidden="true" />
          Add to calendar
        </Button>
        <Button asChild variant="outline" className="h-12 rounded-full px-6 text-base">
          <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
            <Navigation aria-hidden="true" />
            Directions
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </Button>
      </div>
      <Button
        type="button"
        variant="ghost"
        onClick={onReset}
        className="mt-3 h-12 w-full rounded-full px-6 text-base"
      >
        <RotateCcw aria-hidden="true" />
        Make another booking
      </Button>
    </section>
  );
}
