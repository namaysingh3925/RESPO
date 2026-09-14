"use client";

import type { MouseEvent } from "react";
import { useEffect, useRef } from "react";
import { SlidersHorizontal } from "lucide-react";
import { useScrollSpy } from "@/components/menu/use-scroll-spy";
import { prefersReducedMotion } from "@/hooks/use-media-query";
import type { CategoryDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Room kept clear at each end of the chip row before the active chip counts as off-screen. */
const EDGE_PX = 16;

interface CategoryNavProps {
  /** Categories that currently have matching dishes, in menu order. */
  sections: ReadonlyArray<Pick<CategoryDTO, "slug" | "name">>;
  /** Number of dietary filters switched on; shown on the filter shortcut. */
  activeFilterCount: number;
  onJumpToFilters: () => void;
}

/**
 * Sticky bar under the site header: a shortcut back to the dietary filters and a horizontally scrolling
 * row of category links that highlights the section in view.
 */
export function CategoryNav({ sections, activeFilterCount, onJumpToFilters }: CategoryNavProps) {
  const ids = sections.map((section) => section.slug);
  const { activeId, pin } = useScrollSpy(ids);
  const scrollerRef = useRef<HTMLUListElement>(null);

  // Keep the highlighted chip visible inside the row. Scrolls only the row, never the page,
  // so it can't interrupt a smooth page scroll that's already running.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !activeId) return;
    const chip = scroller.querySelector<HTMLElement>(`[data-slug="${CSS.escape(activeId)}"]`);
    if (!chip) return;

    const { offsetLeft, offsetWidth } = chip;
    const viewStart = scroller.scrollLeft + EDGE_PX;
    const viewEnd = scroller.scrollLeft + scroller.clientWidth - EDGE_PX;
    if (offsetLeft >= viewStart && offsetLeft + offsetWidth <= viewEnd) return;

    scroller.scrollTo({
      left: offsetLeft - (scroller.clientWidth - offsetWidth) / 2,
      behavior: prefersReducedMotion() ? "instant" : "smooth",
    });
  }, [activeId]);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>, slug: string) => {
    // Let modified clicks (new tab, copy link…) behave like a normal link.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const section = document.getElementById(slug);
    if (!section) return;

    event.preventDefault();
    pin(slug);
    // Move keyboard/screen-reader focus to the section first; focusing after the scroll starts could cancel it.
    document.getElementById(`${slug}-heading`)?.focus({ preventScroll: true });
    section.scrollIntoView({ behavior: prefersReducedMotion() ? "instant" : "smooth", block: "start" });
    window.history.replaceState(null, "", `#${slug}`);
  };

  if (sections.length === 0) return null;

  const filterLabel =
    activeFilterCount > 0
      ? `Dietary filters, ${activeFilterCount} on`
      : "Dietary filters";

  return (
    <div className="sticky top-16 z-40 border-b border-border bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-7xl items-center">
        <div className="flex shrink-0 items-center py-2 pr-2 pl-4 sm:pl-6 lg:pl-8">
          <button
            type="button"
            onClick={onJumpToFilters}
            aria-label={filterLabel}
            className="relative inline-flex size-11 items-center justify-center gap-2 rounded-full border border-border bg-card text-foreground transition-colors outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-auto sm:px-4"
          >
            <SlidersHorizontal className="size-4 shrink-0" aria-hidden="true" />
            <span className="hidden text-sm font-semibold sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-ember px-1 text-[11px] leading-none font-bold text-white tabular-nums ring-2 ring-background"
              >
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        <span aria-hidden="true" className="h-6 w-px shrink-0 bg-border" />

        <nav aria-label="Menu sections" className="min-w-0 flex-1">
          <ul
            ref={scrollerRef}
            role="list"
            className={cn(
              "relative flex snap-x snap-proximity scroll-px-3 gap-1.5 overflow-x-auto overscroll-x-contain py-2 pr-4 pl-3 sm:pr-6 lg:pr-8",
              "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              "[mask-image:linear-gradient(to_right,transparent,#000_0.75rem,#000_calc(100%-1rem),transparent)]",
            )}
          >
            {sections.map(({ slug, name }) => {
              const isActive = slug === activeId;
              return (
                <li key={slug} className="shrink-0 snap-start">
                  <a
                    href={`#${slug}`}
                    data-slug={slug}
                    aria-current={isActive ? "true" : undefined}
                    onClick={(event) => handleClick(event, slug)}
                    className={cn(
                      "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                      isActive
                        ? "border-charcoal bg-charcoal text-cream"
                        : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {name}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
