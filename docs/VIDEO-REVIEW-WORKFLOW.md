# Video Review → Feedback → Training — architecture report

**Status: awaiting approval before production deployment.**

## EXISTING VIDEO SYSTEM — what was reused

- `TrainingVideo` for storage metadata + playback URL
- `lib/storage.ts` (Cloudinary → S3 → local) for athlete uploads
- Coach `/videos` library + `/videos/[id]` annotate workspace
- Athlete `/athlete/videos` expanded (not replaced)

## ANNOTATION SYSTEM — how drawings are stored and replayed

- Existing `VideoAnnotation` rows (`timestampMs`, `label`, `note`, `strokes` JSON string)
- Existing `VideoAnnotator` component reused for coaches
- Athlete review view uses the same component in **`readOnly`** mode — tap timestamps to see coach drawings

## VIDEO STORAGE — where videos are stored

- Object storage via existing `storeVideoFile` (Cloudinary preferred in production)
- DB stores `videoUrl` + optional `storageKey` on `TrainingVideo`
- No video binaries in PostgreSQL
- Access gated by VideoReview recipient coach / owning athlete (no public directory)

## DATABASE CHANGES

Migration: `prisma/migrations/20260825190000_video_reviews/`

- `TrainingVideo.storageKey` (optional)
- `VideoReview` — athlete submission + coach feedback/status
- `VideoReviewTrainingLink` — review ↔ `TrainingPlan` assignment
- `AppNotification` — extensible in-app notifications

Reserved fields: `aiObservationsJson`, `recommendationSource` (for future AI)

## NOTIFICATIONS — coach/athlete

In-app `AppNotification` on:
- video submitted → coach
- review completed (± training assigned) → athlete

Shown on Coach Dashboard and Athlete Home via `NotificationFeed`.

Resend emails (when configured):
- `sendVideoSubmittedEmail`
- `sendVideoReviewCompleteEmail`

Emails never attach/embed the video; CTA requires login.

## TRAINING INTEGRATION — drills/workouts/programs from video

On coach review workspace (`/videos/reviews/[id]`):

- **Assign drill** — creates a `TrainingPlan` + workout + exercise from the existing drill catalog (`lib/drills.ts`)
- **Assign workout** — copies first workout from an existing coach plan
- **Assign program** — copies full existing plan

All use the existing Training Engine (`TrainingPlan` / `Workout` / `WorkoutExercise`). Athlete sees them under Train.

## VIDEO → TRAINING RELATIONSHIP

`VideoReviewTrainingLink` stores:
- `videoReviewId`
- `trainingPlanId`
- `assignmentKind` (`DRILL` | `WORKOUT` | `PROGRAM`)
- `coachNote`
- `recommendationSource` (default `COACH`)

Completion is read from existing workout `completed` / `WorkoutSession` — not duplicated.

## AUTHORIZATION

- Athlete may only send to **APPROVED** `CoachAthleteConnection` coaches
- Coach review routes require `coachUserId === session user`
- Athlete review routes require `athleteProfile.userId === session user`
- Unrelated coaches cannot open review by ID (`canAccessVideoReview`)

## MOBILE

Athlete upload (`/athlete/videos/new`) is mobile-first: file/camera input, large CTAs, stacked fields. Tested layout targets 375–430px via existing athlete shell.

## RESEND

Live when `RESEND_API_KEY` + `EMAIL_FROM` are set (already true in your production). If missing, in-app notifications still work; email hooks return “not configured” without failing the upload/review.

## TEST INSTRUCTIONS (manual)

1. Athlete: Videos → Upload video → title/sport/category/note → select connected coach → Send
2. Coach: Dashboard notification or Videos → Needs review → open review
3. Pause video → Draw on frame → save annotation
4. Assign drill (e.g. 3×10) with note
5. Write feedback → Complete review
6. Athlete: notification → open review → see annotations + feedback + Start Training
7. Complete the assigned workout in Train
8. Coach reopen review → Assigned shows Completed ✓

Automated:

```bash
npx prisma migrate deploy
npx prisma generate
npx tsx scripts/test-video-reviews.ts
npm run lint
npx tsc --noEmit
npm run build
```

## KNOWN LIMITATIONS

- Playback URLs follow existing storage (Cloudinary URLs are app-private by obscurity + authz; true signed URLs can be layered later)
- QR / AI analysis / before-after compare not built
- Assign workout/program requires the coach already has plans in their library
- Guardian consent for video sharing not built (schema does not block it)
