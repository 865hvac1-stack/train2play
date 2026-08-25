# Coach connection codes — architecture report

**Status: awaiting approval before production deployment.**

Do not merge/deploy this change to Railway until product/ops signs off.

## DATABASE CHANGES

Migration: `prisma/migrations/20260825180000_coach_connection_codes/`

- `User.connectionCode` (unique, nullable) — human-readable coach discoverability code (e.g. `LESTER4821`)
- `User.connectionCodeCreatedAt`
- New table `CoachAthleteConnection`:
  - `coachUserId`, `athleteProfileId`
  - `status`: `PENDING` | `APPROVED` | `DECLINED` | `CANCELLED` | `REVOKED`
  - `source`: `EMAIL_INVITE` | `COACH_CODE` | `QR_CODE` | `ORGANIZATION` | `ADMIN`
  - `requestedAt`, `approvedAt`, `declinedAt`, `cancelledAt`
  - `guardianApprovalRequired`, `guardianApprovedAt` (reserved; not enforced yet)

`Athlete.coachId` is **preserved** as roster-originator for legacy training rows. It is no longer the sole authorization path.

## COACH-ATHLETE RELATIONSHIP CHANGES

Previously authorization leaned on:

1. `Athlete.coachId` (one origin coach)
2. `AthleteMembership.coachUserId` (org/team coaching)

Now approved multi-coach relationships also live in `CoachAthleteConnection`.

- One athlete profile → many coaches
- One coach → many athletes
- Connection ≠ program assignment (unchanged)

On approve of a code request:

1. Connection → `APPROVED`
2. Ensure linked training `Athlete` row exists (`legacyAthleteId`)
3. Ensure `AthleteMembership` for that coach
4. Coach can then assign programs via existing training flows

## CONNECTION CODE IMPLEMENTATION

- Generated as `{LASTNAME}{4 digits}` (sanitized), unique, case-insensitive lookup
- Not a password / session token; cannot log into the coach account
- Coach Settings → **My Train2Play code**: copy code, copy connect link, regenerate (QR button placeholder)
- Public QR-ready path: `/connect/[code]` → athlete connect flow (uses configured app origin, not hard-coded Railway URLs)
- Athlete: `/athlete/connect` + empty-state CTAs on home/train + **My coaches** on profile
- Coach Dashboard: **Connection requests** approve/decline

## AUTHORIZATION RULES

`lib/authz` `getAthleteAccess` grants view/edit when any of:

- `Athlete.coachId === user`
- Active `AthleteMembership` for that coach
- `CoachAthleteConnection` with `status = APPROVED`
- Guardian link permissions (existing)

Roster listing (`getRosterAthletesForCoach`) unions owned roster + approved connected athletes.

Coach code lookup returns only: name, sport, organization name — never email/DOB/location.

Pending requests do **not** grant athlete data access.

## HOW EXISTING EMAIL INVITES WERE PRESERVED

- Add Athlete + optional invite email flow unchanged
- On create, `ensureEmailInviteConnection` writes an `APPROVED` / `EMAIL_INVITE` connection
- Invite tokens, accept-invite, and email templates unchanged

## HOW MULTIPLE COACHES ARE SUPPORTED

- Multiple `APPROVED` `CoachAthleteConnection` rows per athlete profile
- Second coach approve keeps the first relationship intact
- Training plans remain coach-owned (`TrainingPlan.coachId`); athletes can receive plans from different coaches over time (multi-program UI deferred)

## EXACT TESTING STEPS

Automated:

```bash
npx prisma migrate deploy
npx prisma generate
npx tsx scripts/test-coach-connections-unit.ts
npx tsx scripts/test-coach-connections.ts
npm run lint
npx tsc --noEmit
npm run build
```

Manual product path:

1. Coach opens Settings → copy Train2Play code
2. Athlete signs up independently → Connect with a coach → enter code
3. Confirm coach preview → Request to connect
4. Coach Dashboard → Approve
5. Athlete appears on coach Athletes list
6. Coach assigns a training plan → athlete sees Today's Training
7. Athlete connects a second coach → both remain
8. Invalid code shows friendly error
9. Decline leaves no active access
10. Duplicate pending request blocked
11. Existing Add Athlete + email invite still works
12. Regenerating code invalidates old code; existing connections remain

## KNOWN LIMITATIONS

- QR code UI is prepared (path + copy link) but not a rendered QR image yet
- Organization join codes not built (source enum reserved)
- Guardian approval fields exist but are not enforced
- Multi-program athlete training UI not built (architecture allows it)
- Some coach list queries still primarily use `coachId` for plan/video ownership (expected — those resources belong to the creating coach)
- Existing production athletes created before this migration get `EMAIL_INVITE` connections on next create; optional backfill script can sync older rows if needed

## DEPLOYMENT NOTE

Apply migration during a controlled deploy window. Prefer staging verification first. **Do not deploy until approved.**
