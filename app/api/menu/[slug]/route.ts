import type { NextRequest } from "next/server";
import { errorResponse, handleRouteError, json, PUBLIC_SHORT_CACHE } from "@/lib/api/respond";
import { getMenuItemBySlug } from "@/lib/services/menu";

/** GET /api/menu/[slug] → MenuItemDTO */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/menu/[slug]">) {
  try {
    const { slug } = await ctx.params;
    const item = slug.length <= 120 ? await getMenuItemBySlug(slug) : null;
    if (!item) {
      return errorResponse("NOT_FOUND", "We couldn't find that dish on our menu.");
    }
    return json(item, { headers: PUBLIC_SHORT_CACHE });
  } catch (error) {
    return handleRouteError(error, "GET /api/menu/[slug]");
  }
}
