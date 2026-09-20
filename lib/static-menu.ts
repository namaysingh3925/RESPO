import { seedCategories, seedMenuItems, PHOTOS, unsplash } from "@/lib/data/menu";
import type { MenuCategoryWithItems } from "@/lib/types";

/** The menu built from the seed data, so the site needs no database. */
export function getStaticMenu(): MenuCategoryWithItems[] {
  return seedCategories.map((category, categoryIndex) => ({
    id: category.slug,
    slug: category.slug,
    name: category.name,
    description: category.description,
    sortOrder: categoryIndex,
    items: seedMenuItems
      .filter((item) => item.categorySlug === category.slug)
      .map((item, index) => ({
        id: item.slug,
        slug: item.slug,
        categorySlug: category.slug,
        name: item.name,
        description: item.description,
        priceCents: item.priceCents,
        imageUrl: unsplash(PHOTOS[item.photo]),
        dietaryTags: item.dietaryTags,
        calories: item.calories ?? null,
        isFeatured: item.isFeatured ?? false,
        isAvailable: true,
        dineInOnly: item.dineInOnly ?? false,
        sortOrder: index,
      })),
  }));
}
