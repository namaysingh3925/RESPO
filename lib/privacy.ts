import type { OrderDTO } from "@/lib/types";

/** "sam.rivera@example.com" → "s•••@example.com" */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "•••";
  return `${local.slice(0, 1)}•••@${domain}`;
}

/** "(555) 010-2030" → "•••• 2030" */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 4 ? `•••• ${digits.slice(-4)}` : "••••";
}

/** Order as shown on public tracking pages / GET /api/orders/[code]: contact details masked. */
export function toPublicOrder(order: OrderDTO): OrderDTO {
  return {
    ...order,
    email: maskEmail(order.email),
    phone: maskPhone(order.phone),
  };
}
