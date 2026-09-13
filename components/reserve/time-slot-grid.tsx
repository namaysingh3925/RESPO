"use client";

import { useId } from "react";
import { CalendarX2, CircleAlert, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateLabel } from "@/lib/format";
import type { AvailabilityDTO, TimeSlot } from "@/lib/types";
import { cn } from "@/lib/utils";
import { isLunchSlot } from "@/components/reserve/reserve-utils";

/** Show a scarcity hint when a bookable slot has fewer covers than this. */
const LOW_COVERS_THRESHOLD = 8;

export type TimeSlotGridState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; availability: AvailabilityDTO };

interface TimeSlotGridProps {
  state: TimeSlotGridState;
  selected: string | null;
  onSelect: (time: string) => void;
  onRetry: () => void;
  /** Error message id to reference from the slot buttons, when invalid. */
  errorId?: string;
  invalid?: boolean;
}

function isLow(slot: TimeSlot): boolean {
  return slot.available && slot.remainingCovers < LOW_COVERS_THRESHOLD;
}

export function TimeSlotGrid({ state, selected, onSelect, onRetry, errorId, invalid = false }: TimeSlotGridProps) {
  const baseId = useId();

  let announcement = "";
  let body: React.ReactNode;

  if (state.status === "loading") {
    announcement = "Checking available times…";
    body = (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-12 rounded-xl" />
        ))}
      </div>
    );
  } else if (state.status === "error") {
    announcement = state.message;
    body = (
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 text-sm text-destructive">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{state.message}</span>
        </p>
        <Button type="button" variant="outline" onClick={onRetry} className="h-11 shrink-0 rounded-full px-5">
          <RotateCw aria-hidden="true" />
          Retry
        </Button>
      </div>
    );
  } else {
    const { availability } = state;
    const available = availability.slots.filter((slot) => slot.available);
    const dayLabel = formatDateLabel(availability.date);

    if (!availability.isOpen || available.length === 0) {
      const closed = !availability.isOpen;
      const title = closed ? "We're closed that day" : "Fully booked — try another day";
      announcement = `${title}. ${dayLabel}.`;
      body = (
        <div className="flex items-start gap-3 rounded-2xl border border-dashed border-border bg-muted/40 p-4">
          <CalendarX2 className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="font-semibold">{title}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {closed
                ? "Pick another date above — we'd love to see you on a day we're cooking."
                : `There are no tables left for ${availability.partySize} on ${dayLabel}. Try a different date or party size.`}
            </p>
          </div>
        </div>
      );
    } else {
      announcement = `${available.length} ${available.length === 1 ? "time" : "times"} available on ${dayLabel}.`;
      const groups = [
        { key: "lunch", label: "Lunch", slots: availability.slots.filter((slot) => isLunchSlot(slot.time)) },
        { key: "dinner", label: "Dinner", slots: availability.slots.filter((slot) => !isLunchSlot(slot.time)) },
      ].filter((group) => group.slots.length > 0);
      const selectedSlot = availability.slots.find((slot) => slot.time === selected && slot.available);

      body = (
        <div className="space-y-5">
          {groups.map((group) => {
            const headingId = `${baseId}-${group.key}`;
            const openCount = group.slots.filter((slot) => slot.available).length;
            return (
              <div key={group.key} role="group" aria-labelledby={headingId}>
                <h3 id={headingId} className="mb-2 flex items-baseline gap-2 text-sm font-semibold">
                  {group.label}
                  <span className="text-xs font-normal text-muted-foreground">
                    {openCount === 0 ? "Fully booked" : `${openCount} available`}
                  </span>
                </h3>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {group.slots.map((slot) => {
                    const isSelected = slot.time === selected && slot.available;
                    const low = isLow(slot);
                    const status = !slot.available
                      ? "unavailable"
                      : low
                        ? `only ${slot.remainingCovers} ${slot.remainingCovers === 1 ? "seat" : "seats"} left`
                        : null;
                    return (
                      <button
                        key={slot.time}
                        type="button"
                        onClick={() => onSelect(slot.time)}
                        disabled={!slot.available}
                        aria-pressed={isSelected}
                        aria-label={status ? `${slot.label}, ${status}` : slot.label}
                        aria-describedby={invalid && errorId ? errorId : undefined}
                        className={cn(
                          "flex min-h-12 flex-col items-center justify-center rounded-xl border px-1 py-1.5 text-sm font-bold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                          isSelected
                            ? "border-ember bg-ember text-charcoal shadow-sm"
                            : "border-border bg-background hover:border-foreground/40",
                          !slot.available &&
                            "cursor-not-allowed bg-muted/40 font-medium text-muted-foreground line-through decoration-1",
                          invalid && !isSelected && slot.available && "border-destructive/60",
                        )}
                      >
                        <span>{slot.label}</span>
                        {low ? (
                          <span
                            className={cn(
                              "text-[0.65rem] leading-tight font-semibold",
                              isSelected ? "text-charcoal" : "text-ember-dark",
                            )}
                            aria-hidden="true"
                          >
                            {slot.remainingCovers} left
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {selectedSlot && isLow(selectedSlot) ? (
            <p className="text-sm font-medium text-ember-dark">
              Only {selectedSlot.remainingCovers} seats left at {selectedSlot.label} — book soon.
            </p>
          ) : null}
        </div>
      );
    }
  }

  return (
    <div className="mt-3">
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
      {body}
    </div>
  );
}
