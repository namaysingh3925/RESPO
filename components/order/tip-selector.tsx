"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatPrice } from "@/lib/format";
import { tipFromRate } from "@/lib/pricing";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

interface TipSelectorProps {
  subtotalCents: number;
  rate: number;
  onRateChange: (rate: number) => void;
  /** Id of an element that labels the group (e.g. a visible heading). */
  labelledBy?: string;
  describedBy?: string;
  className?: string;
}

/** Single-choice tip presets from siteConfig.ordering.tipPresets, each showing its dollar amount. */
export function TipSelector({ subtotalCents, rate, onRateChange, labelledBy, describedBy, className }: TipSelectorProps) {
  return (
    <ToggleGroup
      type="single"
      value={String(rate)}
      // Radix emits "" when the pressed item is clicked again; a tip choice can't be cleared, only changed.
      onValueChange={(value) => {
        if (value) onRateChange(Number(value));
      }}
      aria-label={labelledBy ? undefined : "Tip"}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      className={cn("grid w-full grid-cols-2 gap-2 sm:grid-cols-4", className)}
    >
      {siteConfig.ordering.tipPresets.map((preset) => {
        const label = preset === 0 ? "No tip" : `${Math.round(preset * 100)}%`;
        return (
          <ToggleGroupItem
            key={preset}
            value={String(preset)}
            variant="outline"
            className={cn(
              "h-auto min-h-14 w-full flex-col gap-0.5 rounded-xl border-border bg-background px-3 py-2 text-foreground",
              "data-[state=on]:border-charcoal data-[state=on]:bg-charcoal data-[state=on]:text-cream data-[state=on]:hover:bg-charcoal/90 data-[state=on]:hover:text-cream",
            )}
          >
            <span className="text-base leading-tight font-semibold">{label}</span>
            <span className="text-xs leading-tight tabular-nums opacity-80">
              {preset === 0 ? formatPrice(0) : formatPrice(tipFromRate(subtotalCents, preset))}
            </span>
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}
