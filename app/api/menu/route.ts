import type { NextRequest } from "next/server";
import { filterMenu, menuQuerySchema, readMenuQuery } from "@/lib/api/menu-filters";
import { handleRouteError, json, PUBLIC_SHORT_CACHE, validate } from "@/lib/api/respond";
import { getMenu } from "@/lib/services/menu";
import type { MenuCategoryWithItems } from "@/lib/types";

/** GET /api/menu?category=slug&dietary=vegan&featured=true → { categories: MenuCategoryWithItems[] } */
export async function GET(request: NextRequest) {
  try {
    const query = validate(menuQuerySchema, readMenuQuery(request.nextUrl.searchParams));
    const categories: MenuCategoryWithItems[] = filterMenu(await getMenu(), query);
    return json({ categories }, { headers: PUBLIC_SHORT_CACHE });
  } catch (error) {
    return handleRouteError(error, "GET /api/menu");
  }
}
