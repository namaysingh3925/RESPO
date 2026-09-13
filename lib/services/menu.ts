import "server-only";

import { db } from "@/lib/db";
import { toCategoryDTO, toMenuItemDTO } from "@/lib/services/internal/mappers";
import type { MenuCategoryWithItems, MenuItemDTO } from "@/lib/types";

/** Active categories (sortOrder asc) with their items (sortOrder asc). Unavailable items are included with isAvailable=false. */
export async function getMenu(): Promise<MenuCategoryWithItems[]> {
  const categories = await db.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { items: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] } },
  });

  return categories.map((category) => ({
    ...toCategoryDTO(category),
    items: category.items.map((item) => toMenuItemDTO(item, category.slug)),
  }));
}

/** Items flagged isFeatured, in category order. */
export async function getFeaturedItems(): Promise<MenuItemDTO[]> {
  const items = await db.menuItem.findMany({
    where: { isFeatured: true, category: { isActive: true } },
    orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }, { name: "asc" }],
    include: { category: { select: { slug: true } } },
  });

  return items.map((item) => toMenuItemDTO(item, item.category.slug));
}

/** One dish by slug; null when it doesn't exist or its category is hidden. */
export async function getMenuItemBySlug(slug: string): Promise<MenuItemDTO | null> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;

  const item = await db.menuItem.findUnique({
    where: { slug: normalized },
    include: { category: { select: { slug: true, isActive: true } } },
  });
  if (!item || !item.category.isActive) return null;

  return toMenuItemDTO(item, item.category.slug);
}
