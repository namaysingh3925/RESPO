/**
 * Data-transfer objects returned by lib/services/* and the REST API.
 * Dates are ISO strings so the same shapes work in Server Components, Route Handlers and the client.
 * Money is always integer cents.
 */
import type {
  DietaryTag,
  FulfillmentType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ReservationStatus,
} from "@/lib/constants";

export interface CategoryDTO {
  id: string;
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
}

export interface MenuItemDTO {
  id: string;
  slug: string;
  categorySlug: string;
  name: string;
  description: string;
  priceCents: number;
  imageUrl: string;
  dietaryTags: DietaryTag[];
  calories: number | null;
  isFeatured: boolean;
  isAvailable: boolean;
  /** e.g. alcohol — shown on the menu but cannot be ordered online. */
  dineInOnly: boolean;
  sortOrder: number;
}

export interface MenuCategoryWithItems extends CategoryDTO {
  items: MenuItemDTO[];
}

export interface TimeSlot {
  /** Restaurant-local "HH:mm" */
  time: string;
  /** Human label, e.g. "7:30 PM" */
  label: string;
  available: boolean;
  remainingCovers: number;
}

export interface AvailabilityDTO {
  /** Restaurant-local "YYYY-MM-DD" */
  date: string;
  partySize: number;
  isOpen: boolean;
  slots: TimeSlot[];
}

export interface ReservationDTO {
  id: string;
  /** Short human-friendly reference, e.g. "EH-7K3Q9P" */
  code: string;
  name: string;
  email: string;
  phone: string;
  partySize: number;
  /** Restaurant-local "YYYY-MM-DD" */
  date: string;
  /** Restaurant-local "HH:mm" */
  time: string;
  occasion: string | null;
  notes: string | null;
  status: ReservationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryAddress {
  line1: string;
  line2: string | null;
  city: string;
  postalCode: string;
  instructions: string | null;
}

export interface OrderItemDTO {
  id: string;
  menuItemSlug: string;
  /** Snapshot at purchase time — menu edits never rewrite history. */
  name: string;
  unitPriceCents: number;
  quantity: number;
  notes: string | null;
  lineTotalCents: number;
}

export interface OrderStatusEventDTO {
  status: OrderStatus;
  at: string;
}

export interface OrderDTO {
  id: string;
  /** Short human-friendly reference used in tracking URLs, e.g. "EH-4XK92M" */
  code: string;
  status: OrderStatus;
  fulfillment: FulfillmentType;
  customerName: string;
  email: string;
  phone: string;
  deliveryAddress: DeliveryAddress | null;
  /** Restaurant-local "HH:mm" for today, or null for ASAP. */
  requestedTime: string | null;
  notes: string | null;
  subtotalCents: number;
  taxCents: number;
  deliveryFeeCents: number;
  tipCents: number;
  totalCents: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  items: OrderItemDTO[];
  statusHistory: OrderStatusEventDTO[];
  estimatedReadyAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderTotals {
  subtotalCents: number;
  taxCents: number;
  deliveryFeeCents: number;
  tipCents: number;
  totalCents: number;
}

/** Error body for every non-2xx API response. */
export interface ApiErrorBody {
  error: {
    code:
      | "VALIDATION_ERROR"
      | "NOT_FOUND"
      | "SLOT_UNAVAILABLE"
      | "ITEM_UNAVAILABLE"
      | "INVALID_TRANSITION"
      | "MINIMUM_NOT_MET"
      | "RESTAURANT_CLOSED"
      | "UNAUTHORIZED"
      | "RATE_LIMITED"
      | "INTERNAL_ERROR";
    message: string;
    /** Field path → messages, present for VALIDATION_ERROR. */
    fieldErrors?: Record<string, string[]>;
  };
}
