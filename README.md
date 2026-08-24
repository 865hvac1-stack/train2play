# Youth Athlete Training

A SaaS platform for youth athlete training — helping coaches manage rosters, plan workouts, and track athlete progress.

## What you need installed

- **Node.js 20 or newer** — download the LTS version from [nodejs.org](https://nodejs.org)
- **Git** — to clone this repository

Check that Node.js is installed:

```bash
node -v
```

## Getting started (first time)

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd youth-athlete-training
   ```

2. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Generate an auth secret and paste it into `.env`:

   ```bash
   openssl rand -base64 32
   ```

3. **Install dependencies**

   ```bash
   npm install
   ```

4. **Set up the database**

   ```bash
   npm run db:setup
   ```

   This creates a local SQLite database and loads demo data.

5. **Start the development server**

   ```bash
   npm run dev
   ```

6. **Open the app**

   Visit [http://localhost:43123](http://localhost:43123)

7. **Try the demo account**

   - Email: `coach@example.com`
   - Password: `password123`

   Or create your own coach account from the home page.

## What's included today

- Coach sign up and sign in
- Protected dashboard with roster overview
- Add, view, and remove athletes
- Store sport, position, birthday, and notes per athlete
- Demo seed data to explore the app immediately

## Tech stack

- [Next.js](https://nextjs.org) — React framework (App Router)
- [TypeScript](https://www.typescriptlang.org) — typed JavaScript
- [Tailwind CSS](https://tailwindcss.com) — styling
- [Prisma](https://www.prisma.io) + SQLite — local database
- [NextAuth.js](https://authjs.dev) — authentication
- [shadcn/ui](https://ui.shadcn.com) — UI components

## Available commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run build` | Build the app for production |
| `npm run start` | Run the production build locally |
| `npm run lint` | Check code for common issues |
| `npm run db:setup` | Create database and load demo data |
| `npm run db:seed` | Reload demo data |

## Project structure

```
app/
  page.tsx                 Marketing home page
  (auth)/login/            Sign in
  (auth)/signup/           Create coach account
  (dashboard)/dashboard/   Coach dashboard
  (dashboard)/athletes/    Roster management
components/                Reusable UI
lib/                       Database, auth helpers
prisma/                    Database schema and seed
```

## What's next

- Training plans and workout scheduling
- Progress tracking and performance metrics
- Parent/guardian access
- Team management for multi-sport programs
