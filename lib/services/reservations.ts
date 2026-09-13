import "server-only";

import { RESERVATION_STATUS_LABELS, RESERVATION_TRANSITIONS, type ReservationStatus } from "@/lib/constants";
import { db } from "@/lib/db";
import { formatDateLabel, formatTime, restaurantNow } from "@/lib/format";
import { siteConfig } from "@/lib/site-config";
import { ServiceError } from "@/lib/services/errors";
import { generateUniqueCode, normalizePublicCode } from "@/lib/services/internal/codes";
import { toReservationDTO } from "@/lib/services/internal/mappers";
import { reservationDayPlan } from "@/lib/services/internal/schedule";
import { addDays } from "@/lib/services/internal/time";
import type { AvailabilityDTO, ReservationDTO } from "@/lib/types";
import type { ReservationCreateInput } from "@/lib/validation";

/** Bookings in these states hold covers in their slot. */
const CAPACITY_STATUSES: ReservationStatus[] = ["PENDING", "CONFIRMED", "SEATED"];

type ReservationReader = Pick<typeof db, "reservation">;

/** Covers already booked per slot time for a date. */
async function coversBySlot(client: ReservationReader, date: string): Promise<Map<string, number>> {
  const bookings = await client.reservation.findMany({
    where: { date, status: { in: CAPACITY_STATUSES } },
    select: { time: true, partySize: true },
  });
  const covers = new Map<string, number>();
  for (const booking of bookings) {
    covers.set(booking.time, (covers.get(booking.time) ?? 0) + booking.partySize);
  }
  return covers;
}

/** 30-minute slots for a restaurant-local date, honouring hours, last seating, lead time and per-slot cover capacity. */
export async function getAvailability(date: string, partySize: number): Promise<AvailabilityDTO> {
  const plan = reservationDayPlan(date);
  if (plan.status !== "open") {
    return { date, partySize, isOpen: false, slots: [] };
  }

  const { maxCoversPerSlot } = siteConfig.reservations;
  const covers = plan.times.length > 0 ? await coversBySlot(db, date) : new Map<string, number>();

  return {
    date,
    partySize,
    isOpen: true,
    slots: plan.times.map((time) => {
      const remainingCovers = Math.max(0, maxCoversPerSlot - (covers.get(time) ?? 0));
      return { time, label: formatTime(time), available: remainingCovers >= partySize, remainingCovers };
    }),
  };
}

/** Creates a CONFIRMED reservation. Throws ServiceError SLOT_UNAVAILABLE / RESTAURANT_CLOSED / VALIDATION_ERROR. */
export async function createReservation(input: ReservationCreateInput): Promise<ReservationDTO> {
  const { bookingWindowDays, maxCoversPerSlot, minPartySize, maxPartySize } = siteConfig.reservations;
  const email = input.email.trim().toLowerCase();

  if (!Number.isInteger(input.partySize) || input.partySize < minPartySize || input.partySize > maxPartySize) {
    throw new ServiceError("VALIDATION_ERROR", "Please choose a valid party size", {
      partySize: [`Party size must be between ${minPartySize} and ${maxPartySize}`],
    });
  }

  // SQLite interactive transactions are serialised by the driver adapter, so the capacity
  // check and the insert below cannot interleave with another booking in this process.
  const reservation = await db.$transaction(async (tx) => {
    const plan = reservationDayPlan(input.date);

    if (plan.status === "invalid-date" || plan.status === "out-of-window") {
      const today = restaurantNow().date;
      const lastDay = addDays(today, bookingWindowDays);
      throw new ServiceError("VALIDATION_ERROR", "Please choose a date we're taking bookings for", {
        date: [`Choose a date between today and ${formatDateLabel(lastDay, { weekday: undefined })}`],
      });
    }
    if (plan.status === "closed") {
      throw new ServiceError("RESTAURANT_CLOSED", `We're closed on ${formatDateLabel(input.date)}. Please pick another day.`);
    }
    if (!plan.times.includes(input.time)) {
      throw new ServiceError("SLOT_UNAVAILABLE", `${formatTime(input.time)} isn't available to book. Please pick another time.`);
    }

    const duplicate = await tx.reservation.findFirst({
      where: { email, date: input.date, time: input.time, status: { not: "CANCELLED" } },
      select: { id: true },
    });
    if (duplicate) {
      throw new ServiceError("SLOT_UNAVAILABLE", "You already have a booking at this time");
    }

    const booked = (await coversBySlot(tx, input.date)).get(input.time) ?? 0;
    if (booked + input.partySize > maxCoversPerSlot) {
      throw new ServiceError(
        "SLOT_UNAVAILABLE",
        `Sorry, ${formatTime(input.time)} just filled up for a party of ${input.partySize}. Please pick another time.`,
      );
    }

    const code = await generateUniqueCode(
      async (candidate) => (await tx.reservation.count({ where: { code: candidate } })) > 0,
    );

    return tx.reservation.create({
      data: {
        code,
        name: input.name.trim(),
        email,
        phone: input.phone.trim(),
        partySize: input.partySize,
        date: input.date,
        time: input.time,
        occasion: input.occasion ?? null,
        notes: input.notes ?? null,
        status: "CONFIRMED",
      },
    });
  });

  return toReservationDTO(reservation);
}

/** Booking lookup by short code (case-insensitive). */
export async function getReservationByCode(code: string): Promise<ReservationDTO | null> {
  const normalized = normalizePublicCode(code);
  if (!normalized) return null;
  const reservation = await db.reservation.findUnique({ where: { code: normalized } });
  return reservation ? toReservationDTO(reservation) : null;
}

/** Admin list, sorted by date then time. */
export async function listReservations(filter: { date?: string; status?: ReservationStatus }): Promise<ReservationDTO[]> {
  const reservations = await db.reservation.findMany({
    where: {
      ...(filter.date ? { date: filter.date } : {}),
      ...(filter.status ? { status: filter.status } : {}),
    },
    orderBy: [{ date: "asc" }, { time: "asc" }, { createdAt: "asc" }],
  });
  return reservations.map(toReservationDTO);
}

/** Throws ServiceError NOT_FOUND / INVALID_TRANSITION (see RESERVATION_TRANSITIONS). */
export async function updateReservationStatus(id: string, status: ReservationStatus): Promise<ReservationDTO> {
  const reservation = await db.$transaction(async (tx) => {
    const current = await tx.reservation.findUnique({ where: { id } });
    if (!current) {
      throw new ServiceError("NOT_FOUND", "Reservation not found");
    }

    if (!RESERVATION_TRANSITIONS[current.status].includes(status)) {
      const from = RESERVATION_STATUS_LABELS[current.status].toLowerCase();
      const to = RESERVATION_STATUS_LABELS[status].toLowerCase();
      throw new ServiceError(
        "INVALID_TRANSITION",
        current.status === status
          ? `This reservation is already ${from}`
          : `A ${from} reservation can't be marked ${to}`,
      );
    }

    return tx.reservation.update({ where: { id }, data: { status } });
  });

  return toReservationDTO(reservation);
}
