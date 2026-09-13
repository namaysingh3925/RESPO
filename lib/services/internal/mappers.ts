/** Prisma row to DTO mappers. Dates become ISO strings; CSV dietary tags become typed arrays. */
import { DIETARY_TAGS, type DietaryTag } from "@/lib/constants";
import type {
  Category,
  MenuItem,
  Order,
  OrderItem,
  OrderStatusEvent,
  Reservation,
} from "@/lib/generated/prisma/client";
import type { CategoryDTO, MenuItemDTO, OrderDTO, OrderItemDTO, ReservationDTO } from "@/lib/types";

const KNOWN_TAGS = new Set<string>(DIETARY_TAGS);

/** "vegan,gluten-free" to ["vegan", "gluten-free"]; unknown and duplicate tags are dropped. */
export function parseDietaryTags(csv: string | null | undefined): DietaryTag[] {
  if (!csv) return [];
  const tags = csv
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag): tag is DietaryTag => KNOWN_TAGS.has(tag));
  return [...new Set(tags)];
}

/** ["vegan", "gluten-free"] to "vegan,gluten-free" (known tags only, de-duplicated). */
export function serializeDietaryTags(tags: readonly string[]): string {
  return parseDietaryTags(tags.join(",")).join(",");
}

export function toCategoryDTO(category: Category): CategoryDTO {
  return {
    id: category.id,
    slug: category.slug,
    name: category.name,
    description: category.description,
    sortOrder: category.sortOrder,
  };
}

export function toMenuItemDTO(item: MenuItem, categorySlug: string): MenuItemDTO {
  return {
    id: item.id,
    slug: item.slug,
    categorySlug,
    name: item.name,
    description: item.description,
    priceCents: item.priceCents,
    imageUrl: item.imageUrl,
    dietaryTags: parseDietaryTags(item.dietaryTags),
    calories: item.calories,
    isFeatured: item.isFeatured,
    isAvailable: item.isAvailable,
    dineInOnly: item.dineInOnly,
    sortOrder: item.sortOrder,
  };
}

export function toReservationDTO(reservation: Reservation): ReservationDTO {
  return {
    id: reservation.id,
    code: reservation.code,
    name: reservation.name,
    email: reservation.email,
    phone: reservation.phone,
    partySize: reservation.partySize,
    date: reservation.date,
    time: reservation.time,
    occasion: reservation.occasion,
    notes: reservation.notes,
    status: reservation.status,
    createdAt: reservation.createdAt.toISOString(),
    updatedAt: reservation.updatedAt.toISOString(),
  };
}

export type OrderWithRelations = Order & { items: OrderItem[]; statusEvents: OrderStatusEvent[] };

/** Prisma `include` for everything toOrderDTO needs, with the timeline oldest-first. */
export const orderInclude = {
  items: true,
  statusEvents: { orderBy: [{ createdAt: "asc" as const }, { id: "asc" as const }] },
};

function toOrderItemDTO(item: OrderItem): OrderItemDTO {
  return {
    id: item.id,
    menuItemSlug: item.menuItemSlug,
    name: item.name,
    unitPriceCents: item.unitPriceCents,
    quantity: item.quantity,
    notes: item.notes,
    lineTotalCents: item.lineTotalCents,
  };
}

export function toOrderDTO(order: OrderWithRelations): OrderDTO {
  const hasAddress = order.fulfillment === "DELIVERY" && Boolean(order.deliveryLine1);
  return {
    id: order.id,
    code: order.code,
    status: order.status,
    fulfillment: order.fulfillment,
    customerName: order.customerName,
    email: order.email,
    phone: order.phone,
    deliveryAddress: hasAddress
      ? {
          line1: order.deliveryLine1 ?? "",
          line2: order.deliveryLine2,
          city: order.deliveryCity ?? "",
          postalCode: order.deliveryPostalCode ?? "",
          instructions: order.deliveryInstructions,
        }
      : null,
    requestedTime: order.requestedTime,
    notes: order.notes,
    subtotalCents: order.subtotalCents,
    taxCents: order.taxCents,
    deliveryFeeCents: order.deliveryFeeCents,
    tipCents: order.tipCents,
    totalCents: order.totalCents,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    items: order.items.map(toOrderItemDTO),
    statusHistory: [...order.statusEvents]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((event) => ({ status: event.status, at: event.createdAt.toISOString() })),
    estimatedReadyAt: order.estimatedReadyAt ? order.estimatedReadyAt.toISOString() : null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}
