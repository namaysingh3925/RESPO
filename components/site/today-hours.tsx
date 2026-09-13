"use client";

import { cn } from "@/lib/utils";
import { formatHoursRange, hoursForDay } from "@/components/site/hours";
import { useRestaurantClock } from "@/components/site/use-restaurant-clock";

interface TodayHoursProps {
  className?: string;
  /** Classes for the "Today · Monday" line. */
  labelClassName?: string;
  /** Classes for the "11:30 AM – 10:00 PM" line. */
  hoursClassName?: string;
}

/** Today's opening hours in the restaurant's time zone, computed after mount to avoid hydration mismatches. */
export function TodayHours({ className, labelClassName, hoursClassName }: TodayHoursProps) {
  const clock = useRestaurantClock();
  const today = clock ? hoursForDay(clock.weekday) : undefined;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <p className={cn("text-xs font-bold uppercase tracking-[0.2em]", labelClassName)}>
        {today ? `Today · ${today.label}` : "Today"}
      </p>
      {clock ? (
        <p className={cn("text-lg font-semibold", hoursClassName)}>{formatHoursRange(today)}</p>
      ) : (
        <p className={cn("text-lg font-semibold", hoursClassName)}>
          <span className="sr-only">Loading today&apos;s hours</span>
          <span
            aria-hidden="true"
            className="my-1.5 block h-4 w-48 rounded-full bg-current/20 motion-safe:animate-pulse"
          />
        </p>
      )}
    </div>
  );
}
