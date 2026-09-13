"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** Used in button labels, e.g. "Decrease Smash Double Burger". */
  label: string;
  size?: "sm" | "md";
  className?: string;
}

/** Pill-shaped −/+ control with 44px touch targets at size "md". */
export function QuantityStepper({
  value,
  onChange,
  min = 0,
  max = 20,
  label,
  size = "md",
  className,
}: QuantityStepperProps) {
  const btn = cn(
    "grid place-items-center rounded-full transition-colors hover:bg-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40",
    size === "md" ? "size-11" : "size-8",
  );
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-background",
        className,
      )}
    >
      <button
        type="button"
        className={btn}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={`Decrease ${label}`}
      >
        <Minus className="size-4" aria-hidden="true" />
      </button>
      <span
        className={cn("min-w-8 text-center font-semibold tabular-nums", size === "md" ? "text-base" : "text-sm")}
        aria-live="polite"
        aria-label={`${label} quantity`}
      >
        {value}
      </span>
      <button
        type="button"
        className={btn}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={`Increase ${label}`}
      >
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
