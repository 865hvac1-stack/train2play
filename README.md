# Youth Athlete Training

A SaaS platform for youth athlete training — helping coaches plan workouts, track athlete progress, and build stronger seasons.

This repository contains the foundation of the application. Features are not built yet; this is the starting point.

## What you need installed

- **Node.js 20 or newer** — download the LTS version from [nodejs.org](https://nodejs.org)
- **Git** — to clone this repository

Check that Node.js is installed by opening a terminal and running:

```bash
node -v
```

You should see something like `v20.x.x` or higher.

## Getting started (first time)

1. **Clone the repository** (replace the URL with your repo URL):

   ```bash
   git clone <your-repo-url>
   cd youth-athlete-training
   ```

2. **Install dependencies** (only needed once, or after pulling new changes):

   ```bash
   npm install
   ```

3. **Start the development server**:

   ```bash
   npm run dev
   ```

4. **Open the app in your browser**:

   Visit [http://localhost:43123](http://localhost:43123)

   You should see the "Youth Athlete Training" placeholder page.

5. **Stop the server** when you are done:

   Press `Ctrl+C` in the terminal where the server is running.

## Tech stack

- [Next.js](https://nextjs.org) — React framework with App Router
- [TypeScript](https://www.typescriptlang.org) — typed JavaScript
- [Tailwind CSS](https://tailwindcss.com) — utility-first styling

## Project structure

```
app/
  layout.tsx    Root layout (shared page wrapper)
  page.tsx      Home page
  globals.css   Global styles and Tailwind imports
public/         Static files (images, icons)
```

## Available commands

| Command         | What it does                          |
| --------------- | ------------------------------------- |
| `npm run dev`   | Start the local development server    |
| `npm run build` | Build the app for production          |
| `npm run start` | Run the production build locally      |
| `npm run lint`  | Check code for common issues          |

## What's next

Once the base app is running, the next phase will add real features such as user accounts, athlete profiles, training plans, and coach dashboards.
