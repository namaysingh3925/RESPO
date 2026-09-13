import { CategoryShowcase } from "@/components/menu/category-showcase";
import { pluralizeDishes } from "@/components/menu/dietary";
import { MenuItemCard } from "@/components/menu/menu-item-card";
import type { MenuCategoryWithItems } from "@/lib/types";

interface CategorySectionProps {
  /** The category with only the dishes that match the active filters. */
  category: MenuCategoryWithItems;
  /** 1-based position in the full menu, shown as "01", "02"… */
  number: number;
  /** Dishes in this category before filtering. */
  totalCount: number;
}

export function CategorySection({ category, number, totalCount }: CategorySectionProps) {
  const { slug, name, description, items } = category;
  const headingId = `${slug}-heading`;
  const count = items.length;
  // Remount the interactor whenever the visible dish set changes so its index and timelines reset.
  const showcaseKey = items.map((item) => item.slug).join("|");

  return (
    <section
      id={slug}
      aria-labelledby={headingId}
      className="scroll-mt-32 border-t border-border py-10 first:border-t-0 sm:py-14 lg:py-16"
    >
      <header className="max-w-2xl">
        <p className="flex items-center gap-3 text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">
          <span className="text-foreground tabular-nums">{String(number).padStart(2, "0")}</span>
          <span aria-hidden="true" className="h-0.5 w-8 rounded-full bg-ember" />
          <span>{count === totalCount ? pluralizeDishes(count) : `${count} of ${pluralizeDishes(totalCount)}`}</span>
        </p>
        <h2
          id={headingId}
          tabIndex={-1}
          className="mt-3 text-4xl leading-[0.85] font-black tracking-tighter text-charcoal uppercase outline-none sm:text-5xl lg:text-6xl"
        >
          {name}
        </h2>
        {description && (
          <p className="mt-3 text-base text-pretty text-muted-foreground sm:text-lg">{description}</p>
        )}
      </header>

      <div className="mt-6 sm:mt-8 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10 xl:gap-16">
        <div className="hidden lg:block">
          <div className="sticky top-36">
            <CategoryShowcase key={showcaseKey} categoryName={name} categorySlug={slug} items={items} />
          </div>
        </div>

        <ul role="list" className="grid gap-3 md:grid-cols-2 lg:grid-cols-1">
          {items.map((item) => (
            <li key={item.id}>
              <MenuItemCard item={item} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
