# Project Progress Log

## Current Status
- **Phase**: Phase 2 (Completed & Gate Passed)
- **Active State**: System Production-Ready for Dine-in Restaurant Service (Phase 0, 1 & 2 fully implemented and verified).

## Slices & History

### [Phase 0 - Foundation] - COMPLETED & VERIFIED
- [x] Initialized `AGENTS.md` and `docs/BRIEF.md`
- [x] Extracted requirements to `docs/REQUIREMENTS.md` (R-001..R-100, E-001..E-042)
- [x] Created architecture decision log (`docs/DECISIONS.md`)
- [x] Next.js App Router with TypeScript strict mode
- [x] Tailwind CSS and typography system configured
- [x] Drizzle ORM schema with 26 tables, partial unique indexes, check constraints
- [x] Append-only SQL triggers for immutable tables (`payments`, `audit_logs`, `order_history`, `credit_notes`)
- [x] Environment validation with Zod (`src/lib/env.ts`, `.env.example`)
- [x] Comprehensive seed script for demo restaurant, 8 tables, 6 categories, 30 items, 3 staff users (`scripts/seed.ts`)
- [x] Multi-stage Dockerfile and `docker-compose.yml`
- [x] Verification pipeline (`pnpm verify`)

### [Phase 1 - Core Ordering & Surfaces] - COMPLETED & VERIFIED
- [x] Pure Pricing Module (`src/lib/pricing.ts`) passing all Section 16 worked examples and property tests
- [x] Pure Order State Machine (`src/lib/state-machine.ts`)
- [x] Integer paise money utilities (`src/lib/money.ts`)
- [x] Business date & Indian financial year calculator (`src/lib/business-date.ts`)
- [x] Rate limiting per Section 10 (`src/lib/rate-limit.ts`)
- [x] Signed device cookies (`src/lib/device-cookie.ts`)
- [x] Transactional Outbox Event Bus & 1s Poller on `globalThis` (`src/modules/realtime/bus.ts`)
- [x] Read-only QR entry route `/t/[token]` setting signed cookie
- [x] Public endpoints: context, menu, quote, atomic 13-step place-order, SSE stream
- [x] Staff JWT & paired device authentication
- [x] Staff endpoints: login, me, orders list, transitions with version check, line voiding, KDS heartbeat
- [x] Prepare bill & payments with gapless invoice numbering
- [x] Customer web app pages: `/menu`, `/cart`, `/orders`, `/order/[id]`, `/closed`
- [x] KDS surface: `/kitchen` (3 columns, large typography, live warn/late timers, 56px action buttons, undo toast, heartbeat)
- [x] Admin console: `/login`, `/admin/dashboard` (table map, confirmation queue for held orders, active orders overview)
- [x] Phase 1 Quality Gate (`pnpm gate:phase1`) PASSED

### [Phase 2 - Operations, Billing & Reports] - COMPLETED & VERIFIED
- [x] Waiter calls and bill requests (`/api/public/calls`, `/api/staff/calls`, `PATCH /api/staff/calls/[id]`)
- [x] Waiter console surface (`/waiter`)
- [x] Table seating & session creation (`/api/staff/sessions`)
- [x] Staff-taken orders for guests (`/api/staff/orders/staff-order`)
- [x] Move session to a free table with occupancy protection (`/api/staff/sessions/[id]/move`)
- [x] Block abusive device (`/api/staff/sessions/[id]/devices/[deviceId]/block`)
- [x] Reopen BILLING session back to OPEN with reason (`/api/staff/sessions/[id]/reopen`)
- [x] Walk-out write-off session (`/api/staff/sessions/[id]/write-off`)
- [x] Manager PIN approvals (6-digit, 120s single-use token) (`/api/staff/approvals`)
- [x] Bill discounts (flat or percent) with cashier manager-approval requirement (`/api/staff/bills/[id]/discount`)
- [x] Append-only payment reversals (`/api/staff/payments/[id]/reverse`)
- [x] Credit notes with sequential `CN/YY-YY/000000` numbers (`/api/staff/bills/[id]/credit-notes`)
- [x] Table QR code engine (PNG & SVG Level Q) & token regeneration (`/api/staff/tables/[id]/qr`, `regenerate-token`)
- [x] Legal Tax Invoice view & print layout (`/api/staff/bills/[id]/invoice.pdf`)
- [x] Needs attention monitor (`/api/staff/sessions/needs-attention`)
- [x] Busy mode controls with delay & pause message (`/api/staff/kitchen/busy`)
- [x] Financial sales reports & GST statutory summary (`/api/staff/reports/sales`, `/api/staff/reports/gst-summary`)
- [x] Searchable audit trail (`/api/staff/audit`)
- [x] Admin reports surface (`/admin/reports`)
- [x] Embedded PGlite Driver with WebAssembly persistence in `./data/pglite` for zero-friction local execution without host Postgres service
- [x] Seeded Demo Data (Spice Garden restaurant, Tables T1-T8, 6 categories, 30 menu items, Owner/Kitchen/Waiter credentials)
- [x] Direct demo scan entry (`/t/demo`) to seamlessly simulate table QR scan and issue device cookies
- [x] Premium SaaS UI Overhaul: Linear/Stripe-grade dark aesthetic, glassmorphic navigation, official Indian Veg/Non-Veg badges, live KDS ticket board, executive financial analytics, and responsive mobile dining experience
- [x] Dedicated Unified Admin Navbar (`src/components/admin/AdminNavbar.tsx`) persistent across all staff surfaces with active tab indicator, live sync status, staff role badge, and 1-click customer view preview
- [x] Complete separation of Customer Dining app (zero staff links or admin controls)
- [x] Vercel & Serverless Hosting Readiness: `vercel.json` config, build-phase poller suppression in `instrumentation.ts`, `prepare: false` pooled cloud PostgreSQL support for Neon/Supabase, resilient client safety polling on all surfaces, and complete deployment guide (`docs/VERCEL_DEPLOYMENT.md`)
- [x] Phase 2 Quality Gate (`pnpm gate:phase2`) PASSED
