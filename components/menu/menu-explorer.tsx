"use client";

import { useMemo, useRef, useState } from "react";
import { Phone, SearchX, UtensilsCrossed } from "lucide-react";
import { CategoryNav } from "@/components/menu/category-nav";
import { CategorySection } from "@/components/menu/category-section";
import { FILTER_TAGS, filterMenu, pluralizeDishes, type FilterTag } from "@/components/menu/dietary";
import { DietaryFilter } from "@/components/menu/dietary-filter";
import { Button } from "@/components/ui/button";
import { prefersReducedMotion } from "@/hooks/use-media-query";
import { DIETARY_LABELS } from "@/lib/constants";
import { siteConfig } from "@/lib/site-config";
import type { MenuCategoryWithItems } from "@/lib/types";

const countDishes = (categories: readonly MenuCategoryWithItems[]) =>
  categories.reduce((sum, category) => sum + category.items.length, 0);

const listFormat = new Intl.ListFormat(siteConfig.locale, { style: "long", type: "conjunction" });

function describeResults(matchCount: number, totalCount: number, filterCount: number): string {
  if (filterCount === 0) return `Showing ${totalCount === 1 ? "" : "all "}${pluralizeDishes(totalCount)}`;
  if (matchCount === 0) return "No dishes match";
  return `Showing ${matchCount} of ${pluralizeDishes(totalCount)}`;
}

interface MenuExplorerProps {
  /** Full menu from getMenu(): active categories in order, each with its dishes. */
  categories: MenuCategoryWithItems[];
}

/** Client island for /menu: dietary filters, sticky category nav with scroll-spy, and the category sections. */
export function MenuExplorer({ categories }: MenuExplorerProps) {
  const [selected, setSelected] = useState<FilterTag[]>([]);
  const filtersRef = useRef<HTMLDivElement>(null);

  const menu = useMemo(() => {
    const all = filterMenu(categories, []);
    return {
      all,
      numbers: new Map(all.map((category, index) => [category.slug, index + 1])),
      totals: new Map(all.map((category) => [category.slug, category.items.length])),
      dishCount: countDishes(all),
    };
  }, [categories]);

  // CategorySection re-keys its showcase from the visible dish slugs, so interactors reset whenever this changes.
  const visible = useMemo(() => filterMenu(menu.all, selected), [menu.all, selected]);
  const matchCount = countDishes(visible);

  const focusFirstFilter = (options?: FocusOptions) =>
    filtersRef.current?.querySelector<HTMLButtonElement>("button[aria-pressed]")?.focus(options);

  const toggle = (tag: FilterTag) =>
    setSelected((current) =>
      current.includes(tag)
        ? current.filter((t) => t !== tag)
        : FILTER_TAGS.filter((t) => t === tag || current.includes(t)),
    );

  const clear = () => {
    setSelected([]);
    // Both Clear buttons disappear once filters are off; keep focus in the filter group.
    focusFirstFilter();
  };

  const jumpToFilters = () => {
    focusFirstFilter({ preventScroll: true });
    filtersRef.current?.scrollIntoView({
      behavior: prefersReducedMotion() ? "instant" : "smooth",
      block: "start",
    });
  };

  if (menu.dishCount === 0) return <MenuUnavailable />;

  return (
    <div>
      <DietaryFilter
        ref={filtersRef}
        selected={selected}
        onToggle={toggle}
        onClear={clear}
        summary={describeResults(matchCount, menu.dishCount, selected.length)}
      />

      {visible.length > 0 ? (
        <>
          <CategoryNav
            sections={visible}
            activeFilterCount={selected.length}
            onJumpToFilters={jumpToFilters}
          />
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {visible.map((category) => (
              <CategorySection
                key={category.slug}
                category={category}
                number={menu.numbers.get(category.slug) ?? 0}
                totalCount={menu.totals.get(category.slug) ?? category.items.length}
              />
            ))}
          </div>
        </>
      ) : (
        <NoMatches selected={selected} onClear={clear} />
      )}
    </div>
  );
}

function NoMatches({ selected, onClear }: { selected: readonly FilterTag[]; onClear: () => void }) {
  const labels = listFormat.format(selected.map((tag) => DIETARY_LABELS[tag].toLowerCase()));

  return (
    <div className="mx-auto max-w-7xl border-t border-border px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="mx-auto flex max-w-lg flex-col items-center rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center sm:px-10 sm:py-12">
        <span className="grid size-14 place-items-center rounded-full bg-ember/10 text-ember">
          <SearchX className="size-6" aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-3xl leading-[0.9] font-black tracking-tighter text-charcoal uppercase sm:text-4xl">
          Nothing fits all of that
        </h2>
        <p className="mt-3 text-base text-pretty text-muted-foreground">
          None of our dishes are {labels} right now. Remove a filter to see more, or call us at{" "}
          <a
            href={siteConfig.phoneHref}
            className="font-semibold whitespace-nowrap text-foreground underline underline-offset-4 hover:text-ember"
          >
            {siteConfig.phone}
          </a>{" "}
          to talk through allergies.
        </p>
        <Button type="button" onClick={onClear} className="mt-6 h-12 rounded-full px-6 text-base">
          Clear filters
        </Button>
      </div>
    </div>
  );
}

function MenuUnavailable() {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 sm:pb-16 lg:px-8">
      <div className="flex flex-col items-start gap-5 rounded-2xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:p-8">
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-ember/10 text-ember">
          <UtensilsCrossed className="size-6" aria-hidden="true" />
        </span>
        <div className="flex-1">
          <h2 className="text-2xl leading-[0.9] font-black tracking-tighter text-charcoal uppercase sm:text-3xl">
            The menu is being updated
          </h2>
          <p className="mt-2 text-base text-pretty text-muted-foreground">
            Check back in a few minutes, or give us a call and we&apos;ll tell you what&apos;s cooking tonight.
          </p>
        </div>
        <Button asChild variant="outline" className="h-12 rounded-full px-6 text-base">
          <a href={siteConfig.phoneHref}>
            <Phone aria-hidden="true" />
            Call {siteConfig.phone}
          </a>
        </Button>
      </div>
    </div>
  );
}
