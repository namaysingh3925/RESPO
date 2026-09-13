import "server-only";

import type { ReservationStatus } from "@/lib/constants";
import type { AvailabilityDTO, ReservationDTO } from "@/lib/types";
import type { ReservationCreateInput } from "@/lib/validation";

// CONTRACT — signatures are frozen; implementations are provided by the data-layer build step.

/** 30-minute slots for a restaurant-local date, honouring hours, last seating, lead time and per-slot cover capacity. */
export async function getAvailability(date: string, partySize: number): Promise<AvailabilityDTO> {
  void date;
  void partySize;
  throw new Error("getAvailability: not implemented");
}

/** Creates a CONFIRMED reservation. Throws ServiceError SLOT_UNAVAILABLE / RESTAURANT_CLOSED / VALIDATION_ERROR. */
export async function createReservation(input: ReservationCreateInput): Promise<ReservationDTO> {
  void input;
  throw new Error("createReservation: not implemented");
}

export async function getReservationByCode(code: string): Promise<ReservationDTO | null> {
  void code;
  throw new Error("getReservationByCode: not implemented");
}

/** Admin list, sorted by date then time. */
export async function listReservations(filter: { date?: string; status?: ReservationStatus }): Promise<ReservationDTO[]> {
  void filter;
  throw new Error("listReservations: not implemented");
}

/** Throws ServiceError NOT_FOUND / INVALID_TRANSITION (see RESERVATION_TRANSITIONS). */
export async function updateReservationStatus(id: string, status: ReservationStatus): Promise<ReservationDTO> {
  void id;
  void status;
  throw new Error("updateReservationStatus: not implemented");
}
