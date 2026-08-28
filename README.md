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

**Demo logins (dev only, when `SEED_DEMO=true`):**
- Coach: `coach@example.com` / `password123`
- Athlete: `athlete@example.com` / `password123` (Hudson Reed)

New coach signups go through a short onboarding (zip + sport) before the Coach Portal.
Parents create the player account for anyone under 18 — parent email is the login, and the player profile is created in the same step. Players 18+ can sign up as Athlete. Coaches can still invite athletes with `/accept-invite`.

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
| `CLOUDINARY_URL` | Phone video uploads (easiest — one value from cloudinary.com) |
| `S3_BUCKET`, `S3_ENDPOINT`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Private, direct, chunked long-video uploads through Cloudflare R2 |
| `PLATFORM_ADMIN_EMAIL` | Your email — unlocks the master Sport library |
| `TRAINER_EMAILS` | Comma-separated trainer logins, e.g. `chase@train2play.com` |
| `SEED_DEMO` | Leave unset or `false` in production |

### 5. Phone and long-video uploads

Cloudinary remains a simple fallback. Cloudflare R2 is recommended for 5–10
minute film: the browser sends private 10 MB chunks directly to R2, retries
interrupted chunks, and Train2Play authorizes every playback.

After R2 setup, confirm `/api/health` shows both `"objectStorage": true` and
`"directPrivateVideo": true`.

Full guide: [docs/VIDEO-UPLOAD.md](./docs/VIDEO-UPLOAD.md)

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
- Coach connection codes — athletes request to connect; coaches approve (see `docs/COACH-CONNECTION-CODES.md`)
- Athlete self-signup + Connect with a coach flow
- Video review loop — athlete uploads film → coach annotates/feedback → assign training (see `docs/VIDEO-REVIEW-WORKFLOW.md`)
- Synchronized trainer voice-over reviews (see `docs/SYNCHRONIZED-VOICE-REVIEWS.md`)
- Video coaching — upload MP4, draw on frames, timestamped notes
- Player profiles with velo vs system averages
- Athlete Player Profile (`/athlete/profile`) + shareable `/p/{slug}` with privacy controls
- Player Profile video upload uses the existing Videos pipeline (R2/Cloudinary + `VideoReview`). Featured, Highlights, and Submit to Train2Play (`/admin/community/content`) reference the same record.
- Coach Profiles + Find a Coach: coaches apply for Train2Play approval, Admin reviews (background-check status is a separate layer), athletes browse `/athlete/coaches` and request to connect. Public profiles live at `/coach/{slug}`. Coach codes still work.
- Community: Player of the Week, leaderboards, most improved, weekly challenges
- Platform Admin command center weekly homepage modules (`/admin/community`)
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
