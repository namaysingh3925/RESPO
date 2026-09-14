# Phase 1 status

**Completed:** 2026-09-14. The MVP described in [ARCHITECTURE.md](./ARCHITECTURE.md) is built and working end to end — every public page renders real seeded data, checkout and reservations submit to real endpoints, and staff can manage both from `/admin`.

## Verified

- `npx tsc --noEmit`: 0 errors
- `npm run lint`: 0 errors
- `npm run test:unit`: 12/12 passing (restaurant-local date/time helpers)
- Manual pass through every page in a running dev server: home, menu (filter + add to cart), full checkout (kitchen-closed handling, tip presets, order summary), a reservation booked end to end (real confirmation code issued), visit, and the admin board (orders board + reservations panel, live polling, an order accepted through its full status lifecycle)

## Running locally

```bash
npm install
cp .env.example .env   # then set ADMIN_USER / ADMIN_PASSWORD
npm run db:reset       # migrate + seed
npm run dev
```

`/admin` is behind HTTP Basic auth (`proxy.ts`) using `ADMIN_USER` / `ADMIN_PASSWORD` from `.env`.

## What's here

| Area | Notes |
|---|---|
| Public site (`app/(site)/**`) | Home (GSAP story-scroll), menu, checkout, order tracking, reserve, visit |
| Staff admin (`app/admin/**`) | Orders board + reservations panel, behind Basic auth |
| API (`app/api/**`) | Menu, reservations, orders, and the `/api/admin/*` staff endpoints — see [ARCHITECTURE.md §3](./ARCHITECTURE.md) |
| Data (`prisma/`) | SQLite for dev; `prisma/seed.ts` is idempotent (6 categories, 29 dishes, sample orders/reservations) |
| Shared hooks (`hooks/`) | `useRestaurantClock`, `useMediaQuery` / `prefersReducedMotion` — the single source for both, reused everywhere |

## Known gaps / next steps

- **Card payments** — `paymentMethod: "CARD"` is rejected server-side with "coming soon"; Stripe integration is Phase 2 (see ARCHITECTURE.md).
- **No automated end-to-end/browser tests** — verification above was manual. Consider Playwright for the checkout and reservation flows before a real launch.
- **No rate limiting** on `POST /api/orders` / `POST /api/reservations` yet (flagged in ARCHITECTURE.md as Phase 1.1).
- **Production database** — still SQLite; migrating to Postgres means changing the Prisma provider and `MenuItem.dietaryTags` from a CSV string to a real array (see ARCHITECTURE.md §2 migration checklist).
- **Real content** — restaurant name, address, menu, and photography are all placeholders (`lib/site-config.ts`, `lib/data/menu.ts`) pending the real brand.
