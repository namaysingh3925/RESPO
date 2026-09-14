import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api/admin-auth";
import { errorResponse, handleRouteError, isPlausibleId, json, NO_STORE, parseJsonBody } from "@/lib/api/respond";
import { updateReservationStatus } from "@/lib/services/reservations";
import { reservationStatusUpdateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** PATCH /api/admin/reservations/[id]/status { status } → ReservationDTO (seat, complete, no-show, cancel) */
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/admin/reservations/[id]/status">) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const { id } = await ctx.params;
    if (!isPlausibleId(id)) {
      return errorResponse("NOT_FOUND", "Reservation not found");
    }
    const { status } = await parseJsonBody(request, reservationStatusUpdateSchema);
    const reservation = await updateReservationStatus(id, status);
    return json(reservation, { headers: NO_STORE });
  } catch (error) {
    return handleRouteError(error, "PATCH /api/admin/reservations/[id]/status");
  }
}
