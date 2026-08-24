# Youth Athlete Training

A SaaS platform for youth athlete training — helping coaches manage rosters, build training plans, and track workout completion.

> **Branding:** Product name and tagline live in [`lib/brand.ts`](lib/brand.ts). Update that one file to rebrand the entire app.

## What you need installed

- **Node.js 20 or newer** — [nodejs.org](https://nodejs.org)
- **Git**

## Getting started (first time)

1. Clone the repository and enter the project folder
2. Copy environment variables: `cp .env.example .env`
3. Generate an auth secret: `openssl rand -base64 32` (paste into `.env`)
4. Install dependencies: `npm install`
5. Set up the database: `npm run db:setup`
6. Start the server: `npm run dev`
7. Open [http://localhost:43123](http://localhost:43123)

**Demo login:** `coach@example.com` / `password123`

## What's included today

- Coach sign up and sign in
- Dashboard with roster and training plan overview
- Athlete roster management (add, view, remove)
- Training plans with scheduled workouts
- Mark workouts complete and track plan progress
- Log performance metrics on athlete profiles (times, weights, jumps)
- Set performance goals with progress bars toward targets
- Progress charts when multiple entries exist for the same metric
- Print-friendly athlete and team reports (save as PDF from browser)
- Monthly workout calendar across all training plans
- Team reports with per-athlete completion rates and CSV export
- Duplicate training plans to reuse programs across athletes
- Athlete roster search by name, sport, or position
- Share read-only family links with optional email invite
- Coach settings for profile and password updates
- Optional automated parent emails via Resend (RESEND_API_KEY)
- Dashboard upcoming workouts for the week
- Centralized brand configuration
- Video coaching library — upload or link MP4 clips
- Draw arrows, circles, and pen marks on paused frames
- Save written coaching direction at each timestamp

## Video coaching

Upload game film from your phone or paste a **direct MP4 link**. Pause at any moment, draw on the frame (pen, arrow, circle), and save written direction below the video. Saved notes appear in a sidebar — click to jump back to that timestamp.

**Note:** YouTube and other embed links cannot be drawn on. Upload the file or use a direct video URL instead.

## Tech stack

Next.js · TypeScript · Tailwind CSS · Prisma (SQLite) · NextAuth.js · shadcn/ui

## Available commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm run db:setup` | Create database and load demo data |
| `npm run db:seed` | Reload demo data |

## Project structure

```
app/
  page.tsx              Marketing home page
  (auth)/               Login and signup
  (dashboard)/          Coach app (dashboard, athletes, training)
lib/
  brand.ts              Product name, tagline, monogram — edit to rebrand
  training.ts           Training plan validation helpers
prisma/                 Database schema, migrations, seed
```

## What's next

- Progress metrics over time
- Parent/guardian read-only access
- Team management for multi-coach programs
