/**
 * Zod schemas shared by client forms and API route handlers.
 * Client-side validation is for UX; route handlers re-validate every request.
 */
import { z } from "zod";
import {
  FULFILLMENT_TYPES,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  RESERVATION_STATUSES,
} from "@/lib/constants";
import { siteConfig } from "@/lib/site-config";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD");
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use the format HH:mm");

const name = z.string().trim().min(2, "Please enter your name").max(80, "Name is too long");
const email = z.email("Enter a valid email address").trim().toLowerCase().max(254);
const phone = z
  .string()
  .trim()
  .min(7, "Enter a valid phone number")
  .max(20, "Enter a valid phone number")
  .regex(/^[+()\d\s.-]+$/, "Enter a valid phone number");
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep it under ${max} characters`)
    .optional()
    .transform((v) => (v ? v : undefined));

const { minPartySize, maxPartySize } = siteConfig.reservations;
const partySize = z.coerce
  .number()
  .int()
  .min(minPartySize, `Party size must be at least ${minPartySize}`)
  .max(maxPartySize, `For parties over ${maxPartySize}, please call us`);

// ---------- Reservations ----------

export const availabilityQuerySchema = z.object({
  date: isoDate,
  partySize,
});
export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;

export const reservationCreateSchema = z.object({
  date: isoDate,
  time: hhmm,
  partySize,
  name,
  email,
  phone,
  occasion: optionalText(40),
  notes: optionalText(500),
});
export type ReservationCreateInput = z.infer<typeof reservationCreateSchema>;

export const reservationStatusUpdateSchema = z.object({
  status: z.enum(RESERVATION_STATUSES),
});

export const reservationListQuerySchema = z.object({
  date: isoDate.optional(),
  status: z.enum(RESERVATION_STATUSES).optional(),
});

// ---------- Orders ----------

export const orderLineSchema = z.object({
  slug: z.string().trim().min(1).max(120),
  quantity: z.coerce.number().int().min(1).max(siteConfig.ordering.maxQuantityPerLine),
  notes: optionalText(200),
});

export const deliveryAddressSchema = z.object({
  line1: z.string().trim().min(3, "Enter a street address").max(120),
  line2: optionalText(120),
  city: z.string().trim().min(2, "Enter a city").max(60),
  postalCode: z.string().trim().regex(/^\d{6}$/, "Enter a valid 6-digit PIN code"),
  instructions: optionalText(200),
});

export const orderCreateSchema = z
  .object({
    fulfillment: z.enum(FULFILLMENT_TYPES),
    items: z.array(orderLineSchema).min(1, "Your cart is empty").max(50),
    customerName: name,
    email,
    phone,
    deliveryAddress: deliveryAddressSchema.optional(),
    /** null/undefined = ASAP; otherwise restaurant-local "HH:mm" today. */
    requestedTime: hhmm.nullish(),
    tipCents: z.coerce.number().int().min(0).max(100_000).default(0),
    paymentMethod: z.enum(PAYMENT_METHODS).default("PAY_IN_PERSON"),
    notes: optionalText(500),
  })
  .superRefine((value, ctx) => {
    if (value.fulfillment === "DELIVERY" && !value.deliveryAddress) {
      ctx.addIssue({
        code: "custom",
        path: ["deliveryAddress", "line1"],
        message: "A delivery address is required",
      });
    }
    if (value.paymentMethod === "CARD") {
      ctx.addIssue({
        code: "custom",
        path: ["paymentMethod"],
        message: "Card payments are coming soon — please pay in person",
      });
    }
  });
export type OrderCreateInput = z.infer<typeof orderCreateSchema>;
export type OrderCreateFormValues = z.input<typeof orderCreateSchema>;

export const orderStatusUpdateSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});

export const orderListQuerySchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  /** Restaurant-local "YYYY-MM-DD"; defaults to today in the service. */
  date: isoDate.optional(),
});

// ---------- Helpers ----------

/** Flatten a ZodError into `{ "deliveryAddress.line1": ["…"] }` for forms and API responses. */
export function toFieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_form";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}
