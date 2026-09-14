/**
 * Single source of truth for restaurant facts, business rules and navigation.
 * "Ember House" is a placeholder brand — change it here and the whole site follows.
 */

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday (matches Date#getUTCDay)

export interface OpeningHours {
  day: Weekday;
  label: string;
  /** Restaurant-local 24h times, "HH:mm". `null` = closed. */
  open: string | null;
  close: string | null;
}

export const siteConfig = {
  name: "Ember House",
  tagline: "Wood-fired comfort food",
  description:
    "Ember House is a wood-fired kitchen in Indiranagar, Bengaluru serving smash burgers, blistered pizza, weekend brunch and late-night desserts. Order pickup or delivery, or book a table online.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ogImage:
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=630&q=80&auto=format&fit=crop",

  phone: "080 4123 5678",
  phoneHref: "tel:+918041235678",
  email: "hello@emberhouse.example",
  instagramHandle: "@emberhouse",

  address: {
    street: "100 Feet Road, Indiranagar",
    city: "Bengaluru",
    region: "KA",
    postalCode: "560038",
    country: "IN",
  },
  geo: { lat: 12.9784, lng: 77.6408 },
  /** All reservation dates/times and order pickup times are in this zone. */
  timeZone: "Asia/Kolkata",
  currency: "INR",
  locale: "en-IN",

  hours: [
    { day: 1, label: "Monday", open: "11:30", close: "22:00" },
    { day: 2, label: "Tuesday", open: "11:30", close: "22:00" },
    { day: 3, label: "Wednesday", open: "11:30", close: "22:00" },
    { day: 4, label: "Thursday", open: "11:30", close: "22:00" },
    { day: 5, label: "Friday", open: "11:30", close: "23:30" },
    { day: 6, label: "Saturday", open: "10:00", close: "23:30" },
    { day: 0, label: "Sunday", open: "10:00", close: "21:00" },
  ] satisfies OpeningHours[],

  reservations: {
    slotMinutes: 30,
    /** Max guests seated per 30-minute slot across the dining room. */
    maxCoversPerSlot: 32,
    minPartySize: 1,
    maxPartySize: 10,
    /** Parties larger than maxPartySize are asked to call. */
    largePartyMessage: "Planning for 11 or more? Call us and we'll set up the long table.",
    bookingWindowDays: 60,
    /** Last seating is this many minutes before close. */
    lastSeatingMinutesBeforeClose: 75,
    /** Same-day bookings must be at least this far in the future. */
    minLeadMinutes: 60,
  },

  ordering: {
    taxRate: 0.08875,
    deliveryFeeCents: 399,
    freeDeliveryThresholdCents: 5000,
    minimumDeliverySubtotalCents: 2000,
    deliveryRadiusKm: 5,
    pickupLeadMinutes: 20,
    deliveryLeadMinutes: 45,
    maxQuantityPerLine: 20,
    tipPresets: [0, 0.1, 0.15, 0.2],
  },

  nav: [
    { label: "Menu", href: "/menu" },
    { label: "Order Online", href: "/order" },
    { label: "Reserve", href: "/reserve" },
    { label: "Visit", href: "/visit" },
  ],
} as const;

export const fullAddress = `${siteConfig.address.street}, ${siteConfig.address.city}, ${siteConfig.address.region} ${siteConfig.address.postalCode}`;

export const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`;

export type SiteConfig = typeof siteConfig;
