import { handleRouteError, json, NO_STORE, parseJsonBody } from "@/lib/api/respond";
import { createReservation } from "@/lib/services/reservations";
import { reservationCreateSchema } from "@/lib/validation";

/** POST /api/reservations { date, time, partySize, name, email, phone, occasion?, notes? } → 201 ReservationDTO */
export async function POST(request: Request) {
  try {
    const input = await parseJsonBody(request, reservationCreateSchema);
    const reservation = await createReservation(input);
    return json(reservation, { status: 201, headers: NO_STORE });
  } catch (error) {
    return handleRouteError(error, "POST /api/reservations");
  }
}
