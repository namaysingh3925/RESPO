import { siteConfig } from "@/lib/site-config";

const currency = new Intl.NumberFormat(siteConfig.locale, {
  style: "currency",
  currency: siteConfig.currency,
});

/** 63000 → "₹630.00" */
export function formatPrice(cents: number): string {
  return currency.format(cents / 100);
}

/** "19:30" → "7:30 PM" */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** "2026-09-18" → "Friday, September 18" (calendar date, no time-zone shift) */
export function formatDateLabel(isoDate: string, options?: Intl.DateTimeFormatOptions): string {
  const [y, mo, d] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat(siteConfig.locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
    ...options,
  }).format(new Date(Date.UTC(y, mo - 1, d, 12)));
}

/** Current wall-clock date/time in the restaurant's time zone. */
export function restaurantNow(now: Date = new Date()): { date: string; time: string; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: siteConfig.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const date = `${get("year")}-${get("month")}-${get("day")}`;
  const [y, mo, d] = date.split("-").map(Number);
  return {
    date,
    time: `${get("hour")}:${get("minute")}`,
    weekday: new Date(Date.UTC(y, mo - 1, d, 12)).getUTCDay(),
  };
}

/** Minutes since midnight for "HH:mm". */
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Minutes since midnight → "HH:mm". */
export function fromMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
