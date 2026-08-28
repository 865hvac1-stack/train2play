/**
 * Synchronized voice review integration checks (requires DATABASE_URL).
 * Run: npx tsx scripts/test-voice-reviews.ts
 */
import "dotenv/config";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";

import { createPrismaClient } from "../lib/db";
import {
  canAccessVideoReview,
  completeVideoReview,
} from "../lib/video-reviews";
import {
  saveVoiceReview,
  currentAudioStorageProvider,
} from "../lib/voice-reviews";
import { voiceTimelineSchema, strokesFromTimelineEvent } from "../lib/voice-timeline";
import {
  deletePrivateAudioFile,
  getPrivateAudioResponse,
} from "../lib/storage";
import { DEMO_VIDEO_URL } from "../lib/videos";

const prisma = createPrismaClient();
const stamp = Date.now();

async function main() {
  assert.equal(currentAudioStorageProvider(), "local");

  const timeline = [
    { reviewTimeMs: 0, videoTimeMs: 0, type: "video_pause" as const },
    { reviewTimeMs: 500, videoTimeMs: 0, type: "video_play" as const },
    { reviewTimeMs: 1500, videoTimeMs: 1000, type: "video_pause" as const },
    { reviewTimeMs: 2000, videoTimeMs: 1000, type: "annotation_show" as const, annotationId: "ann_test" },
    { reviewTimeMs: 3000, videoTimeMs: 250, type: "video_seek" as const },
    {
      reviewTimeMs: 3200,
      videoTimeMs: 250,
      type: "playback_rate_change" as const,
      playbackRate: 0.5,
    },
  ];
  assert.equal(voiceTimelineSchema.parse(timeline).length, 6);

  const drawing = [
    {
      tool: "arrow" as const,
      color: "#FF6600",
      width: 4,
      points: [
        { x: 0.2, y: 0.2 },
        { x: 0.8, y: 0.8 },
      ],
    },
  ];
  const withStrokes = voiceTimelineSchema.parse([
    { reviewTimeMs: 0, videoTimeMs: 1000, type: "video_pause" as const },
    {
      reviewTimeMs: 400,
      videoTimeMs: 1000,
      type: "annotation_show" as const,
      strokes: JSON.stringify(drawing),
    },
  ]);
  assert.deepEqual(
    strokesFromTimelineEvent(withStrokes[1]!, []),
    drawing,
    "playback must use strokes saved on the timeline even without an annotation row",
  );
  assert.deepEqual(
    strokesFromTimelineEvent(
      {
        type: "annotation_show",
        annotationId: "ann_test",
      },
      [{ id: "ann_test", strokes: JSON.stringify(drawing) }],
    ),
    drawing,
    "legacy timelines that only stored an annotation id must still resolve",
  );
  assert.deepEqual(
    strokesFromTimelineEvent({ type: "annotation_clear" }, []),
    [],
  );
  assert.throws(() =>
    voiceTimelineSchema.parse([
      timeline[1],
      timeline[0],
    ]),
  );

  const passwordHash = await bcrypt.hash("TestPass123!", 10);
  const coach = await prisma.user.create({
    data: {
      name: "Coach Lester",
      email: `voice.coach.${stamp}@example.com`,
      passwordHash,
      role: "COACH",
      onboardingCompletedAt: new Date(),
    },
  });
  const stranger = await prisma.user.create({
    data: {
      name: "Other Coach",
      email: `voice.stranger.${stamp}@example.com`,
      passwordHash,
      role: "COACH",
      onboardingCompletedAt: new Date(),
    },
  });
  const athleteUser = await prisma.user.create({
    data: {
      name: "John Smith",
      email: `voice.athlete.${stamp}@example.com`,
      passwordHash,
      role: "ATHLETE",
    },
  });
  const profile = await prisma.athleteProfile.create({
    data: {
      userId: athleteUser.id,
      firstName: "John",
      lastName: "Smith",
      primarySport: "Basketball",
    },
  });
  const athlete = await prisma.athlete.create({
    data: {
      coachId: coach.id,
      firstName: "John",
      lastName: "Smith",
      sport: "Basketball",
    },
  });
  await prisma.athleteProfile.update({
    where: { id: profile.id },
    data: { legacyAthleteId: athlete.id },
  });
  const video = await prisma.trainingVideo.create({
    data: {
      coachId: coach.id,
      athleteId: athlete.id,
      title: "Shooting Form",
      videoUrl: DEMO_VIDEO_URL,
      sourceType: "URL",
    },
  });
  const review = await prisma.videoReview.create({
    data: {
      trainingVideoId: video.id,
      athleteProfileId: profile.id,
      coachUserId: coach.id,
      uploadedByUserId: athleteUser.id,
      title: "Shooting Form",
      sport: "Basketball",
      category: "Shooting",
      status: "IN_REVIEW",
    },
  });

  const bytes = Buffer.from("private-audio-test-data");
  const voice = await saveVoiceReview({
    videoReviewId: review.id,
    coachUserId: coach.id,
    audio: bytes,
    audioMimeType: "audio/webm",
    durationMs: 3500,
    timeline,
  });
  assert.equal(voice.storageProvider, "local");
  assert.ok(!voice.audioStorageKey.startsWith("http"));
  assert.equal(voice.videoReviewId, review.id);

  const ranged = await getPrivateAudioResponse({
    provider: voice.storageProvider,
    storageKey: voice.audioStorageKey,
    contentType: voice.audioMimeType,
    range: "bytes=0-6",
  });
  assert.equal(ranged.status, 206);
  assert.equal(Buffer.from(await ranged.arrayBuffer()).toString(), "private");

  assert.ok(
    await canAccessVideoReview({
      reviewId: review.id,
      userId: coach.id,
      asCoach: true,
    }),
  );
  assert.ok(
    await canAccessVideoReview({
      reviewId: review.id,
      userId: athleteUser.id,
      asAthlete: true,
    }),
  );
  assert.equal(
    await canAccessVideoReview({
      reviewId: review.id,
      userId: stranger.id,
      asCoach: true,
    }),
    null,
  );

  await completeVideoReview({
    reviewId: review.id,
    coachUserId: coach.id,
    coachFeedback: "",
  });
  const completed = await prisma.videoReview.findUniqueOrThrow({
    where: { id: review.id },
    include: { voiceReview: true },
  });
  assert.equal(completed.status, "REVIEWED");
  assert.equal(completed.voiceReview?.status, "READY");

  console.log("synchronized voice-review integration checks passed");

  await deletePrivateAudioFile({
    provider: voice.storageProvider,
    storageKey: voice.audioStorageKey,
  });
  await prisma.appNotification.deleteMany({
    where: { userId: { in: [coach.id, athleteUser.id, stranger.id] } },
  });
  await prisma.videoReview.delete({ where: { id: review.id } });
  await prisma.trainingVideo.delete({ where: { id: video.id } });
  await prisma.athleteProfile.delete({ where: { id: profile.id } });
  await prisma.athlete.delete({ where: { id: athlete.id } });
  await prisma.user.deleteMany({
    where: { id: { in: [coach.id, athleteUser.id, stranger.id] } },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
