import type { NextRequest } from "next/server";
import { errorResponse, handleRouteError, json, NO_STORE } from "@/lib/api/respond";
import { toPublicOrder } from "@/lib/privacy";
import { getOrderByCode } from "@/lib/services/orders";

/** Tracking pages poll this endpoint, so it must always reflect the latest status. */
export const dynamic = "force-dynamic";

/** GET /api/orders/[code] → OrderDTO with email and phone masked */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/orders/[code]">) {
  try {
    const { code } = await ctx.params;
    const order = code.length <= 20 ? await getOrderByCode(code) : null;
    if (!order) {
      return errorResponse("NOT_FOUND", "We couldn't find an order with that code. Check it and try again.");
    }
    return json(toPublicOrder(order), { headers: NO_STORE });
  } catch (error) {
    return handleRouteError(error, "GET /api/orders/[code]");
  }
}
