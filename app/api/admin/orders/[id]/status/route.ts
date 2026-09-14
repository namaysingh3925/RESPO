import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api/admin-auth";
import { errorResponse, handleRouteError, isPlausibleId, json, NO_STORE, parseJsonBody } from "@/lib/api/respond";
import { updateOrderStatus } from "@/lib/services/orders";
import { orderStatusUpdateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** PATCH /api/admin/orders/[id]/status { status } → OrderDTO (409 INVALID_TRANSITION for disallowed moves) */
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/admin/orders/[id]/status">) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const { id } = await ctx.params;
    if (!isPlausibleId(id)) {
      return errorResponse("NOT_FOUND", "Order not found");
    }
    const { status } = await parseJsonBody(request, orderStatusUpdateSchema);
    const order = await updateOrderStatus(id, status);
    return json(order, { headers: NO_STORE });
  } catch (error) {
    return handleRouteError(error, "PATCH /api/admin/orders/[id]/status");
  }
}
