# Resume notes — Phase 1 build paused

**Paused:** 2026-09-14, after the parallel build hit the account's monthly usage limit.
**Last good commit before this note:** `e9babf3`.
**Spec:** [ARCHITECTURE.md](./ARCHITECTURE.md). The contracts in `lib/` and `components/ui/` are unchanged and still authoritative.

## State at pause

- `npx tsc --noEmit`: the only error is `LayoutProps` not found in `app/layout.tsx`. That's a generated route type that reappears after `npx next typegen`, `next dev` or `next build`, so it isn't a code error.
- `npx eslint components lib app`: 1 error, `react-hooks/preserve-manual-memoization` in `components/admin/use-live-list.ts`.
- Local database `prisma/dev.db` is migrated (init migration) but **not seeded**, because `prisma/seed.ts` doesn't exist yet.
- `.env` exists locally (dev admin credentials, `ENFORCE_BUSINESS_HOURS="false"`) and is git-ignored. Recreate it from `.env.example` on a fresh clone.

## Workstreams

Status: ✅ done · 🟡 partial · ⬜ not started

### 1. Data layer & API — 🟡
- ✅ `prisma.config.ts`, `lib/db.ts`, `prisma/migrations/*_init`
- ✅ `lib/services/{menu,reservations,orders}.ts` implemented against Prisma
- ✅ `lib/services/internal/{codes,database-url,mappers,schedule,time}.ts` and `time.test.ts` (node:test via tsx)
- ✅ `.env.example`
- ⬜ `prisma/seed.ts` (idempotent menu upsert from `lib/data/menu.ts`, admin user, sample reservations/orders)
- ⬜ `package.json` scripts: `postinstall`, `db:generate`, `db:migrate`, `db:seed`, `db:reset`, `db:studio`, `smoke:api`, `test:unit` (`time.test.ts` already expects `test:unit`)
- ⬜ `lib/api/*` route helpers, all of `app/api/**` (ARCHITECTURE §3), `proxy.ts` (Basic auth), `scripts/smoke-api.mjs`

### 2. Site shell, home, visit, SEO — 🟡
- ✅ `components/site/{hours.ts, open-status.tsx, today-hours.tsx, use-restaurant-clock.ts, wordmark.tsx}`
- ⬜ `app/(site)/layout.tsx`, `site-header`, `mobile-nav`, `site-footer`, `mobile-action-bar`
- ⬜ Home page (`FlowArt` story sections plus the `components/home/signature-showcase.tsx` interactor)
- ⬜ Visit page and `components/visit/*`
- ⬜ `components/seo/restaurant-json-ld.tsx`, `app/sitemap.ts`, `app/robots.ts`, `app/not-found.tsx`, `app/icon.svg`

### 3. Menu — 🟡
- ✅ `components/menu/{category-section, category-showcase, dietary, menu-hero, menu-item-card, use-media-query}`
- ⬜ `components/menu/menu-explorer.tsx` (dietary filter, sticky category nav, scroll-spy)
- ⬜ `app/(site)/menu/page.tsx`, `app/(site)/menu/loading.tsx`

### 4. Cart, checkout, tracking — 🟡
- ✅ `components/cart/{cart-button, cart-sheet, cart-line, use-cart-hydrated}`
- ✅ `components/order/{checkout-fields.tsx, order-summary.tsx, schedule.ts}`
- ⬜ `components/order/checkout-form.tsx`, `app/(site)/order/page.tsx`
- ⬜ `app/(site)/order/[code]/page.tsx`, `components/order/order-tracker.tsx`

### 5. Reservations — 🟡
- ✅ `components/reserve/{date-strip, ics, reserve-utils, time-slot-grid, use-restaurant-clock}`
- ⬜ `components/reserve/reservation-form.tsx`, `reservation-confirmation.tsx`, `app/(site)/reserve/page.tsx`

### 6. Staff admin — 🟡
- ✅ `components/admin/{confirm-action, hooks, order-card, status-badge, sync-status, use-live-list, utils}`
- ⬜ `app/admin/layout.tsx`, `app/admin/page.tsx`, `admin-dashboard`, `orders-board`, `reservations-panel`

### 7. Integration & review — ⬜
- ⬜ Seed the database; get `tsc`, `lint` and `next build` clean; run the API smoke tests and page status checks
- ⬜ Browser QA at mobile and desktop sizes
- ⬜ Multi-lens review: GSAP/hydration, API security, business logic, accessibility, Next 16 conventions

## Cleanup to fold into integration
- `components/site/use-restaurant-clock.ts` and `components/reserve/use-restaurant-clock.ts` are two different implementations of the same idea. Keep one.
- Fix the lint error in `components/admin/use-live-list.ts`.

## How to resume
1. Confirm the usage limit has reset.
2. Re-run the build workflow with each builder told to **read the existing files in its owned paths and finish only the ⬜ items above**. It must not rewrite finished files. The previous script is in the session's workflow scripts folder (`ember-house-phase1-build-*.js`), but its prompts assume stubs, so update them first. Resuming from the old run ID caches nothing, because every agent failed.
3. Then run integration, then review, as separate workflows so progress can be checked between them.
