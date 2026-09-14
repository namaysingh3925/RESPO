"use client";

import type { ReactNode } from "react";
import { formatHoursRange, WEEKLY_HOURS } from "@/components/site/hours";
import { useRestaurantClock } from "@/hooks/use-restaurant-clock";
import { cn } from "@/lib/utils";

interface HoursTableProps {
  className?: string;
  /** Extra notes under the table (brunch hours, last seating …). */
  children?: ReactNode;
}

/** Weekly opening hours; today's row is highlighted once the restaurant clock is known on the client. */
export function HoursTable({ className, children }: HoursTableProps) {
  const clock = useRestaurantClock();
  const todayLabel = clock ? WEEKLY_HOURS.find((day) => day.day === clock.weekday)?.label : undefined;

  return (
    <section
      aria-labelledby="visit-hours"
      className={cn("rounded-2xl border border-border bg-card p-5 sm:p-6", className)}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="visit-hours" className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">
          Opening hours
        </h2>
        <p className="text-xs text-muted-foreground">Indian Standard Time</p>
      </div>

      <table className="mt-3 w-full border-separate border-spacing-0 text-base">
        <caption className="sr-only">
          Opening hours by day{todayLabel ? `. Today is ${todayLabel}.` : ""}
        </caption>
        <thead className="sr-only">
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Hours</th>
          </tr>
        </thead>
        <tbody>
          {WEEKLY_HOURS.map((day) => {
            const isToday = day.label === todayLabel;
            const cell = cn("py-3 transition-colors", isToday ? "bg-ember/10" : "border-b border-border [tr:last-child>&]:border-b-0");
            return (
              <tr key={day.day} aria-current={isToday ? "date" : undefined}>
                <th
                  scope="row"
                  className={cn(cell, "pl-3 text-left", isToday ? "rounded-l-xl font-bold" : "font-medium")}
                >
                  <span className="inline-flex flex-wrap items-center gap-2">
                    {day.label}
                    {isToday && (
                      <span className="rounded-full bg-charcoal px-2 py-0.5 text-[11px] leading-4 font-bold tracking-wider text-white uppercase">
                        Today
                      </span>
                    )}
                  </span>
                </th>
                <td
                  className={cn(
                    cell,
                    "pr-3 text-right tabular-nums",
                    isToday ? "rounded-r-xl font-bold text-charcoal" : "text-muted-foreground",
                  )}
                >
                  {formatHoursRange(day)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {children && <div className="mt-4 space-y-1 text-sm text-muted-foreground">{children}</div>}
    </section>
  );
}
