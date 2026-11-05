# QR Restaurant Dine-In Ordering & Kitchen Display System

A high-performance, real-time table-ordering and kitchen management web platform designed for dine-in restaurants. Built with **Next.js 15 App Router**, **TypeScript (Strict Mode)**, **Tailwind CSS**, and **PostgreSQL (Drizzle ORM)**.

---

## 📁 Repository Directory Structure

```text
├── .env.example              # Environment variables template
├── .env.production           # Production environment template for Vercel
├── AGENTS.md                 # Operating guidelines and specifications
├── docker-compose.yml        # Local multi-service Docker configuration
├── Dockerfile                # Multi-stage production container build
├── drizzle.config.ts         # Drizzle ORM migration configuration
├── instrumentation.ts        # Server lifecycle and realtime event bus boot
├── next.config.mjs           # Next.js build and standalone configuration
├── package.json              # Dependencies and lifecycle scripts
├── tsconfig.json             # TypeScript strict configuration
├── vercel.json               # Vercel deployment configuration
├── vitest.config.ts          # Unit and property test configuration
│
├── docs/                     # Full Technical Architecture & Specifications
│   ├── API.md                # REST API endpoints and payload contracts
│   ├── ARCHITECTURE.md       # Modular monolith architecture & state machines
│   ├── BRIEF.md              # Complete system functional specification
│   ├── DECISIONS.md          # Architecture Decision Records (ADR Log)
│   ├── PROGRESS.md           # Implementation progress & milestone checklist
│   ├── REQUIREMENTS.md       # Extracted formal requirements checklist
│   ├── RUNBOOK.md            # Operational runbook & troubleshooting
│   ├── TRACEABILITY.md       # Requirements-to-tests traceability matrix
│   └── VERCEL_DEPLOYMENT.md  # 4-step Vercel serverless deployment guide
│
├── drizzle/                  # Committed SQL Migrations
│   ├── 0000_*.sql            # 26 relational tables, partial indexes & constraints
│   └── 0001_*.sql            # Append-only SQL triggers for audit & payments
│
├── scripts/                  # Management & Testing Automation
│   ├── create-owner.ts       # CLI tool to create owner/manager accounts
│   ├── gate.ts               # Automated quality gate runner (Phase 1 & Phase 2)
│   └── seed.ts               # Demo data seeder (Spice Garden, 8 tables, 30 items)
│
├── src/                      # Application Source Code
│   ├── app/                  # Next.js App Router (Pages, Layouts & API)
│   │   ├── (customer)/       # Guest Dining Surfaces (Clean mobile UX)
│   │   │   ├── cart/         # Shopping cart with active dish calculation
│   │   │   ├── closed/       # Session closed / settled view
│   │   │   ├── menu/         # Category-filtered menu with modifiers & dietary tags
│   │   │   ├── order/[id]/   # Live order tracking with fallback safety poll
│   │   │   ├── orders/       # Active round list for table sitting
│   │   │   └── t/[token]/    # Read-only QR scan entry point (sets signed cookie)
│   │   ├── (staff)/          # Operational Surfaces (Admin, Waiter & Kitchen)
│   │   │   ├── admin/        # Manager dashboard, table map, reports & GST summary
│   │   │   ├── kitchen/      # Kitchen Display System (KDS) live ticket columns
│   │   │   ├── login/        # Staff JWT authentication with role badges
│   │   │   └── waiter/       # Waiter assistance calls & order delivery console
│   │   └── api/              # Secure REST & Realtime API Endpoints
│   │       ├── auth/         # Login, logout, session check
│   │       ├── kds/          # Kitchen heartbeat and presence monitor
│   │       ├── public/       # Customer endpoints (menu, quote, order, calls, SSE)
│   │       └── staff/        # Staff endpoints (orders, bills, payments, reports)
│   │
│   ├── components/           # Reusable UI Components
│   │   └── admin/            # Unified staff navigation bar & indicators
│   │
│   ├── db/                   # Database Layer
│   │   ├── schema/           # Drizzle schema definitions (26 relational tables)
│   │   ├── client.ts         # Dual-engine client (Postgres.js & PGlite WebAssembly)
│   │   └── migrate.ts        # Automated database migration runner
│   │
│   ├── lib/                  # Pure Business Logic & Core Utilities
│   │   ├── business-date.ts  # Indian financial year & 4:00 AM cutoff calculator
│   │   ├── device-cookie.ts  # HMAC-SHA256 signed tamper-proof device cookies
│   │   ├── env.ts            # Zod environment schema validation
│   │   ├── errors.ts         # Standard typed application error responses
│   │   ├── eta.ts            # Dynamic kitchen preparation ETA calculator
│   │   ├── idempotency.ts    # Idempotency token validation for payments & orders
│   │   ├── logger.ts         # Pino structured logging
│   │   ├── money.ts          # Integer paise money formatting & parsing
│   │   ├── pricing.ts        # GST statutory tax calculator (pure pricing engine)
│   │   ├── rate-limit.ts     # In-memory sliding-window rate limiter
│   │   └── state-machine.ts  # Formal state machine for order lifecycle
│   │
│   └── modules/              # Domain-Specific Services
│       ├── auth/             # Role guards (OWNER, MANAGER, CASHIER, WAITER, KITCHEN)
│       ├── customer/         # Menu formatting & guest authorization
│       ├── orders/           # 13-step atomic order creation transaction
│       └── realtime/         # Outbox event bus & Server-Sent Events (SSE) dispatcher
│
└── tests/                    # Automated Test Suite
    └── unit/                 # Pure logic unit tests (Pricing, State Machine, Dates, ETA)
```

---

## 🖥️ Three Dedicated Surfaces

1. **Customer Web App (`/t/[token]`, `/menu`, `/cart`, `/order/[id]`)**:
   - Zero-app, zero-login mobile browser experience.
   - Tamper-proof signed QR device cookies.
   - Real-time order progress tracking with automatic reconnection.
   - Waiter call and bill request buttons right from the dining screen.

2. **Kitchen Display System / KDS (`/kitchen`)**:
   - High-contrast 3-column ticket display (Placed, Accepted, Preparing, Ready).
   - Dynamic late/warn timer badges and acoustic kitchen alert chimes.
   - 60-second undo window for accidental taps.

3. **Front-of-House Console (`/waiter`, `/admin/dashboard`, `/admin/reports`)**:
   - Real-time dining floor table map with seating occupancy.
   - Waiter service calls and assistance notifications.
   - Bill preparation, discounts (manager PIN protected), credit notes, and legal GST tax invoices.
   - Comprehensive sales and statutory GST tax reports.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 22 LTS or newer
- `pnpm` (`npm install -g pnpm`)

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Run Local Development Server
The app includes an **embedded WebAssembly PostgreSQL (PGlite)** engine for zero-friction local development without requiring local Docker or PostgreSQL installations:
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

- **Customer Demo Table**: Visit [http://localhost:3000/t/demo](http://localhost:3000/t/demo) (simulates scanning Table 1).
- **Kitchen Screen**: [http://localhost:3000/kitchen](http://localhost:3000/kitchen)
- **Staff / Admin Login**: [http://localhost:3000/login](http://localhost:3000/login) (Owner: `owner@spicegarden.com` / `Password123!`).

---

## 🧪 Verification & Quality Gates

Run the test suite and TypeScript validation:
```bash
# Typecheck + Unit Tests
pnpm verify

# Phase 1 Quality Gate
pnpm gate:phase1

# Phase 2 Quality Gate
pnpm gate:phase2
```

---

## ☁️ Deployment

- **Vercel**: See the step-by-step [docs/VERCEL_DEPLOYMENT.md](docs/VERCEL_DEPLOYMENT.md).
- **Docker / VPS**: Run `docker compose up -d` to launch the multi-stage Next.js container alongside dedicated PostgreSQL.
