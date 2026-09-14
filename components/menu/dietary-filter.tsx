"use client";

import type { Ref } from "react";
import { Check, Plus, X } from "lucide-react";
import { FILTER_TAGS, type FilterTag } from "@/components/menu/dietary";
import { DIETARY_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const DIETARY_FILTERS_ID = "dietary-filters";

interface DietaryFilterProps {
  selected: readonly FilterTag[];
  onToggle: (tag: FilterTag) => void;
  onClear: () => void;
  /** Result summary, shown and announced politely whenever it changes, e.g. "Showing 12 of 29 dishes". */
  summary: string;
  ref?: Ref<HTMLDivElement>;
}

/** Multi-select dietary toggle chips (AND semantics) with a live result count. */
export function DietaryFilter({ selected, onToggle, onClear, summary, ref }: DietaryFilterProps) {
  const labelId = `${DIETARY_FILTERS_ID}-label`;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-5 sm:px-6 sm:pb-6 lg:px-8">
      <div ref={ref} id={DIETARY_FILTERS_ID} className="scroll-mt-20">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p id={labelId} className="text-xs font-bold tracking-[0.2em] text-foreground uppercase">
            Filter by diet
          </p>
          <p role="status" aria-live="polite" aria-atomic="true" className="text-sm text-muted-foreground tabular-nums">
            {summary}
          </p>
        </div>

        <div role="group" aria-labelledby={labelId} className="mt-3 flex flex-wrap items-center gap-2">
          {FILTER_TAGS.map((tag) => {
            const pressed = selected.includes(tag);
            const Icon = pressed ? Check : Plus;
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={pressed}
                onClick={() => onToggle(tag)}
                className={cn(
                  "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                  pressed
                    ? "border-ember bg-ember/10 text-foreground hover:bg-ember/15"
                    : "border-border bg-card text-foreground hover:border-foreground/25 hover:bg-muted",
                )}
              >
                <Icon
                  className={cn("size-4 shrink-0", pressed ? "text-ember" : "text-muted-foreground")}
                  aria-hidden="true"
                />
                {DIETARY_LABELS[tag]}
              </button>
            );
          })}

          {selected.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-muted-foreground underline-offset-4 transition-colors outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <X className="size-4 shrink-0" aria-hidden="true" />
              Clear<span className="sr-only"> dietary filters</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
