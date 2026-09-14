import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api/admin-auth";
import { handleRouteError, invalidField, json, NO_STORE, parseQuery } from "@/lib/api/respond";
import { listReservations } from "@/lib/services/reservations";
import { isValidIsoDate } from "@/lib/services/internal/time";
import { reservationListQuerySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** GET /api/admin/reservations?date=YYYY-MM-DD&status=CONFIRMED → { reservations: ReservationDTO[] } (date, then time) */
export async function GET(request: NextRequest) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const filter = parseQuery(request.nextUrl.searchParams, reservationListQuerySchema);
    if (filter.date && !isValidIsoDate(filter.date)) {
      throw invalidField("date", "Use a real calendar date");
    }
    const reservations = await listReservations(filter);
    return json({ reservations }, { headers: NO_STORE });
  } catch (error) {
    return handleRouteError(error, "GET /api/admin/reservations");
  }
}
