# Core Athlete Loop — Architecture Summary (pending approval)

**Status:** Implemented locally. **Do not deploy to production until TJ approves.**

This document is the stop-gate summary requested before production deploy.

---

## Architecture Summary — What changed?

End-to-end **coach → assign program → athlete trains → log results → PR → coach review** on top of existing Train2Play models.

- Reused `TrainingPlan` (program), `Workout`, `Athlete` / `AthleteProfile`, `MetricDefinition` / `MetricEntry`, coach-athlete ownership (`Athlete.coachId` + authz helpers).
- Added prescription lines (`WorkoutExercise`), athlete attempts (`WorkoutSession` + `ExerciseResult`), and athlete login invites (`AthleteInvite` with hashed tokens).
- Athlete portal: mobile workout runner, history, real dashboard data.
- Coach portal: exercises on plan detail, assign athlete, invite login, athlete list/detail activity.

Public homepage was **not** redesigned. No Stripe / AI / recruiting / marketplace.

---

## Database Changes

Migration: `prisma/migrations/20260825150000_athlete_training_loop/`

| Model | Purpose |
| --- | --- |
| `WorkoutExercise` | Prescription inside a workout (sets/reps/rest, result kind, optional `metricDefinitionId`) |
| `WorkoutSession` | Athlete attempt (`IN_PROGRESS` / `COMPLETED`) |
| `ExerciseResult` | Per-exercise completion + flexible values (`valuePrimary` / `valueSecondary` / `resultKind`) + optional PR flag / `metricEntryId` |
| `AthleteInvite` | Invite email + **`tokenHash` only** (raw token never stored) |

Assignment remains `TrainingPlan.athleteId` (primary active program for MVP). Multiple active plans are ordered by `updatedAt`; expansion later can add an explicit assignment table without blocking this model.

**Flexible results:** no per-sport columns. `resultKind` = `NONE | NUMBER | RATIO | COUNT | TIME | WEIGHT` with primary/secondary floats + unit text. Metrics dual-write to `MetricEntry` + legacy `ProgressMetric` when an exercise links a `MetricDefinition`.

---

## Authentication Changes

- Coach accounts unchanged (Coach Portal).
- Athlete login: `User` (`role: ATHLETE`) linked via **`AthleteProfile.userId`** → `legacyAthleteId` → `Athlete`.
- Flow: coach invites email → `/accept-invite?token=…` → athlete sets password → profile linked → signed into `/athlete`.
- Demo seed (local/`SEED_DEMO=true`): `athlete@example.com` / `password123` → Hudson Reed.
- Invite tokens hashed with SHA-256; not logged.

---

## Authorization

- Coach mutations use `requireCoach` + `canEditAthlete` / `Athlete.coachId` scoping.
- Athlete session APIs use `assertAthleteOwnsAthleteId` (JWT user → profile → legacy athlete id).
- Middleware keeps athletes out of Coach Portal and coaches out of `/athlete/*`.
- Unauthorized athlete/session → `notFound` / error (no cross-athlete IDOR via session id).

---

## Training Engine

```
TrainingPlan (program)
  └── Workout[]
        └── WorkoutExercise[]  (prescription)
Athlete completes:
  WorkoutSession → ExerciseResult[]
  optional MetricEntry (+ PR)
  Workout.completed synced for coach list %
```

**Today's Training:** active assigned plan → workout scheduled for today, else next incomplete workout.

---

## PR Logic

On metric-linked result save (`lib/personal-records.ts`):

1. Load `MetricDefinition.direction` (`HIGHER_IS_BETTER` / `LOWER_IS_BETTER`).
2. Compare to previous best for that athlete profile + metric.
3. First recorded value = baseline (not shown as PR). Beating prior best sets `ExerciseResult.isPersonalRecord` and surfaces “NEW PR” in the runner / completion / coach views.

---

## Test Instructions

### Local demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Coach | `coach@example.com` | `password123` |
| Athlete | `athlete@example.com` | `password123` |

Requires `SEED_DEMO=true` (default in non-production).

### Scripted loop check

```bash
npx tsx scripts/test-athlete-loop.ts
```

### Manual browser loop

1. Log in as **coach** → Athletes → open **Hudson Reed** (or Add Athlete).
2. Training → open **4-Week Baseball Foundation (Sample/Demo)** (or create plan + exercises + assign).
3. Confirm athlete assignment; optional: Athlete login invite panel.
4. Log out → log in as **athlete**.
5. Home shows **Today's Training** → **START WORKOUT**.
6. Complete exercises; enter velocity / sprint when prompted.
7. **FINISH WORKOUT** → completion screen / progress / history.
8. Log in as **coach** → athlete detail → **Recent training activity** shows completion, results, PRs.

### Mobile widths

Exercise runner is single-column, large inputs/buttons (`min-h-14`). Spot-check 375 / 390 / 430.

---

## Known Limitations (intentionally not built)

- No week/phase table (order via `Workout.sortOrder` + dates)
- No multi-program primary flag beyond “latest ACTIVE”
- No complex program builder / drag-drop
- No parent/org billing, AI, recruiting, marketplace, wearables
- Public signup still creates coaches; athletes via invite/seed
- Email invite needs `RESEND_API_KEY` (otherwise coach copies invite URL once)
- Sample baseball program is **demo data only**, not a validated protocol

---

## Approval gate

Awaiting TJ approval before merging/deploying this architecture to production (Railway).
