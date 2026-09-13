"use client";

import { useEffect, useRef, useState, type Ref } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DATE_STRIP_DAYS, isDateInRange, type DayOption } from "@/components/reserve/reserve-utils";

interface DateStripProps {
  /** null until mounted — renders a skeleton strip on the server. */
  days: DayOption[] | null;
  selected: string | null;
  onSelect: (date: string) => void;
  /** Restaurant-local today / last bookable day, for the native picker. */
  minDate: string | null;
  maxDate: string | null;
  /** Id used for the native "Other date" input. */
  inputId: string;
  /** Error message id to reference from the controls, when invalid. */
  errorId?: string;
  invalid?: boolean;
  /** Wraps the day buttons; used by the form to focus the strip. */
  ref?: Ref<HTMLDivElement>;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Horizontally scrollable 14-day strip plus a native date picker for anything further out. */
export function DateStrip({
  days,
  selected,
  onSelect,
  minDate,
  maxDate,
  inputId,
  errorId,
  invalid = false,
  ref,
}: DateStripProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  /** What the user has typed into the native picker when it isn't a bookable date yet. */
  const [draft, setDraft] = useState<string | null>(null);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const rangeErrorId = `${inputId}-range`;

  // Keep the selected day visible when it changes (e.g. picked from the native input).
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !selected) return;
    const button = scroller.querySelector<HTMLElement>(`[data-date="${selected}"]`);
    if (!button) return;
    const padding = 16;
    const start = button.offsetLeft - padding;
    const end = button.offsetLeft + button.offsetWidth + padding - scroller.clientWidth;
    let left: number | null = null;
    if (start < scroller.scrollLeft) left = Math.max(0, start);
    else if (end > scroller.scrollLeft) left = end;
    if (left !== null) scroller.scrollTo({ left, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [selected, days]);

  function scrollByPage(direction: 1 | -1) {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollBy({
      left: direction * scroller.clientWidth * 0.8,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }

  function handleNativeChange(value: string) {
    if (!value) {
      setDraft("");
      setRangeError(null);
      return;
    }
    if (minDate && maxDate && isDateInRange(value, minDate, maxDate)) {
      setDraft(null);
      setRangeError(null);
      onSelect(value);
      return;
    }
    setDraft(value);
    setRangeError(
      maxDate
        ? `Choose a date between today and ${formatDateLabel(maxDate, { weekday: undefined })}.`
        : "Choose a date from today onwards.",
    );
  }

  const describedBy = [rangeError ? rangeErrorId : null, invalid && errorId ? errorId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-base font-semibold" aria-hidden="true">
          {selected ? formatDateLabel(selected) : " "}
        </p>
        <div className="hidden shrink-0 items-center gap-1 sm:flex">
          <button
            type="button"
            onClick={() => scrollByPage(-1)}
            className="grid size-11 place-items-center rounded-full border border-border bg-background transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            aria-label="Show earlier dates"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => scrollByPage(1)}
            className="grid size-11 place-items-center rounded-full border border-border bg-background transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            aria-label="Show later dates"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div ref={ref}>
        <div
          ref={scrollerRef}
          className="relative -mx-5 flex snap-x snap-mandatory scroll-px-5 gap-2 overflow-x-auto px-5 pt-1 pb-3 [scrollbar-width:thin] sm:-mx-8 sm:scroll-px-8 sm:px-8"
        >
          {days
            ? days.map((day) => {
                const isSelected = day.date === selected;
                return (
                  <button
                    key={day.date}
                    type="button"
                    data-date={day.date}
                    onClick={() => onSelect(day.date)}
                    disabled={day.isClosed}
                    aria-pressed={isSelected}
                    aria-label={day.ariaLabel}
                    aria-describedby={invalid && errorId ? errorId : undefined}
                    className={cn(
                      "flex h-21 w-18 shrink-0 snap-start flex-col items-center justify-center gap-0.5 rounded-2xl border text-center transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                      isSelected
                        ? "border-ember bg-ember text-charcoal shadow-sm"
                        : "border-border bg-background hover:border-foreground/40",
                      day.isClosed && "cursor-not-allowed border-dashed bg-muted/40 text-muted-foreground",
                      invalid && !isSelected && "border-destructive/60",
                    )}
                  >
                    <span className="text-[0.65rem] font-bold tracking-wider uppercase">{day.topLabel}</span>
                    <span className="text-2xl leading-none font-black tabular-nums">{day.dayOfMonth}</span>
                    <span className={cn("text-xs", isSelected ? "font-semibold" : "text-muted-foreground")}>
                      {day.isClosed ? "Closed" : day.month}
                    </span>
                  </button>
                );
              })
            : Array.from({ length: DATE_STRIP_DAYS }, (_, index) => (
                <Skeleton
                  key={index}
                  className="h-21 w-18 shrink-0 rounded-2xl"
                  aria-hidden="true"
                />
              ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={inputId}>Other date</Label>
        <Input
          id={inputId}
          type="date"
          value={draft ?? selected ?? ""}
          min={minDate ?? undefined}
          max={maxDate ?? undefined}
          disabled={!minDate}
          onChange={(event) => handleNativeChange(event.target.value)}
          aria-invalid={Boolean(rangeError) || invalid || undefined}
          aria-describedby={describedBy || undefined}
          className="h-11 rounded-xl bg-background px-3.5 sm:max-w-xs"
        />
        {rangeError ? (
          <p id={rangeErrorId} className="text-sm text-destructive">
            {rangeError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
