import type { DietaryTag } from "@/lib/constants";
import type { MenuCategoryWithItems } from "@/lib/types";

/** Dietary tags guests can filter the menu by (spicy / contains-nuts are shown as badges only). */
export const FILTER_TAGS = [
  "vegetarian",
  "vegan",
  "gluten-free",
  "dairy-free",
] as const satisfies readonly DietaryTag[];

export type FilterTag = (typeof FILTER_TAGS)[number];

/** A vegan dish is, by definition, also vegetarian and dairy-free. */
const IMPLIED_TAGS: Partial<Record<DietaryTag, readonly DietaryTag[]>> = {
  vegan: ["vegetarian", "dairy-free"],
};

/** AND semantics: a dish matches when it satisfies every selected tag. */
export function matchesDiet(tags: readonly DietaryTag[], selected: readonly FilterTag[]): boolean {
  if (selected.length === 0) return true;
  const satisfied = new Set<DietaryTag>(tags);
  for (const tag of tags) IMPLIED_TAGS[tag]?.forEach((implied) => satisfied.add(implied));
  return selected.every((tag) => satisfied.has(tag));
}

/** Categories with only the matching dishes; categories left empty are dropped. */
export function filterMenu(
  categories: readonly MenuCategoryWithItems[],
  selected: readonly FilterTag[],
): MenuCategoryWithItems[] {
  if (selected.length === 0) return categories.filter((category) => category.items.length > 0);
  return categories
    .map((category) => ({
      ...category,
      items: category.items.filter((item) => matchesDiet(item.dietaryTags, selected)),
    }))
    .filter((category) => category.items.length > 0);
}

export function pluralizeDishes(count: number): string {
  return `${count} ${count === 1 ? "dish" : "dishes"}`;
}
