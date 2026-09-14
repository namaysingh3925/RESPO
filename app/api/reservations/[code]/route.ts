import type { NextRequest } from "next/server";
import { errorResponse, handleRouteError, json, NO_STORE } from "@/lib/api/respond";
import { getReservationByCode } from "@/lib/services/reservations";

export const dynamic = "force-dynamic";

/**
 * GET /api/reservations/[code]?email= → ReservationDTO
 * The booking is only returned when the email matches. An unknown code, a missing email and a wrong email all
 * get the same 404, so the endpoint can't be used to discover which codes exist.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/reservations/[code]">) {
  try {
    const { code } = await ctx.params;
    const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase() ?? "";

    const reservation = email && code.length <= 20 ? await getReservationByCode(code) : null;
    if (!reservation || reservation.email.toLowerCase() !== email) {
      return errorResponse("NOT_FOUND", "We couldn't find a booking with that code and email address.");
    }
    return json(reservation, { headers: NO_STORE });
  } catch (error) {
    return handleRouteError(error, "GET /api/reservations/[code]");
  }
}
