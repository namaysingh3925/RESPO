import { ApiError } from "@/lib/api-client";
import {
  ORDER_TRANSITIONS,
  RESERVATION_TRANSITIONS,
  type OrderStatus,
  type ReservationStatus,
} from "@/lib/constants";
import { formatTime, restaurantNow } from "@/lib/format";
import type { OrderDTO } from "@/lib/types";

// ---------- Orders ----------

/** Short, staff-facing status names for filter chips (badges use the shared customer-facing labels). */
export const ORDER_STATUS_SHORT_LABELS: Record<OrderStatus, string> = {
  PENDING: "New",
  CONFIRMED: "Confirmed",
  PREPARING: "Preparing",
  READY: "Ready",
  OUT_FOR_DELIVERY: "Out for delivery",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const CLOSED_ORDER_STATUSES: readonly OrderStatus[] = ["COMPLETED", "CANCELLED"];

export function isActiveOrder(order: Pick<OrderDTO, "status">): boolean {
  return !CLOSED_ORDER_STATUSES.includes(order.status);
}

/** Kitchen stage order used to sort mixed lists: new orders first, closed orders last. */
const ORDER_STAGE: Record<OrderStatus, number> = {
  PENDING: 0,
  CONFIRMED: 1,
  PREPARING: 2,
  READY: 3,
  OUT_FOR_DELIVERY: 4,
  COMPLETED: 5,
  CANCELLED: 6,
};

/**
 * Active orders: earliest stage first, then oldest first (the order that has waited longest).
 * Closed orders: most recently updated first.
 */
export function compareOrders(a: OrderDTO, b: OrderDTO): number {
  const aActive = isActiveOrder(a);
  const bActive = isActiveOrder(b);
  if (aActive !== bActive) return aActive ? -1 : 1;
  if (!aActive) return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
  const stage = ORDER_STAGE[a.status] - ORDER_STAGE[b.status];
  if (stage !== 0) return stage;
  return Date.parse(a.createdAt) - Date.parse(b.createdAt);
}

export interface OrderAction {
  status: OrderStatus;
  label: string;
}

/** The single forward step staff can take next, respecting ORDER_TRANSITIONS and fulfillment. */
export function nextOrderAction(order: Pick<OrderDTO, "status" | "fulfillment">): OrderAction | null {
  const forward = ORDER_TRANSITIONS[order.status].filter(
    (status) =>
      status !== "CANCELLED" && !(status === "OUT_FOR_DELIVERY" && order.fulfillment !== "DELIVERY"),
  );
  const status = forward[0];
  if (!status) return null;

  switch (order.status) {
    case "PENDING":
      return { status, label: "Accept" };
    case "CONFIRMED":
      return { status, label: "Start preparing" };
    case "PREPARING":
      return { status, label: "Mark ready" };
    case "READY":
      return {
        status,
        label: status === "OUT_FOR_DELIVERY" ? "Out for delivery" : "Complete pickup",
      };
    case "OUT_FOR_DELIVERY":
      return { status, label: "Mark delivered" };
    default:
      return null;
  }
}

export function canCancelOrder(status: OrderStatus): boolean {
  return ORDER_TRANSITIONS[status].includes("CANCELLED");
}

// ---------- Reservations ----------

export interface ReservationAction {
  status: ReservationStatus;
  label: string;
  /** Destructive actions are confirmed and styled as secondary. */
  destructive: boolean;
}

const RESERVATION_ACTION_LABELS: Partial<Record<ReservationStatus, string>> = {
  CONFIRMED: "Confirm",
  SEATED: "Seat",
  COMPLETED: "Complete",
  NO_SHOW: "No-show",
  CANCELLED: "Cancel",
};

const DESTRUCTIVE_RESERVATION_STATUSES: readonly ReservationStatus[] = ["NO_SHOW", "CANCELLED"];

export function reservationActions(status: ReservationStatus): ReservationAction[] {
  return RESERVATION_TRANSITIONS[status].map((next) => ({
    status: next,
    label: RESERVATION_ACTION_LABELS[next] ?? next,
    destructive: DESTRUCTIVE_RESERVATION_STATUSES.includes(next),
  }));
}

/** Reservations that still hold covers (not cancelled or no-show). */
export function isLiveReservation(status: ReservationStatus): boolean {
  return !DESTRUCTIVE_RESERVATION_STATUSES.includes(status);
}

// ---------- Dates & times ----------

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** "2026-09-14" + 1 → "2026-09-15" (calendar arithmetic, no time-zone drift). */
export function shiftIsoDate(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** ISO timestamp → "7:02 PM" in the restaurant's time zone (manual formatting keeps SSR and hydration identical). */
export function formatClock(iso: string | number): string {
  return formatTime(restaurantNow(new Date(iso)).time);
}

/** Epoch ms → "7:02:45 PM" in the restaurant's time zone. */
export function formatClockWithSeconds(ms: number): string {
  const date = new Date(ms);
  const [hour, minute] = restaurantNow(date).time.split(":").map(Number);
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${hour12}:${pad(minute)}:${pad(date.getUTCSeconds())} ${suffix}`;
}

/** Elapsed time since `iso`: "Just now", "6 min ago", "1 h 12 min ago". */
export function formatAge(iso: string, now: number): string {
  const minutes = Math.max(0, Math.floor((now - Date.parse(iso)) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h ago` : `${hours} h ${rest} min ago`;
}

export function minutesSince(iso: string, now: number): number {
  return Math.floor((now - Date.parse(iso)) / 60_000);
}

// ---------- Misc ----------

/** "(555) 010-2030" → "tel:5550102030" */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** Human message for a failed admin request, including the API's own message when there is one. */
export function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return "Your staff sign-in has expired. Reload the page to sign in again.";
    }
    return error.message;
  }
  return "Something went wrong. Please try again.";
}
