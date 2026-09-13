import "server-only";

import type { MenuCategoryWithItems, MenuItemDTO } from "@/lib/types";

// CONTRACT — signatures are frozen; implementations are provided by the data-layer build step.

/** Active categories (sortOrder asc) with their items (sortOrder asc). Unavailable items are included with isAvailable=false. */
export async function getMenu(): Promise<MenuCategoryWithItems[]> {
  throw new Error("getMenu: not implemented");
}

/** Items flagged isFeatured, in category order. */
export async function getFeaturedItems(): Promise<MenuItemDTO[]> {
  throw new Error("getFeaturedItems: not implemented");
}

export async function getMenuItemBySlug(slug: string): Promise<MenuItemDTO | null> {
  void slug;
  throw new Error("getMenuItemBySlug: not implemented");
}
