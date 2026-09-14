import type { NextRequest } from "next/server";
import { handleRouteError, invalidField, json, NO_STORE, parseQuery } from "@/lib/api/respond";
import { getAvailability } from "@/lib/services/reservations";
import { isValidIsoDate } from "@/lib/services/internal/time";
import type { AvailabilityDTO } from "@/lib/types";
import { availabilityQuerySchema } from "@/lib/validation";

/** Remaining covers change with every booking, so availability is always computed per request. */
export const dynamic = "force-dynamic";

/** GET /api/reservations/availability?date=YYYY-MM-DD&partySize=4 → AvailabilityDTO */
export async function GET(request: NextRequest) {
  try {
    const { date, partySize } = parseQuery(request.nextUrl.searchParams, availabilityQuerySchema);
    if (!isValidIsoDate(date)) {
      throw invalidField("date", "Choose a real calendar date");
    }
    const availability: AvailabilityDTO = await getAvailability(date, partySize);
    return json(availability, { headers: NO_STORE });
  } catch (error) {
    return handleRouteError(error, "GET /api/reservations/availability");
  }
}
