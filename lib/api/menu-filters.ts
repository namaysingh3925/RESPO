/** Query filters for GET /api/menu: `?category=slug`, `?dietary=vegan,gluten-free` (all must match), `?featured=true`. */
import { z } from "zod";
import { DIETARY_TAGS } from "@/lib/constants";
import type { MenuCategoryWithItems } from "@/lib/types";

const dietaryTag = z.enum(DIETARY_TAGS, {
  error: () => `Use one of: ${DIETARY_TAGS.join(", ")}`,
});

export const menuQuerySchema = z.object({
  category: z.string().trim().toLowerCase().max(80).optional(),
  dietary: z.array(dietaryTag).max(DIETARY_TAGS.length).optional(),
  featured: z.stringbool({ error: () => 'Use "true" or "false"' }).optional(),
});
export type MenuQuery = z.infer<typeof menuQuerySchema>;

/** Collects the raw filter values; `dietary` may be repeated or comma-separated. Empty values count as absent. */
export function readMenuQuery(searchParams: URLSearchParams): Record<string, unknown> {
  const pick = (key: string) => searchParams.get(key)?.trim() || undefined;
  const dietary = searchParams
    .getAll("dietary")
    .flatMap((value) => value.split(","))
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);

  return {
    category: pick("category"),
    dietary: dietary.length > 0 ? [...new Set(dietary)] : undefined,
    featured: pick("featured"),
  };
}

/**
 * Applies the filters. Without item filters every active category is returned (even an empty one);
 * with `dietary` or `featured`, categories left without matching dishes are dropped.
 */
export function filterMenu(categories: MenuCategoryWithItems[], query: MenuQuery): MenuCategoryWithItems[] {
  const { category, dietary, featured } = query;
  const filtersItems = Boolean(dietary?.length) || featured !== undefined;

  return categories
    .filter((c) => !category || c.slug === category)
    .map((c) => ({
      ...c,
      items: c.items.filter(
        (item) =>
          (featured === undefined || item.isFeatured === featured) &&
          (!dietary || dietary.every((tag) => item.dietaryTags.includes(tag))),
      ),
    }))
    .filter((c) => !filtersItems || c.items.length > 0);
}
