# Train2Play — Architecture Audit & Phase 1 Plan

**Status:** Awaiting TJ approval before major structural changes  
**Date:** August 24, 2026  
**Live deploy:** GitHub → Railway (PostgreSQL, Docker)  
**Principle:** *The athlete is the center of the platform.*

---

## Step 1 — Current State Audit

### Technology stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 App Router, React 19, TypeScript |
| UI | Tailwind v4, shadcn/ui, Recharts |
| Database | PostgreSQL 16 + Prisma 7 (`@prisma/adapter-pg`) |
| Auth | NextAuth v5 (Credentials, JWT sessions) |
| Email | Resend (optional) |
| Video storage | S3/R2-compatible (optional; URL fallback always works) |
| Deploy | Docker → Railway/Render, auto-migrate on start |

### What exists today (working)

- Coach signup/login, onboarding, password reset
- Athlete roster CRUD (coach-owned records)
- Training plans + workouts + calendar + completion tracking
- Flexible progress metrics + goals + charts
- Video library + frame annotations
- Pickup player listing + zip-based matching + email alerts
- Parent **read-only share links** (token URL, no parent account)
- Team/athlete reports + CSV export
- Privacy/Terms, health check, production env validation

### Current data model (11 tables)

```
User (coach account)
  └── Athlete (owned by coachId — NOT a login identity)
        ├── ProgressMetric (label + value + unit — flexible)
        ├── ProgressGoal
        ├── TrainingPlan → Workout
        ├── TrainingVideo → VideoAnnotation
        ├── ParentShareLink
        └── PickupInterest (cross-coach)

User also owns: TrainingPlan (templates), TrainingVideo, PickupInterest
```

### Authentication & authorization

- **Only coach accounts exist.** `User.role` defaults to `"COACH"` but is never enforced.
- **Athletes cannot log in.** They are database records, not users.
- **Parents cannot log in.** Access is via secret share URL only.
- Authorization = `coachId === session.user.id` on nearly all queries.
- **No organizations, teams, or multi-coach staff.**

### Routes (summary)

| Area | Routes |
|------|--------|
| Public | `/`, `/privacy`, `/terms`, `/login`, `/signup`, `/forgot-password` |
| Coach app | `/dashboard`, `/athletes/*`, `/training/*`, `/videos/*`, `/pickup-players/*`, `/calendar`, `/reports`, `/settings` |
| Parent view | `/view/[token]` (read-only) |
| API | `/api/auth/*`, `/api/health`, `/api/export/*` |

### Deployment pipeline

```
Cursor (dev) → GitHub (865hvac1-stack/train2play) → Railway (Docker build)
  → validate env → prisma migrate deploy → next start
```

Required env: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `NEXT_PUBLIC_APP_URL`  
Recommended: Resend, S3/R2 for video uploads

### Security & youth-safety gaps

| Gap | Risk |
|-----|------|
| No parental consent workflow | COPPA/youth compliance |
| Pickup listings expose minor info to any coach in radius | Privacy |
| Share links are secret-URL only (no expiry default) | Data exposure |
| No athlete/parent user accounts | Cannot enforce permissions properly |
| No rate limiting on auth | Abuse |
| Baseball-centric pickup filters hardcoded on User | Wrong sport assumptions |
| Cross-coach pickup links go to `/athletes/[id]` which 404s | Broken UX |

### Technical debt

- NextAuth v5 **beta** in production
- No automated tests or CI
- String enums instead of Prisma enums (`rosterStatus`, `status`, etc.)
- Global benchmarks (not sport/age scoped)
- `User.role` unused
- Video delete doesn't remove S3 objects
- Brand tagline split (`Train. Track. Perform.` vs brief's `Train Better. Play Better.`)

---

## Step 2 — Vision Comparison

### KEEP (preserve working functionality)

| Feature | Why |
|---------|-----|
| Next.js monolith + Server Actions | Solid foundation, already deployed |
| PostgreSQL + Prisma migrations | Production-ready |
| Coach auth (Credentials + JWT) | Works; extend, don't replace |
| `ProgressMetric` (label/value/unit) | **Already flexible** — seed of metric-definition system |
| TrainingPlan → Workout hierarchy | Seed of training engine |
| Video module + S3 storage abstraction | Modular as brief requires |
| Parent share links | Keep until guardian accounts exist |
| Pickup matching (geo + filters) | Unique differentiator — generalize, don't delete |
| Email via Resend | Keep modular for future GHL events |
| Brand config (`lib/brand.ts`) | Centralized |
| Railway/Docker deploy pipeline | Working |

### MODIFY (generalize, don't rip out)

| Current | Target change |
|---------|---------------|
| `Athlete.coachId` sole ownership | Add `AthleteProfile` + memberships; coach becomes one relationship type |
| `User` = coach only | `User` becomes identity; roles via `OrganizationMembership` |
| Baseball profile metrics (4 hardcoded) | Drive from `MetricDefinition` by sport |
| `throws`/`bats`/`minThrowingVelo` on schema | Move to sport-specific attribute JSON or definition table |
| Coach-only workout completion | Athlete can complete; coach can override |
| Pickup on `Athlete` model | Keep but add public pickup profile route; tighten visibility fields |
| Dashboard = coach-centric | Split: coach dashboard vs athlete dashboard (new) |
| Onboarding = coach zip/sport | Add org context when org exists |
| Marketing copy / tagline | Align to **Train Better. Play Better.** |

### REBUILD (new core structures — Phase 1 foundation)

| Area | Why rebuild |
|------|-------------|
| Identity & roles | Need User types: athlete, parent, coach, org_admin |
| Organization tenancy | `Organization` is root tenant; NexGen = org #1 |
| Athlete as persistent identity | `AthleteProfile` survives coach/team changes |
| Membership graph | Who can see/edit what (org, team, coach, guardian) |
| Metric definitions | Configurable per sport, not hardcoded columns |
| Authorization layer | Server-side policy checks, not just `coachId` |

### ADD LATER (explicitly out of Phase 1)

- Athlete dashboard ("Start today's workout" loop)
- Full program builder (weeks/phases/days/exercises)
- Drill library
- Gamification (streaks, badges, athlete score)
- Stripe / subscriptions
- GoHighLevel integration
- AI recommendations
- Verified metrics / recruiting profiles
- Marketplace programs
- Platform admin console
- Leaderboards
- Device integrations

---

## Step 3 — Phase 1 Foundation Architecture

**Goal:** Restructure the *foundation* so Phases 2–10 are possible **without** breaking the live coach app.

**Strategy:** **Parallel evolution** — add new tables and identity layer; existing coach flows keep working via compatibility views and gradual migration.

### Core concepts

```
Organization (tenant)
  ├── OrganizationMembership (User + role: ADMIN | COACH | STAFF)
  ├── Team (optional, Phase 1 basic)
  └── owns/brands content

AthleteProfile (the permanent athlete identity)
  ├── sport(s), grad year, DOB, avatar
  ├── persists across teams/coaches/orgs
  └── links to User when athlete can log in

AthleteMembership (who has access to this athlete)
  ├── organizationId, teamId?, coachUserId?
  ├── role context: PRIMARY_COACH | ASSISTANT | VIEWER
  └── replaces implicit coachId ownership over time

GuardianLink (parent ↔ athlete)
  ├── guardianUserId
  ├── athleteProfileId
  ├── relationship, consent flags
  └── permissions (view, manage, billing later)

MetricDefinition (sport-configurable)
  └── MetricEntry (athleteProfileId, value, source, verified)
```

### What stays running during Phase 1

- All current coach routes continue to work
- Existing `Athlete` rows migrate to `AthleteProfile` + `AthleteMembership`
- Existing `ProgressMetric` rows migrate to `MetricEntry`
- Pickup, video, training plans unchanged at UI level until Phase 2+

### NexGen as Organization #1

- Seed migration creates `Organization { slug: 'nexgen', name: 'NexGen' }` (or your real org name)
- All existing coaches/athletes attach to this org
- No hard-coded "NexGen" in application code — only seed data

---

## Step 4 — Proposed Phase 1 Database Schema

New tables (additive — existing tables kept until migration complete):

```prisma
enum UserRole {
  PLATFORM_ADMIN   // future
  ORG_ADMIN
  COACH
  STAFF
  PARENT
  ATHLETE
}

enum OrgRole {
  OWNER
  ADMIN
  COACH
  STAFF
}

enum MetricDirection {
  HIGHER_IS_BETTER
  LOWER_IS_BETTER
}

enum MetricSource {
  SELF_REPORTED
  COACH_ENTERED
  TEST_EVENT
  DEVICE
  VERIFIED      // future use
}

model Organization {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  logoUrl     String?
  primaryColor String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  memberships OrganizationMembership[]
  teams       Team[]
  // future: programs, branding, billing
}

model OrganizationMembership {
  id             String   @id @default(cuid())
  organizationId String
  userId         String
  role           OrgRole
  createdAt      DateTime @default(now())
  @@unique([organizationId, userId])
}

model Team {
  id             String   @id @default(cuid())
  organizationId String
  name           String
  sport          String
  season         String?
  createdAt      DateTime @default(now())
}

model AthleteProfile {
  id              String    @id @default(cuid())
  userId          String?   @unique  // set when athlete has login
  firstName       String
  lastName        String
  dateOfBirth     DateTime?
  graduationYear  Int?
  avatarUrl       String?
  primarySport    String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  sports          AthleteSport[]
  memberships     AthleteMembership[]
  guardianLinks   GuardianLink[]
  metricEntries   MetricEntry[]
  // legacy link during migration:
  legacyAthleteId String?   @unique
}

model AthleteSport {
  id               String @id @default(cuid())
  athleteProfileId String
  sport            String
  position         String?
  isPrimary        Boolean @default(false)
  @@unique([athleteProfileId, sport])
}

model AthleteMembership {
  id               String   @id @default(cuid())
  athleteProfileId String
  organizationId   String
  teamId           String?
  coachUserId      String?  // primary coach assignment
  startsAt         DateTime @default(now())
  endsAt           DateTime?
}

model GuardianLink {
  id               String   @id @default(cuid())
  guardianUserId   String
  athleteProfileId String
  relationship     String   // Mother, Father, Guardian
  consentGivenAt   DateTime?
  canViewProgress  Boolean  @default(true)
  canManageAccount Boolean  @default(false)
  @@unique([guardianUserId, athleteProfileId])
}

model MetricDefinition {
  id          String          @id @default(cuid())
  sport       String
  slug        String          // throwing_velocity
  name        String          // Throwing Velocity
  category    String          // speed, power, skill
  unit        String          // mph, sec, in
  direction   MetricDirection
  inputType   String          // number, percentage, time
  isActive    Boolean         @default(true)
  @@unique([sport, slug])
}

model MetricEntry {
  id                 String       @id @default(cuid())
  athleteProfileId   String
  metricDefinitionId String
  value              Float
  recordedAt         DateTime     @default(now())
  source             MetricSource @default(COACH_ENTERED)
  verifiedAt         DateTime?    // future
  enteredByUserId    String?
  notes              String?
  // legacy link:
  legacyMetricId     String?      @unique
}
```

**Migration approach:**

1. Add new tables (non-breaking)
2. Backfill `AthleteProfile` from every `Athlete`
3. Backfill `MetricEntry` from every `ProgressMetric` (map labels → definitions)
4. Seed `MetricDefinition` for Baseball, Basketball, Volleyball, Football, Soccer, S&C
5. Add `organizationId` to queries gradually
6. Deprecate direct `Athlete.coachId` usage in Phase 2

---

## Step 5 — Phase 1 Implementation Checklist

### Priority 0 — Governance (before coding)

- [ ] TJ approves this architecture plan
- [ ] Confirm NexGen org name/branding for seed
- [ ] Legal review flag on youth data / pickup visibility
- [ ] Align brand copy: **Train Better. Play Better.**

### Priority 1 — Foundation schema (week 1)

- [ ] Add Organization, Membership, AthleteProfile, MetricDefinition tables
- [ ] Seed NexGen as Organization #1
- [ ] Migration script: existing Athletes → AthleteProfiles
- [ ] Migration script: existing ProgressMetrics → MetricEntries
- [ ] Seed metric definitions for 6 sports (no hardcoded columns)

### Priority 2 — Authorization layer (week 1–2)

- [ ] `lib/authz/` — `canViewAthlete()`, `canEditAthlete()`, `canManageOrg()`
- [ ] Replace raw `coachId` checks incrementally
- [ ] Server-side enforcement on all actions (never UI-only)

### Priority 3 — User roles (week 2)

- [ ] Extend User with primary role
- [ ] OrganizationMembership on coach signup (default org or invite)
- [ ] Keep coach login flow identical for existing users

### Priority 4 — Compatibility & fixes (week 2)

- [ ] Fix pickup nearby → dedicated public pickup profile route (not `/athletes/[id]`)
- [ ] Scope benchmarks by sport (+ age band later)
- [ ] Remove baseball-only defaults from onboarding (sport-neutral)
- [ ] Add share link expiry option
- [ ] Push redirect fix + logo to GitHub (deploy housekeeping)

### Priority 5 — Guardian prep (week 3, no full parent app yet)

- [ ] GuardianLink table + consent timestamp
- [ ] Keep share links working
- [ ] Document path to parent User accounts in Phase 6

### Priority 6 — Developer quality (ongoing)

- [ ] Add CI: lint + `npm run build` on push
- [ ] Prisma enums for status fields
- [ ] ARCHITECTURE decision log in `/docs/adr/`

### Explicitly NOT in Phase 1

- Athlete login / athlete dashboard
- Full program builder with exercises
- Stripe billing
- Gamification
- AI features
- GoHighLevel
- Marketplace

---

## Step 6 — Decision Log (for future reference)

| Decision | Rationale |
|----------|-----------|
| AthleteProfile separate from User | Athlete exists before login (age 8); User added when ready |
| Organization at root | Multi-tenant SaaS; NexGen is tenant #1 |
| MetricDefinition table | Avoid per-sport columns; brief requirement |
| MetricEntry.source + verifiedAt | Future verified/recruiting without schema change |
| Keep existing coach UI during Phase 1 | Don't break live Railway deploy |
| JWT sessions for now | Works; revisit when athlete/mobile apps need it |
| Monolith Next.js | Correct for current stage; split only if needed |

---

## Step 7 — STOP

**No major structural code changes until TJ reviews and approves this plan.**

Recommended next message from TJ:

- "Approved — start Phase 1" → begin Priority 1 schema
- "Change X first" → revise plan
- "Pause pickup feature" → adjust MODIFY section

---

*Train Better. Play Better.*
