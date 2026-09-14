import { handleRouteError, json, NO_STORE, parseJsonBody } from "@/lib/api/respond";
import { createOrder } from "@/lib/services/orders";
import { orderCreateSchema } from "@/lib/validation";

/**
 * POST /api/orders → 201 OrderDTO
 * Lines carry only { slug, quantity, notes }; any client-sent prices or totals are stripped by the schema and
 * the service re-prices every line from the database.
 */
export async function POST(request: Request) {
  try {
    const input = await parseJsonBody(request, orderCreateSchema);
    const order = await createOrder(input);
    return json(order, { status: 201, headers: NO_STORE });
  } catch (error) {
    return handleRouteError(error, "POST /api/orders");
  }
}
