# Train2Play

**train2play.com** — training platform for youth coaches: rosters, film review, velo profiles, and pickup player matching.

> **Ready to deploy?** Follow the step-by-step checklist in **[GO-LIVE.md](./GO-LIVE.md)**.

> **Branding:** Product name and tagline live in [`lib/brand.ts`](lib/brand.ts). Update that one file to rebrand the entire app.

## Quick start (local)

1. **Start PostgreSQL:** `docker compose up -d`
2. Copy env: `cp .env.example .env`
3. Generate auth secret: `openssl rand -base64 32` → paste into `.env` as `AUTH_SECRET`
4. Install: `npm install`
5. Set up database: `npm run db:setup:dev`
6. Run: `npm run dev`
7. Open [http://localhost:43123](http://localhost:43123)

**Demo login (dev only):** `coach@example.com` / `password123`

New signups go through a short onboarding (zip + sport) before the dashboard.

---

## Deploy to production

Train2Play is ready for **Railway** or **Render** with PostgreSQL and optional cloud video storage.

### 1. Create a PostgreSQL database

- **Railway:** New project → Add PostgreSQL → copy `DATABASE_URL`
- **Render:** Use the included `render.yaml` blueprint, or add a Postgres database manually
- **Neon / Supabase:** Also work — any Postgres connection string is fine

### 2. Deploy the app

**Railway (recommended)**

1. New project → Deploy from GitHub repo
2. Railway detects `Dockerfile` / `railway.toml`
3. Set environment variables (see below)
4. Deploy — migrations run automatically on start

**Render**

1. New Blueprint → connect repo (uses `render.yaml`)
2. Set `AUTH_URL` and `NEXT_PUBLIC_APP_URL` to your Render URL
3. After first deploy, point custom domain at the service

### 3. Required environment variables

| Variable | Example | Notes |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://...` | From your Postgres provider |
| `AUTH_SECRET` | `(openssl rand -base64 32)` | Required — never share |
| `AUTH_URL` | `https://train2play.com` | Your public URL, no trailing slash |
| `NEXT_PUBLIC_APP_URL` | `https://train2play.com` | Same as AUTH_URL |

### 4. Recommended for production

| Variable | Purpose |
| --- | --- |
| `RESEND_API_KEY` | Pickup alert + parent invite emails |
| `EMAIL_FROM` | `Train2Play <noreply@train2play.com>` |
| `S3_BUCKET` | Video upload storage |
| `S3_ENDPOINT` | Cloudflare R2 endpoint (S3-compatible) |
| `S3_PUBLIC_URL` | Public URL for uploaded videos |
| `AWS_ACCESS_KEY_ID` | R2/S3 access key |
| `AWS_SECRET_ACCESS_KEY` | R2/S3 secret |
| `SEED_DEMO` | Leave unset or `false` in production |

### 5. Cloud video storage (Cloudflare R2)

Without S3/R2, video uploads are saved to the server disk and **will be lost on redeploy**. For production:

1. Create an R2 bucket in Cloudflare
2. Enable public access or attach a custom domain (e.g. `videos.train2play.com`)
3. Create API token with Object Read & Write
4. Set the S3 env vars — R2 is S3-compatible

### 6. Custom domain (train2play.com)

1. Add domain in Railway/Render dashboard
2. Update DNS (CNAME to host)
3. Set `AUTH_URL` and `NEXT_PUBLIC_APP_URL` to `https://train2play.com`
4. Redeploy

### 7. Health check

After deploy, visit `/api/health` — should return `{ "status": "ok" }`.

### 8. Setting up test accounts

In production, demo accounts are **not** seeded by default. To create test coaches:

1. Go to `https://train2play.com/signup`
2. Complete onboarding (zip, sport)
3. Add athletes, videos, pickup players as needed

To load demo data on a staging environment only: set `SEED_DEMO=true` and run `npm run db:seed`.

---

## What's included

- Coach sign up and sign in with post-signup onboarding
- Dashboard, athletes, training plans, calendar, reports, settings
- Video coaching — upload MP4, draw on frames, timestamped notes
- Player profiles with velo vs system averages
- Pickup players + zip-based matching + email alerts
- Centralized brand config in `lib/brand.ts`

## Tech stack

Next.js · TypeScript · Tailwind CSS · PostgreSQL · Prisma · NextAuth.js · shadcn/ui

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Local dev server (port 43123) |
| `npm run build` | Production build |
| `npm run start:prod` | Migrate DB + start (used in Docker/deploy) |
| `npm run db:setup:dev` | Migrate + seed (local first-time setup) |
| `npm run db:setup` | Migrate + seed (production-safe seed rules) |
| `docker compose up -d` | Start local PostgreSQL |
