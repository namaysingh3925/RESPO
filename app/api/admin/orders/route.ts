import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api/admin-auth";
import { handleRouteError, json, NO_STORE, parseQuery } from "@/lib/api/respond";
import { listOrders } from "@/lib/services/orders";
import { orderListQuerySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** GET /api/admin/orders?status=PREPARING&date=YYYY-MM-DD (defaults to today) → { orders: OrderDTO[] } */
export async function GET(request: NextRequest) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const filter = parseQuery(request.nextUrl.searchParams, orderListQuerySchema);
    const orders = await listOrders(filter);
    return json({ orders }, { headers: NO_STORE });
  } catch (error) {
    return handleRouteError(error, "GET /api/admin/orders");
  }
}
