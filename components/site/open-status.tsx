"use client";

import { cn } from "@/lib/utils";
import { getOpenStatus, type OpenState } from "@/components/site/hours";
import { useRestaurantClock } from "@/components/site/use-restaurant-clock";

const DOT: Record<OpenState, string> = {
  open: "bg-emerald-500",
  "closing-soon": "bg-amber-400",
  closed: "bg-current/50",
};

interface OpenStatusProps {
  className?: string;
}

/**
 * Live "Open now · until 10:00 PM" / "Closed · opens 11:30 AM tomorrow" label.
 * Computed on the client in the restaurant's time zone; renders a same-size placeholder until then.
 */
export function OpenStatus({ className }: OpenStatusProps) {
  const clock = useRestaurantClock();
  const status = clock ? getOpenStatus(clock) : null;

  return (
    <p
      aria-live="polite"
      className={cn("inline-flex min-h-8 items-center gap-2 text-sm font-semibold", className)}
    >
      {status ? (
        <>
          <span className="relative flex size-2.5 shrink-0" aria-hidden="true">
            {status.state === "open" && (
              <span className="absolute inline-flex size-full rounded-full bg-emerald-500 opacity-60 motion-safe:animate-ping" />
            )}
            <span className={cn("relative inline-flex size-2.5 rounded-full", DOT[status.state])} />
          </span>
          <span>{status.label}</span>
        </>
      ) : (
        <span
          aria-hidden="true"
          className="block h-3.5 w-44 rounded-full bg-current/20 motion-safe:animate-pulse"
        />
      )}
    </p>
  );
}
