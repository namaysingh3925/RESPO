#!/usr/bin/env node
/**
 * Ember House REST API smoke test — dependency-free (Node 18+ global fetch).
 *
 *   npm run smoke:api                                  # against http://localhost:3000
 *   BASE_URL=http://localhost:3101 npm run smoke:api   # any running `next dev` / `next start`
 *
 * Staff credentials come from ADMIN_USER / ADMIN_PASSWORD in the environment, then .env, then the dev
 * defaults (admin / emberhouse). Online orders need ENFORCE_BUSINESS_HOURS="false" outside opening hours.
 *
 * Re-runnable: every run books with a unique email and walks its own order and booking to a final state,
 * so no capacity is left held. Prints one PASS/FAIL line per check and exits 1 if anything failed.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
/** Mirrors lib/site-config.ts (timeZone, ordering.taxRate, ordering.minimumDeliverySubtotalCents). */
const TIME_ZONE = "America/New_York";
const TAX_RATE = 0.08875;
const REQUEST_TIMEOUT_MS = 120_000; // the first hit of each route compiles it under `next dev`

const RUN_ID = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const results = [];

// ---------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------

function readDotEnv() {
  const file = path.join(ROOT, ".env");
  if (!existsSync(file)) return {};
  const values = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!match || line.trim().startsWith("#")) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, "");
    }
    values[match[1]] = value;
  }
  return values;
}

const dotEnv = readDotEnv();
const ADMIN_USER = process.env.ADMIN_USER ?? dotEnv.ADMIN_USER ?? "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? dotEnv.ADMIN_PASSWORD ?? "emberhouse";
const ADMIN_AUTH = `Basic ${Buffer.from(`${ADMIN_USER}:${ADMIN_PASSWORD}`, "utf8").toString("base64")}`;

class CheckError extends Error {}

function assert(condition, message) {
  if (!condition) throw new CheckError(message);
}

function assertStatus(res, expected) {
  assert(
    res.status === expected,
    `expected HTTP ${expected}, got ${res.status}` +
      (res.body?.error ? ` ${res.body.error.code}: ${res.body.error.message}` : "") +
      (res.body?.error?.fieldErrors ? ` ${JSON.stringify(res.body.error.fieldErrors)}` : ""),
  );
}

function assertErrorCode(res, status, code) {
  assertStatus(res, status);
  assert(res.body?.error?.code === code, `expected error code ${code}, got ${JSON.stringify(res.body?.error?.code)}`);
  assert(typeof res.body.error.message === "string" && res.body.error.message.length > 0, "error message is missing");
}

/** fetch wrapper: JSON in/out, never throws for HTTP errors. `auth: true` sends the staff credentials. */
async function api(method, urlPath, { json, raw, auth, headers = {} } = {}) {
  const res = await fetch(`${BASE_URL}${urlPath}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(json !== undefined || raw !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(auth === true ? { Authorization: ADMIN_AUTH } : typeof auth === "string" ? { Authorization: auth } : {}),
      ...headers,
    },
    body: raw ?? (json !== undefined ? JSON.stringify(json) : undefined),
    redirect: "manual",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  return { status: res.status, headers: res.headers, body, text };
}

/** Runs one named check and records PASS/FAIL. Returns the callback's value, or undefined on failure. */
async function check(name, fn) {
  try {
    const value = await fn();
    results.push({ name, ok: true });
    console.log(`PASS  ${name}`);
    return value ?? true;
  } catch (error) {
    const detail = error instanceof CheckError ? error.message : `${error?.name ?? "Error"}: ${error?.message ?? error}`;
    results.push({ name, ok: false });
    console.log(`FAIL  ${name}\n      ${detail}`);
    return undefined;
  }
}

/** Marks a check as failed because an earlier step it depends on failed. */
function skipped(name, reason) {
  results.push({ name, ok: false });
  console.log(`FAIL  ${name}\n      skipped: ${reason}`);
}

/** Restaurant-local calendar date `offsetDays` from today, as YYYY-MM-DD. */
function restaurantDate(offsetDays = 0) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type) => Number(parts.find((p) => p.type === type)?.value);
  const date = new Date(Date.UTC(get("year"), get("month") - 1, get("day") + offsetDays, 12));
  return date.toISOString().slice(0, 10);
}

/** Unique contact details for this run. Reservations take `name`; orders take `customerName` (see customer()). */
const guest = (label) => ({
  name: `Smoke Test ${label}`,
  email: `smoke.${label}.${RUN_ID}@example.com`,
  phone: "(555) 010-9000",
});

const customer = (label) => {
  const { name, ...contact } = guest(label);
  return { customerName: name, ...contact };
};

// ---------------------------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------------------------

async function main() {
  console.log(`Ember House API smoke test → ${BASE_URL} (run ${RUN_ID})\n`);

  try {
    await fetch(`${BASE_URL}/api/menu`, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch (error) {
    console.log(`FAIL  server reachable\n      ${error?.cause?.code ?? error?.message ?? error} — is the app running at ${BASE_URL}?`);
    process.exit(1);
  }

  // ----- Menu -----
  const menu = await check("GET /api/menu returns 6 categories with dishes", async () => {
    const res = await api("GET", "/api/menu");
    assertStatus(res, 200);
    const categories = res.body?.categories;
    assert(Array.isArray(categories), "response has no categories array");
    assert(categories.length === 6, `expected 6 categories, got ${categories.length}`);
    assert(categories.every((c) => Array.isArray(c.items) && c.items.length > 0), "a category has no items");
    return new Map(categories.flatMap((c) => c.items).map((item) => [item.slug, item]));
  });

  await check("GET /api/menu?dietary=vegan only returns vegan dishes", async () => {
    const res = await api("GET", "/api/menu?dietary=vegan");
    assertStatus(res, 200);
    const items = res.body.categories.flatMap((c) => c.items);
    assert(items.length > 0, "no vegan dishes returned");
    assert(items.every((item) => item.dietaryTags.includes("vegan")), "a non-vegan dish was returned");
  });

  await check("GET /api/menu?dietary=paleo → 422 VALIDATION_ERROR", async () => {
    assertErrorCode(await api("GET", "/api/menu?dietary=paleo"), 422, "VALIDATION_ERROR");
  });

  await check("GET /api/menu/smash-double-burger returns the dish", async () => {
    const res = await api("GET", "/api/menu/smash-double-burger");
    assertStatus(res, 200);
    assert(res.body?.slug === "smash-double-burger", `unexpected slug ${res.body?.slug}`);
    assert(Number.isInteger(res.body.priceCents) && res.body.priceCents > 0, "priceCents is not a positive integer");
    assert(res.body.categorySlug === "burgers-grill", `unexpected categorySlug ${res.body.categorySlug}`);
  });

  await check("GET /api/menu/not-a-dish → 404 NOT_FOUND", async () => {
    assertErrorCode(await api("GET", "/api/menu/not-a-dish"), 404, "NOT_FOUND");
  });

  // ----- Reservations -----
  const bookingDate = restaurantDate(3);
  const partySize = 2;
  const slot = await check(`GET /api/reservations/availability (${bookingDate}) has open slots`, async () => {
    const res = await api("GET", `/api/reservations/availability?date=${bookingDate}&partySize=${partySize}`);
    assertStatus(res, 200);
    assert(res.body?.date === bookingDate && res.body.partySize === partySize, "echoed date/partySize mismatch");
    assert(res.body.isOpen === true, "restaurant reported closed");
    const open = res.body.slots.filter((s) => s.available && s.remainingCovers >= partySize);
    assert(open.length > 0, `no available slots (of ${res.body.slots.length})`);
    return open[Math.floor(Math.random() * open.length)];
  });

  await check("GET /api/reservations/availability?date=2026-02-30 → 422", async () => {
    assertErrorCode(await api("GET", "/api/reservations/availability?date=2026-02-30&partySize=2"), 422, "VALIDATION_ERROR");
  });

  const booker = guest("booking");
  const bookingBody = slot
    ? { date: bookingDate, time: slot.time, partySize, ...booker, occasion: "Birthday", notes: "Smoke test booking" }
    : null;

  const reservation = bookingBody
    ? await check("POST /api/reservations → 201 CONFIRMED", async () => {
        const res = await api("POST", "/api/reservations", { json: bookingBody });
        assertStatus(res, 201);
        assert(/^EH-[0-9A-Z]{6}$/.test(res.body?.code ?? ""), `unexpected code ${res.body?.code}`);
        assert(res.body.status === "CONFIRMED", `expected CONFIRMED, got ${res.body.status}`);
        assert(res.body.time === slot.time && res.body.date === bookingDate, "date/time not echoed");
        return res.body;
      })
    : skipped("POST /api/reservations → 201 CONFIRMED", "no available slot");

  if (bookingBody && reservation) {
    await check("POST /api/reservations duplicate → 409 SLOT_UNAVAILABLE", async () => {
      assertErrorCode(await api("POST", "/api/reservations", { json: bookingBody }), 409, "SLOT_UNAVAILABLE");
    });

    await check("GET /api/reservations/[code] with the matching email → 200", async () => {
      const res = await api("GET", `/api/reservations/${reservation.code}?email=${encodeURIComponent(booker.email.toUpperCase())}`);
      assertStatus(res, 200);
      assert(res.body?.id === reservation.id, "returned a different booking");
    });

    await check("GET /api/reservations/[code] with a wrong email → 404 (same as unknown code)", async () => {
      const wrong = await api("GET", `/api/reservations/${reservation.code}?email=someone.else@example.com`);
      const unknown = await api("GET", `/api/reservations/EH-000000?email=${encodeURIComponent(booker.email)}`);
      assertErrorCode(wrong, 404, "NOT_FOUND");
      assertErrorCode(unknown, 404, "NOT_FOUND");
      assert(wrong.text === unknown.text, "wrong-email and unknown-code responses differ");
    });
  } else {
    skipped("POST /api/reservations duplicate → 409 SLOT_UNAVAILABLE", "booking was not created");
  }

  await check("POST /api/reservations with a bad email → 422 fieldErrors.email", async () => {
    const res = await api("POST", "/api/reservations", {
      json: { date: bookingDate, time: slot?.time ?? "19:00", partySize, ...guest("bad-email"), email: "not-an-email" },
    });
    assertErrorCode(res, 422, "VALIDATION_ERROR");
    assert(Array.isArray(res.body.error.fieldErrors?.email), `fieldErrors.email missing: ${JSON.stringify(res.body.error.fieldErrors)}`);
  });

  await check("POST /api/reservations with malformed JSON → 422 VALIDATION_ERROR", async () => {
    assertErrorCode(await api("POST", "/api/reservations", { raw: '{"date": "2026-' }), 422, "VALIDATION_ERROR");
  });

  // ----- Orders -----
  const buyer = customer("order");
  const order = menu
    ? await check("POST /api/orders (pickup) → 201 with server-computed totals", async () => {
        const burger = menu.get("smash-double-burger");
        const lemonade = menu.get("fresh-mint-lemonade");
        assert(burger && lemonade, "seed dishes missing from the menu");
        const res = await api("POST", "/api/orders", {
          json: {
            fulfillment: "PICKUP",
            items: [
              // Bogus client prices: the server must ignore every one of them.
              { slug: burger.slug, quantity: 2, notes: "No pickles", priceCents: 1, unitPriceCents: 1 },
              { slug: lemonade.slug, quantity: 1, priceCents: 1, lineTotalCents: 1 },
            ],
            ...buyer,
            requestedTime: null,
            tipCents: 300,
            paymentMethod: "PAY_IN_PERSON",
            subtotalCents: 1,
            taxCents: 0,
            totalCents: 1,
            status: "COMPLETED",
          },
        });
        if (res.status === 409 && res.body?.error?.code === "RESTAURANT_CLOSED") {
          throw new CheckError(`${res.body.error.message} (set ENFORCE_BUSINESS_HOURS="false" to smoke-test outside opening hours)`);
        }
        assertStatus(res, 201);
        const o = res.body;
        const subtotal = burger.priceCents * 2 + lemonade.priceCents;
        assert(o.subtotalCents === subtotal, `subtotal ${o.subtotalCents} ≠ menu prices ${subtotal}`);
        assert(o.taxCents === Math.round(subtotal * TAX_RATE), `tax ${o.taxCents} ≠ ${Math.round(subtotal * TAX_RATE)}`);
        assert(o.deliveryFeeCents === 0 && o.tipCents === 300, "unexpected delivery fee or tip");
        assert(o.totalCents === o.subtotalCents + o.taxCents + o.deliveryFeeCents + o.tipCents, "total doesn't add up");
        assert(o.status === "PENDING" && o.paymentStatus === "UNPAID", `unexpected status ${o.status}/${o.paymentStatus}`);
        assert(o.items.every((line) => line.unitPriceCents === menu.get(line.menuItemSlug)?.priceCents), "a line kept a client price");
        assert(o.email === buyer.email, "creator response should include the full email");
        assert(o.statusHistory.length === 1 && o.statusHistory[0].status === "PENDING", "missing PENDING status event");
        return o;
      })
    : skipped("POST /api/orders (pickup) → 201 with server-computed totals", "menu unavailable");

  await check("POST /api/orders delivery under the minimum → 422 MINIMUM_NOT_MET", async () => {
    const res = await api("POST", "/api/orders", {
      json: {
        fulfillment: "DELIVERY",
        items: [{ slug: "flat-white", quantity: 1 }],
        ...customer("delivery"),
        deliveryAddress: { line1: "88 Kent Ave", city: "Brooklyn", postalCode: "11211" },
      },
    });
    assertErrorCode(res, 422, "MINIMUM_NOT_MET");
  });

  await check("POST /api/orders with a dine-in-only cocktail → 409 ITEM_UNAVAILABLE", async () => {
    const res = await api("POST", "/api/orders", {
      json: { fulfillment: "PICKUP", items: [{ slug: "smoked-old-fashioned", quantity: 1 }], ...customer("cocktail") },
    });
    assertErrorCode(res, 409, "ITEM_UNAVAILABLE");
  });

  if (order) {
    await check("GET /api/orders/[code] masks email and phone", async () => {
      const res = await api("GET", `/api/orders/${order.code.toLowerCase()}`);
      assertStatus(res, 200);
      assert(res.body?.code === order.code, "returned a different order");
      assert(res.body.email !== buyer.email && res.body.email.includes("•••"), `email not masked: ${res.body.email}`);
      assert(res.body.email.endsWith("@example.com"), `masked email lost its domain: ${res.body.email}`);
      assert(res.body.phone === "•••• 9000", `phone not masked: ${res.body.phone}`);
      assert(res.body.totalCents === order.totalCents, "tracking totals differ from the created order");
    });
  } else {
    skipped("GET /api/orders/[code] masks email and phone", "order was not created");
  }

  await check("GET /api/orders/EH-000000 → 404 NOT_FOUND", async () => {
    assertErrorCode(await api("GET", "/api/orders/EH-000000"), 404, "NOT_FOUND");
  });

  // ----- Staff -----
  await check("GET /api/admin/orders without credentials → 401 UNAUTHORIZED", async () => {
    assertErrorCode(await api("GET", "/api/admin/orders"), 401, "UNAUTHORIZED");
  });

  await check("GET /api/admin/orders with a wrong password → 401 UNAUTHORIZED", async () => {
    const wrong = `Basic ${Buffer.from(`${ADMIN_USER}:not-the-password`).toString("base64")}`;
    assertErrorCode(await api("GET", "/api/admin/orders", { auth: wrong }), 401, "UNAUTHORIZED");
  });

  await check("GET /admin without credentials → 401 with WWW-Authenticate", async () => {
    const res = await api("GET", "/admin", { headers: { Accept: "text/html" } });
    assertStatus(res, 401);
    assert(/^Basic realm="Ember House Staff"/.test(res.headers.get("www-authenticate") ?? ""), "missing Basic realm challenge");
  });

  await check("GET /api/admin/orders with credentials → 200", async () => {
    const res = await api("GET", "/api/admin/orders", { auth: true });
    assertStatus(res, 200);
    assert(Array.isArray(res.body?.orders), "response has no orders array");
    if (order) assert(res.body.orders.some((o) => o.id === order.id), "today's list is missing the new order");
    if (order) assert(res.body.orders.find((o) => o.id === order.id).email === buyer.email, "staff should see the full email");
  });

  if (order) {
    await check("PATCH order PENDING → READY → 409 INVALID_TRANSITION", async () => {
      const res = await api("PATCH", `/api/admin/orders/${order.id}/status`, { auth: true, json: { status: "READY" } });
      assertErrorCode(res, 409, "INVALID_TRANSITION");
    });

    const steps = ["CONFIRMED", "PREPARING", "READY", "COMPLETED"];
    const walked = await check(`PATCH order PENDING → ${steps.join(" → ")} succeeds`, async () => {
      for (const status of steps) {
        const res = await api("PATCH", `/api/admin/orders/${order.id}/status`, { auth: true, json: { status } });
        assertStatus(res, 200);
        assert(res.body?.status === status, `expected ${status}, got ${res.body?.status}`);
      }
      return true;
    });

    if (walked) {
      await check("GET /api/orders/[code] reflects COMPLETED with the full timeline", async () => {
        const res = await api("GET", `/api/orders/${order.code}`);
        assertStatus(res, 200);
        assert(res.body.status === "COMPLETED", `expected COMPLETED, got ${res.body.status}`);
        assert(res.body.paymentStatus === "PAID", `expected PAID, got ${res.body.paymentStatus}`);
        const timeline = res.body.statusHistory.map((event) => event.status).join(",");
        assert(timeline === ["PENDING", ...steps].join(","), `unexpected timeline ${timeline}`);
      });
    } else {
      skipped("GET /api/orders/[code] reflects COMPLETED with the full timeline", "status walk failed");
    }
  } else {
    skipped("PATCH order status transitions", "order was not created");
  }

  await check("PATCH /api/admin/orders/[id]/status with an unknown status → 422", async () => {
    const res = await api("PATCH", `/api/admin/orders/${order?.id ?? "unknown"}/status`, { auth: true, json: { status: "EATEN" } });
    assertErrorCode(res, 422, "VALIDATION_ERROR");
  });

  if (reservation) {
    await check("GET /api/admin/reservations for the booking date includes the booking", async () => {
      const res = await api("GET", `/api/admin/reservations?date=${bookingDate}`, { auth: true });
      assertStatus(res, 200);
      assert(res.body?.reservations?.some((r) => r.id === reservation.id), "booking missing from the staff list");
    });

    await check("PATCH reservation CONFIRMED → SEATED → COMPLETED (frees the slot)", async () => {
      for (const status of ["SEATED", "COMPLETED"]) {
        const res = await api("PATCH", `/api/admin/reservations/${reservation.id}/status`, { auth: true, json: { status } });
        assertStatus(res, 200);
        assert(res.body?.status === status, `expected ${status}, got ${res.body?.status}`);
      }
      const res = await api("PATCH", `/api/admin/reservations/${reservation.id}/status`, { auth: true, json: { status: "SEATED" } });
      assertErrorCode(res, 409, "INVALID_TRANSITION");
    });
  }

  // ----- Summary -----
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length > 0) {
    console.log(`Failed: ${failed.map((r) => r.name).join("; ")}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Smoke test crashed:", error);
  process.exit(1);
});
