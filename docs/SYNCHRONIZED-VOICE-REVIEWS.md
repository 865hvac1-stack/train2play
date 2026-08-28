# Synchronized Trainer Voice Reviews

**Status: implemented and verified locally; awaiting approval before production deployment.**

## IMPLEMENTATION

The coach review workspace now adds **Record Voice Review** above the existing
video annotator. It uses the browser `MediaRecorder` API with microphone-only
`getUserMedia`, choosing the best supported format in this order:

1. WebM/Opus (Chrome/Edge/Android)
2. MP4/AAC (Safari/iPhone)
3. Browser default recording format

The UI has explicit requesting, recording, paused, recorded, uploading, and
saved states. A stopped recording remains in IndexedDB on that device until
upload succeeds or the coach discards it, so a refresh after recording does not
lose the draft.

Voice is optional. Existing written-only reviews still work. A saved voice
review allows completing a review without written feedback; both can be used
together.

## SYNCHRONIZATION

Audio and timeline events are stored separately from the original athlete
video. The timeline records ordered events with:

- coach-review time (`reviewTimeMs`)
- original-video time (`videoTimeMs`)
- event type (`video_play`, `video_pause`, `video_seek`,
  `playback_rate_change`, `annotation_show`, `annotation_clear`)
- optional playback rate / annotation id

The athlete player uses the coach audio as the master clock. A
`requestAnimationFrame` loop applies timeline events to the muted source video
and annotation canvas. The progress bar therefore represents the coach review
length, not the original clip length.

Timeline data is stored as one validated JSON array instead of an events table.
Playback always reads the full ordered sequence, and the product does not query
individual events. This reduces writes during recording while retaining a
versionable, export-ready event stream.

## ANNOTATIONS

The existing `VideoAnnotation` model, drawing actions, and `VideoAnnotator`
remain in use. The drawing renderer was extracted to the shared
`drawVideoStrokes` helper so both the existing coach annotator and synchronized
athlete player render exactly the same normalized strokes.

While voice recording is active, drawings are saved onto the timeline as
the actual strokes, not just a later database lookup. Saving a coaching note
keeps the drawing visible so the athlete still sees it while the coach talks.
The drawing clears when the coach plays the video or clears the frame. Any
drawing still on the frame when recording starts or finishes is captured too.

## STORAGE

Audio binaries are never stored in PostgreSQL.

- Cloudinary: uploaded as `authenticated` media
- S3/R2: private object (no public-read ACL)
- Local development: `.private-media/voice-reviews` (outside `public/`)

The browser never receives the storage key or provider URL. It streams through
`/api/video-reviews/[id]/voice`, which authorizes every request and proxies the
private object. Byte-range responses are supported for efficient mobile
playback.

Re-recording replaces the database reference and deletes the previous private
object after the replacement is persisted.

## DATABASE

Migration: `20260826010000_synchronized_voice_reviews`

New one-to-one `VoiceReview` attached to existing `VideoReview`:

- `audioStorageKey`
- `storageProvider`
- `audioMimeType`
- `durationMs`
- `timelineJson`
- `status`
- `coachUserId`
- `completedAt`
- future `transcriptText` / `transcriptStatus`

The original video, written feedback, notifications, annotations, and
`VideoReviewTrainingLink` remain unchanged.

## AUTHORIZATION

- Only `VideoReview.coachUserId` can record, replace, preview, or stream a coach
  draft.
- Only the owning `AthleteProfile.userId` can stream the final voice review.
- Athlete audio access is denied until the parent `VideoReview` is `REVIEWED`.
- Unauthenticated, unrelated coach, and other-athlete requests receive 401/404.
- Storage credentials and raw private storage references never reach the client.

## MOBILE / BROWSER

- Touch targets are at least 44px.
- Native microphone permission is requested only after the coach taps Record.
- The implementation handles WebM and MP4 MediaRecorder output.
- Recording controls do not rely on hover.
- `Permissions-Policy` now permits microphone access from the same origin only.

Automated and Chrome responsive testing cover the implementation here.
Physical-device smoke tests on iPhone Safari and Android Chrome are required
before production approval because this environment cannot emulate actual
mobile microphones/codecs.

## EXISTING VIDEO SYSTEM

Nothing was rebuilt:

- original athlete upload remains `TrainingVideo`
- review remains `VideoReview`
- drawings remain `VideoAnnotation`
- written feedback and review completion remain intact
- notifications remain `AppNotification`

Voice review is an optional one-to-one extension.

## TRAINING INTEGRATION

The existing Assign Drill / Workout / Program panel is unchanged and remains on
the same coach review page. Training is still created through
`TrainingPlan` / `Workout` / `WorkoutExercise` and related through the existing
`VideoReviewTrainingLink`. Completion still comes from the Training Engine.

## FUTURE AI

`VoiceReview` includes nullable transcript fields. A future background job can
read the private audio through server credentials, write a transcript, and
derive coach-approved structured observations without changing the recording,
timeline, annotation, or training relationships.

## TEST INSTRUCTIONS

Automated:

```bash
npx prisma migrate deploy
npx prisma generate
npx tsx scripts/test-voice-reviews.ts
npx tsx scripts/test-video-reviews.ts
npm run lint
npx tsc --noEmit
npm run build
```

Manual full loop:

1. Athlete sends a video to an approved coach.
2. Coach opens Videos → Needs Review.
3. Tap **Record Voice Review** and allow microphone access.
4. Play, pause, seek, choose 0.5×/0.75× speed, speak, and save an annotation.
5. Tap **Pause Review**, resume, then **Finish Review**.
6. Use **Preview Review** and confirm voice/video/actions/drawing sync.
7. Tap **Save Review**.
8. Optionally add written feedback and assign a 3×10 drill.
9. Tap **Save & Send Review**.
10. Athlete opens the notification and taps **Play Review**.
11. Confirm review-duration progress, voice, pauses/seeks/speed, and drawing.
12. Athlete taps Start Training and completes it.
13. Reopen the review and confirm **Training Completed ✓**.

Also verify denial by opening the private audio endpoint while logged out, as a
different coach, and as another athlete.
