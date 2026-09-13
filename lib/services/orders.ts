import "server-only";

import type { OrderStatus } from "@/lib/constants";
import type { OrderDTO } from "@/lib/types";
import type { OrderCreateInput } from "@/lib/validation";

// CONTRACT — signatures are frozen; implementations are provided by the data-layer build step.

/**
 * Re-prices every line from the database, rejects unavailable / dine-in-only items (ITEM_UNAVAILABLE),
 * enforces the delivery minimum (MINIMUM_NOT_MET), computes totals with lib/pricing, and records a PENDING status event.
 */
export async function createOrder(input: OrderCreateInput): Promise<OrderDTO> {
  void input;
  throw new Error("createOrder: not implemented");
}

/** Public tracking lookup by short code (case-insensitive). */
export async function getOrderByCode(code: string): Promise<OrderDTO | null> {
  void code;
  throw new Error("getOrderByCode: not implemented");
}

/** Admin list, newest first. `date` is restaurant-local YYYY-MM-DD and defaults to today. */
export async function listOrders(filter: { status?: OrderStatus; date?: string }): Promise<OrderDTO[]> {
  void filter;
  throw new Error("listOrders: not implemented");
}

/** Throws ServiceError NOT_FOUND / INVALID_TRANSITION (ORDER_TRANSITIONS; OUT_FOR_DELIVERY only for DELIVERY). */
export async function updateOrderStatus(id: string, status: OrderStatus): Promise<OrderDTO> {
  void id;
  void status;
  throw new Error("updateOrderStatus: not implemented");
}
