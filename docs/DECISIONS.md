# Architecture Decisions Record

This document records all architectural choices, assumptions, and resolved ambiguities according to the decision rules in `docs/BRIEF.md`.

## Decision Rule
1. Choose the option that cannot lose an order or a rupee.
2. Choose the option that can be undone.
3. Choose the simpler option.

## ADR Log

### ADR-001: Tech Stack Strict Adherence
- **Context**: The brief specifies Next.js (App Router, Node runtime), PostgreSQL 16+, Drizzle ORM, Zod, Tailwind CSS, shadcn/ui, TanStack Query, Zustand, jose, @node-rs/argon2.
- **Decision**: Keep exact stack as mandated.

### ADR-002: In-Memory / SQLite Test Option for Fast Unit / Integration Iteration
- **Context**: PostgreSQL is specified for production and full integration. For fast local unit and property tests of pure pricing and state machines, Vitest runs in-process.

### ADR-003: Currency & Pricing Storage
- **Context**: Indian Rupee with paise representation.
- **Decision**: Stored strictly as integer paise. Single shared pure module `lib/pricing.ts` for all quotes, orders, bills, and GST reports.

### ADR-004: Server-Sent Events (SSE) Bus Architecture
- **Context**: Need real-time dispatch across customer, kitchen, and front-of-house surfaces.
- **Decision**: Implement the transactional outbox pattern using the `events` table with an in-memory bus on `globalThis` woken after commit, supplemented by a 1-second safety poller.

### ADR-005: Embedded PGlite Driver for Local Development Without Host Daemon
- **Context**: On developer environments where native PostgreSQL daemon or Docker is not pre-installed or running on port 5432, running the app fails on database connection.
- **Decision**: Integrate `@electric-sql/pglite` with `drizzle-orm/pglite` dynamically in `src/db/client.ts` when `USE_PGLITE=true` or `DATABASE_URL=pglite://...`. PGlite runs a full WebAssembly PostgreSQL 16 engine directly in-process with identical SQL trigger and constraint support, persisting data to `./data/pglite`. Production environments remain fully on standard `postgres-js` with zero code changes.

### ADR-006: Direct Demo Table Access Route (/t/demo)
- **Context**: The QR system requires scanning `/t/[token]` to issue the signed `qr_device` cookie before browsing `/menu`. Direct navigation from a desktop browser homepage caused a 401 error because no table token had been scanned.
- **Decision**: Provide `/t/demo` which selects Table 1, issues a signed device cookie, and redirects to `/menu`. Real QR codes with 128-bit hex tokens remain the standard production entry path.

### ADR-007: Vercel & Serverless PostgreSQL Compatibility
- **Context**: Hosting on Vercel runs Next.js in a serverless environment where background timers freeze, filesystem is ephemeral (cannot use local PGlite), and pooled cloud connections (Neon, Supabase PgBouncer) reject client-side prepared statements.
- **Decision**: Configure `postgres-js` with `prepare: false` and controlled serverless pool sizing (`max: 5`) for cloud pooler compatibility. Guard `instrumentation.ts` against executing background polling timers during `next build`. Add 4-second safety polling reconciliation to all client tracking surfaces (`/order/[id]`, `/kitchen`, `/waiter`, `/admin/dashboard`) to ensure live updates remain fully resilient regardless of serverless connection limits.
