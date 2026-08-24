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
- Centralized brand configuration

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
