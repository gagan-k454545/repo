# Deploying to Vercel Guide

This document explains how to deploy the QR Restaurant Ordering System directly to **Vercel** with maximum simplicity and reliability.

---

## 1. Can we host on Vercel directly?

**Yes!** The entire Next.js App Router frontend, customer dining app, waiter console, kitchen display system, and API route handlers run directly on Vercel.

### Key Serverless Considerations
1. **Database Persistence**:
   - Vercel functions are stateless and serverless. The local embedded WebAssembly database (`./data/pglite`) **cannot** be used on Vercel because file changes do not persist across serverless instances.
   - You must connect a **cloud-hosted PostgreSQL 16+** database (such as **Neon**, **Supabase**, **Vercel Postgres**, or **Railway Postgres**).
   - Neon offers a generous free tier and sets up in 30 seconds.
2. **Real-time Live Updates**:
   - Vercel serverless functions have execution timeouts (15s on Hobby, 60s/300s on Pro).
   - To guarantee zero missed tickets on serverless, the app uses a dual-channel architecture:
     - **Server-Sent Events (SSE)** with automatic reconnection (`retry: 3000`) and transactional `Last-Event-ID` replay from PostgreSQL.
     - **Safety Poll Reconciliation**: The kitchen (`/kitchen`), waiter (`/waiter`), admin (`/admin/dashboard`), and customer order tracker (`/order/[id]`) automatically poll every 3–4 seconds to guarantee that screens stay synced even during serverless cold starts.

---

## 2. Quick 4-Step Deployment Walkthrough

### Step 1: Create a Free Cloud PostgreSQL Database
1. Go to [Neon.tech](https://neon.tech) (or [Supabase.com](https://supabase.com)).
2. Create a new project (select region **Asia South - Mumbai** or **Singapore** for fastest response).
3. Copy the PostgreSQL connection string. It will look like:
   ```env
   postgres://username:password@ep-xyz-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```

### Step 2: Push to Your GitHub Repository
Push your latest codebase to GitHub:
```bash
git remote set-url origin https://github.com/gagan-k454545/repo.git
git push -u origin main
```

### Step 3: Import into Vercel
1. Go to your [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New..." > "Project"**.
2. Select your repository `gagan-k454545/repo` and click **Import**.
3. Under **Environment Variables**, add the following 5 variables:

| Variable Name | Value Description | Example / Notes |
|---|---|---|
| `DATABASE_URL` | Your Neon / Supabase Postgres URI | `postgres://user:pass@ep-xyz.neon.tech/db?sslmode=require` |
| `AUTH_SECRET` | 32+ character random secret string | e.g. `auth-secret-production-key-32chars-min-ok!` |
| `DEVICE_COOKIE_SECRET` | 32+ character random secret string | e.g. `cookie-secret-production-key-32ch-min!` |
| `APP_URL` | Your Vercel production domain | `https://your-restaurant-app.vercel.app` |
| `NODE_ENV` | Environment mode | `production` |

4. Click **Deploy**. Vercel will build and deploy the Next.js app in ~1 minute.

---

### Step 4: Run Database Migrations & Initial Setup
Once your database is created, run the migrations to create the 26 tables, partial unique indexes, and append-only triggers.

From your local machine (pointing to your cloud database URL):
```bash
# In Windows PowerShell:
$env:DATABASE_URL="postgres://user:pass@ep-xyz.neon.tech/db?sslmode=require"
pnpm db:migrate
```
*(Optional: If you want to seed the demo Spice Garden restaurant with 8 tables and 30 menu items for initial testing, run `pnpm seed` with `NODE_ENV=development` or use the admin console at `/admin/dashboard`).*

---

## 3. Alternative: Single-Container Host (Railway / Render / VPS)
If you prefer running a 24/7 dedicated persistent Node.js process with zero serverless timeouts, the included `Dockerfile` and `docker-compose.yml` can be deployed in 1 click to:
- **Railway.app** (Deploy from GitHub repo -> automatically provisions PostgreSQL + persistent Node web service)
- **Render.com** (Web Service + Render PostgreSQL)
- **VPS** ($5/mo DigitalOcean/Hetzner with `docker compose up -d`)
