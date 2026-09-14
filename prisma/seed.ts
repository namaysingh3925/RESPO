/**
 * Ember House seed — safe to run any number of times (`npm run db:seed`).
 *
 * 1. Menu: categories and dishes are upserted by slug from lib/data/menu.ts, so the database always
 *    mirrors that file. Dishes/categories that were removed from the file are deleted (past order lines
 *    keep their name/price snapshots; their menuItemId becomes null).
 * 2. Staff: the ADMIN user is upserted by email.
 * 3. Sample activity: reservations for today and tomorrow plus four orders in different states.
 *    Sample rows are recognised by their SAMPLE_EMAIL_DOMAIN, deleted and recreated on every run, so
 *    real bookings and orders are never touched.
 */
import "dotenv/config";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import type { FulfillmentType, OrderStatus, ReservationStatus } from "../lib/constants";
import { seedCategories, seedMenuItems, PHOTOS, unsplash } from "../lib/data/menu";
import { fromMinutes, restaurantNow, toMinutes } from "../lib/format";
import { PrismaClient } from "../lib/generated/prisma/client";
import { calculateTotals } from "../lib/pricing";
import { siteConfig } from "../lib/site-config";
import { generatePublicCode } from "../lib/services/internal/codes";
import { DEFAULT_DATABASE_URL, resolveSqliteUrl } from "../lib/services/internal/database-url";
import { serializeDietaryTags } from "../lib/services/internal/mappers";
import { reservationDayPlan, type RestaurantClock } from "../lib/services/internal/schedule";
import { addDays, restaurantDayUtcRange, toZonedDateTime } from "../lib/services/internal/time";

const ADMIN_EMAIL = "admin@emberhouse.example";
/** Every sample booking/order uses this email domain, which is how re-runs find and replace them. */
const SAMPLE_EMAIL_DOMAIN = "sample.emberhouse.example";
const MINUTE_MS = 60_000;

const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: resolveSqliteUrl(process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL) }),
});

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

const sampleEmail = (localPart: string) => `${localPart}@${SAMPLE_EMAIL_DOMAIN}`;

// ---------------------------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------------------------

async function seedMenu(): Promise<Map<string, { id: string; name: string; priceCents: number; dineInOnly: boolean }>> {
  const categoryIds = new Map<string, string>();

  for (const [index, category] of seedCategories.entries()) {
    const data = { name: category.name, description: category.description, sortOrder: index, isActive: true };
    const row = await db.category.upsert({
      where: { slug: category.slug },
      create: { slug: category.slug, ...data },
      update: data,
      select: { id: true },
    });
    categoryIds.set(category.slug, row.id);
  }

  const items = new Map<string, { id: string; name: string; priceCents: number; dineInOnly: boolean }>();
  for (const [index, item] of seedMenuItems.entries()) {
    const categoryId = categoryIds.get(item.categorySlug);
    if (!categoryId) {
      throw new Error(`Menu item "${item.slug}" references unknown category "${item.categorySlug}"`);
    }
    const data = {
      categoryId,
      name: item.name,
      description: item.description,
      priceCents: item.priceCents,
      imageUrl: unsplash(PHOTOS[item.photo]),
      dietaryTags: serializeDietaryTags(item.dietaryTags),
      calories: item.calories ?? null,
      isFeatured: item.isFeatured ?? false,
      isAvailable: true,
      dineInOnly: item.dineInOnly ?? false,
      sortOrder: index,
    };
    const row = await db.menuItem.upsert({
      where: { slug: item.slug },
      create: { slug: item.slug, ...data },
      update: data,
      select: { id: true, name: true, priceCents: true, dineInOnly: true },
    });
    items.set(item.slug, row);
  }

  const staleItems = await db.menuItem.deleteMany({ where: { slug: { notIn: seedMenuItems.map((i) => i.slug) } } });
  const staleCategories = await db.category.deleteMany({
    where: { slug: { notIn: seedCategories.map((c) => c.slug) } },
  });

  console.log(
    `  menu: ${seedCategories.length} categories, ${seedMenuItems.length} dishes upserted` +
      (staleItems.count || staleCategories.count
        ? ` (removed ${staleItems.count} stale dishes, ${staleCategories.count} stale categories)`
        : ""),
  );
  return items;
}

// ---------------------------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------------------------

async function seedAdmin(): Promise<void> {
  await db.user.upsert({
    where: { email: ADMIN_EMAIL },
    create: { email: ADMIN_EMAIL, name: "Ember House Admin", phone: siteConfig.phone, role: "ADMIN" },
    update: { name: "Ember House Admin", role: "ADMIN" },
  });
  console.log(`  staff: ${ADMIN_EMAIL} (ADMIN)`);
}

// ---------------------------------------------------------------------------------------------
// Sample reservations
// ---------------------------------------------------------------------------------------------

interface SampleGuest {
  name: string;
  email: string;
  phone: string;
  partySize: number;
  /** Preferred wall-clock time; snapped to the nearest bookable slot for that day. */
  around: string;
  occasion?: string;
  notes?: string;
}

const TODAY_GUESTS: SampleGuest[] = [
  { name: "Maya Chen", email: sampleEmail("maya.chen"), phone: "(555) 010-4417", partySize: 2, around: "12:00" },
  { name: "Jordan Ellis", email: sampleEmail("jordan.ellis"), phone: "(555) 010-3382", partySize: 4, around: "12:30", notes: "One high chair, please" },
  { name: "Priya Raman", email: sampleEmail("priya.raman"), phone: "(555) 010-9924", partySize: 3, around: "13:00" },
  { name: "Luis Ortega", email: sampleEmail("luis.ortega"), phone: "(555) 010-1175", partySize: 2, around: "18:00", occasion: "Anniversary", notes: "Quiet table if possible" },
  { name: "Hannah Brooks", email: sampleEmail("hannah.brooks"), phone: "(555) 010-6630", partySize: 6, around: "18:30", occasion: "Birthday", notes: "Bringing a cake — can you hold it in the fridge?" },
  { name: "Theo Park", email: sampleEmail("theo.park"), phone: "(555) 010-2208", partySize: 2, around: "19:00" },
  { name: "Grace Okafor", email: sampleEmail("grace.okafor"), phone: "(555) 010-5541", partySize: 5, around: "19:30", notes: "One guest is gluten-free" },
  { name: "Sam Rivera", email: sampleEmail("sam.rivera"), phone: "(555) 010-2030", partySize: 4, around: "20:00" },
];

const TOMORROW_GUESTS: SampleGuest[] = [
  { name: "Nadia Haddad", email: sampleEmail("nadia.haddad"), phone: "(555) 010-7713", partySize: 2, around: "12:30" },
  { name: "Ben Whitaker", email: sampleEmail("ben.whitaker"), phone: "(555) 010-8850", partySize: 8, around: "18:00", occasion: "Work dinner", notes: "Long table, please" },
  { name: "Aisha Johnson", email: sampleEmail("aisha.johnson"), phone: "(555) 010-3319", partySize: 2, around: "19:00", occasion: "Date night" },
  { name: "Marco Bellini", email: sampleEmail("marco.bellini"), phone: "(555) 010-4486", partySize: 3, around: "19:30" },
  { name: "Emily Tran", email: sampleEmail("emily.tran"), phone: "(555) 010-6127", partySize: 4, around: "20:00" },
];

/** All bookable slot times for a date, ignoring the same-day lead time (sample data may sit in the past). */
function allSlotsFor(date: string, now: RestaurantClock): string[] {
  const plan = reservationDayPlan(date, { ...now, time: "00:00" });
  return plan.status === "open" ? plan.times : [];
}

function nearestSlot(slots: string[], around: string): string {
  const target = toMinutes(around);
  return slots.reduce((best, slot) =>
    Math.abs(toMinutes(slot) - target) < Math.abs(toMinutes(best) - target) ? slot : best,
  );
}

/** Today: past slots are completed (one no-show), the current hour is seated, later ones confirmed. */
function todayStatus(slot: string, nowMinutes: number, index: number): ReservationStatus {
  const start = toMinutes(slot);
  if (start + 90 <= nowMinutes) return index === 1 ? "NO_SHOW" : "COMPLETED";
  if (start <= nowMinutes) return "SEATED";
  if (index === TODAY_GUESTS.length - 1) return "PENDING";
  if (index === 5) return "CANCELLED";
  return "CONFIRMED";
}

function tomorrowStatus(index: number): ReservationStatus {
  if (index === 3) return "PENDING";
  if (index === 4) return "CANCELLED";
  return "CONFIRMED";
}

async function seedReservations(tx: Tx, now: RestaurantClock): Promise<number> {
  const days = [
    { date: now.date, guests: TODAY_GUESTS, status: (slot: string, i: number) => todayStatus(slot, toMinutes(now.time), i) },
    { date: addDays(now.date, 1), guests: TOMORROW_GUESTS, status: (_slot: string, i: number) => tomorrowStatus(i) },
  ];

  let created = 0;
  for (const day of days) {
    const slots = allSlotsFor(day.date, now);
    if (slots.length === 0) {
      console.log(`  reservations: closed on ${day.date}, no sample bookings`);
      continue;
    }
    for (const [index, guest] of day.guests.entries()) {
      const time = nearestSlot(slots, guest.around);
      await tx.reservation.create({
        data: {
          code: generatePublicCode(),
          name: guest.name,
          email: guest.email,
          phone: guest.phone,
          partySize: guest.partySize,
          date: day.date,
          time,
          occasion: guest.occasion ?? null,
          notes: guest.notes ?? null,
          status: day.status(time, index),
        },
      });
      created++;
    }
  }
  return created;
}

// ---------------------------------------------------------------------------------------------
// Sample orders
// ---------------------------------------------------------------------------------------------

interface SampleOrder {
  customerName: string;
  email: string;
  phone: string;
  fulfillment: FulfillmentType;
  /** Final status; the timeline walks the normal path to it. */
  status: OrderStatus;
  placedMinutesAgo: number;
  /** Minutes between consecutive status events after the order was placed. */
  stepMinutes: number;
  lines: { slug: string; quantity: number; notes?: string }[];
  tipRate: number;
  scheduled?: boolean;
  notes?: string;
  address?: { line1: string; line2?: string; city: string; postalCode: string; instructions?: string };
}

const SAMPLE_ORDERS: SampleOrder[] = [
  {
    customerName: "Sam Rivera",
    email: sampleEmail("sam.rivera"),
    phone: "(555) 010-2030",
    fulfillment: "PICKUP",
    status: "PENDING",
    placedMinutesAgo: 3,
    stepMinutes: 0,
    lines: [
      { slug: "smash-double-burger", quantity: 2, notes: "No pickles" },
      { slug: "truffle-parmesan-fries", quantity: 1 },
      { slug: "fresh-mint-lemonade", quantity: 2 },
    ],
    tipRate: 0.15,
  },
  {
    customerName: "Grace Okafor",
    email: sampleEmail("grace.okafor"),
    phone: "(555) 010-5541",
    fulfillment: "DELIVERY",
    status: "PREPARING",
    placedMinutesAgo: 18,
    stepMinutes: 4,
    lines: [
      { slug: "ember-margherita", quantity: 1 },
      { slug: "harvest-bowl", quantity: 2 },
      { slug: "salted-fudge-brownie", quantity: 1 },
    ],
    tipRate: 0.2,
    notes: "Extra napkins, please",
    address: { line1: "12th Main Road", line2: "Flat 4", city: "Bengaluru", postalCode: "560038", instructions: "Buzz 4, third floor" },
  },
  {
    customerName: "Theo Park",
    email: sampleEmail("theo.park"),
    phone: "(555) 010-2208",
    fulfillment: "PICKUP",
    status: "READY",
    placedMinutesAgo: 40,
    stepMinutes: 9,
    lines: [
      { slug: "steak-frites", quantity: 1, notes: "Medium rare" },
      { slug: "classic-tiramisu", quantity: 1 },
    ],
    tipRate: 0.1,
    scheduled: true,
  },
  {
    customerName: "Hannah Brooks",
    email: sampleEmail("hannah.brooks"),
    phone: "(555) 010-6630",
    fulfillment: "DELIVERY",
    status: "COMPLETED",
    placedMinutesAgo: 75,
    stepMinutes: 12,
    lines: [
      { slug: "brisket-stack", quantity: 2 },
      { slug: "penne-arrabbiata", quantity: 1 },
      { slug: "cookies-cream-shake", quantity: 2 },
    ],
    tipRate: 0.18,
    address: { line1: "4th Cross, Domlur Layout", city: "Bengaluru", postalCode: "560071" },
  },
];

function timelineFor(order: SampleOrder): OrderStatus[] {
  const path: OrderStatus[] =
    order.fulfillment === "DELIVERY"
      ? ["PENDING", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "COMPLETED"]
      : ["PENDING", "CONFIRMED", "PREPARING", "READY", "COMPLETED"];
  return path.slice(0, path.indexOf(order.status) + 1);
}

async function seedOrders(
  tx: Tx,
  now: RestaurantClock,
  menu: Map<string, { id: string; name: string; priceCents: number; dineInOnly: boolean }>,
): Promise<string[]> {
  const nowMs = Date.now();
  // Keep every sample order inside today's restaurant-local day, so it shows on the admin board. When the
  // seed runs shortly after midnight, the whole sample history is compressed into the time since midnight.
  const dayStartMs = restaurantDayUtcRange(now.date).start.getTime();
  const longestHistoryMs = Math.max(...SAMPLE_ORDERS.map((o) => o.placedMinutesAgo)) * MINUTE_MS;
  const scale = Math.min(1, Math.max(0, nowMs - dayStartMs - MINUTE_MS) / longestHistoryMs);
  const codes: string[] = [];

  for (const sample of SAMPLE_ORDERS) {
    const lines = sample.lines.map((line) => {
      const item = menu.get(line.slug);
      if (!item) throw new Error(`Sample order references unknown dish "${line.slug}"`);
      if (item.dineInOnly) throw new Error(`Sample order references dine-in-only dish "${line.slug}"`);
      return {
        menuItemId: item.id,
        menuItemSlug: line.slug,
        name: item.name,
        unitPriceCents: item.priceCents,
        quantity: line.quantity,
        notes: line.notes ?? null,
        lineTotalCents: item.priceCents * line.quantity,
      };
    });

    const subtotalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);
    if (sample.fulfillment === "DELIVERY" && subtotalCents < siteConfig.ordering.minimumDeliverySubtotalCents) {
      throw new Error(`Sample delivery order for ${sample.customerName} is under the delivery minimum`);
    }
    const totals = calculateTotals({
      subtotalCents,
      fulfillment: sample.fulfillment,
      tipCents: Math.round(subtotalCents * sample.tipRate),
    });

    const placedAt = Math.round(nowMs - sample.placedMinutesAgo * MINUTE_MS * scale);
    const events = timelineFor(sample).map((status, step) => ({
      status,
      createdAt: new Date(Math.min(nowMs, Math.round(placedAt + step * sample.stepMinutes * MINUTE_MS * scale))),
    }));
    const lastEventAt = events[events.length - 1].createdAt;

    const leadMinutes =
      sample.fulfillment === "DELIVERY" ? siteConfig.ordering.deliveryLeadMinutes : siteConfig.ordering.pickupLeadMinutes;
    let estimatedReadyAt = new Date(placedAt + leadMinutes * MINUTE_MS);
    let requestedTime: string | null = null;
    if (sample.scheduled) {
      // Scheduled for the next 5-minute mark after the lead time, if that's still today.
      const readyAt = toZonedDateTime(estimatedReadyAt);
      const rounded = Math.ceil(toMinutes(readyAt.time) / 5) * 5;
      if (readyAt.date === now.date && rounded < 24 * 60) {
        requestedTime = fromMinutes(rounded);
        estimatedReadyAt = new Date(estimatedReadyAt.getTime() + (rounded - toMinutes(readyAt.time)) * MINUTE_MS);
      }
    }

    const order = await tx.order.create({
      data: {
        code: generatePublicCode(),
        status: sample.status,
        fulfillment: sample.fulfillment,
        customerName: sample.customerName,
        email: sample.email,
        phone: sample.phone,
        deliveryLine1: sample.address?.line1 ?? null,
        deliveryLine2: sample.address?.line2 ?? null,
        deliveryCity: sample.address?.city ?? null,
        deliveryPostalCode: sample.address?.postalCode ?? null,
        deliveryInstructions: sample.address?.instructions ?? null,
        requestedTime,
        notes: sample.notes ?? null,
        ...totals,
        paymentMethod: "PAY_IN_PERSON",
        paymentStatus: sample.status === "COMPLETED" ? "PAID" : "UNPAID",
        estimatedReadyAt,
        createdAt: new Date(placedAt),
        updatedAt: lastEventAt,
        items: { create: lines },
        statusEvents: { create: events },
      },
      select: { code: true },
    });
    codes.push(`${order.code} (${sample.fulfillment.toLowerCase()}, ${sample.status})`);
  }
  return codes;
}

// ---------------------------------------------------------------------------------------------

async function main() {
  const now = restaurantNow();
  console.log(`Seeding Ember House (restaurant time ${now.date} ${now.time}, ${siteConfig.timeZone})`);

  const menu = await seedMenu();
  await seedAdmin();

  const { reservations, orders, removed } = await db.$transaction(async (tx) => {
    const samples = { email: { endsWith: `@${SAMPLE_EMAIL_DOMAIN}` } };
    const removedOrders = await tx.order.deleteMany({ where: samples });
    const removedReservations = await tx.reservation.deleteMany({ where: samples });
    return {
      removed: removedOrders.count + removedReservations.count,
      reservations: await seedReservations(tx, now),
      orders: await seedOrders(tx, now, menu),
    };
  });

  if (removed > 0) console.log(`  samples: replaced ${removed} previous sample rows`);
  console.log(`  reservations: ${reservations} sample bookings for ${now.date} and ${addDays(now.date, 1)}`);
  console.log(`  orders: ${orders.length} sample orders`);
  for (const code of orders) console.log(`    ${code}`);
  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
