import type { FulfillmentType } from "@/lib/constants";
import { siteConfig } from "@/lib/site-config";
import type { OrderTotals } from "@/lib/types";

/**
 * Pure pricing used by both the checkout UI (estimates) and the order service (authoritative).
 * The server always recomputes from database prices — client totals are never trusted.
 */
export function calculateTotals(input: {
  subtotalCents: number;
  fulfillment: FulfillmentType;
  tipCents?: number;
}): OrderTotals {
  const { taxRate, deliveryFeeCents, freeDeliveryThresholdCents } = siteConfig.ordering;
  const subtotalCents = Math.max(0, Math.round(input.subtotalCents));
  const taxCents = Math.round(subtotalCents * taxRate);
  const delivery =
    input.fulfillment === "DELIVERY" && subtotalCents < freeDeliveryThresholdCents ? deliveryFeeCents : 0;
  const tipCents = Math.max(0, Math.round(input.tipCents ?? 0));
  return {
    subtotalCents,
    taxCents,
    deliveryFeeCents: delivery,
    tipCents,
    totalCents: subtotalCents + taxCents + delivery + tipCents,
  };
}

/** Tip for a percentage preset, rounded to the cent. */
export function tipFromRate(subtotalCents: number, rate: number): number {
  return Math.round(subtotalCents * rate);
}
