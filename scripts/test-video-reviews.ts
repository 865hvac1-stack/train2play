/**
 * Video review workflow checks (requires DATABASE_URL).
 * Run: npx tsx scripts/test-video-reviews.ts
 */
import "dotenv/config";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";

import { createPrismaClient } from "../lib/db";
import {
  CONNECTION_SOURCE,
  approveCoachConnection,
  ensureCoachConnectionCode,
  requestCoachConnection,
} from "../lib/coach-connections";
import {
  assignDrillFromReview,
  canAccessVideoReview,
  completeVideoReview,
  submitVideoForReview,
} from "../lib/video-reviews";
import { VIDEO_REVIEW_STATUS } from "../lib/video-categories";
import { DEMO_VIDEO_URL } from "../lib/videos";
import { listCatalogDrillsForSport } from "../lib/catalog-drills";

const prisma = createPrismaClient();
const stamp = Date.now();

async function main() {
  const passwordHash = await bcrypt.hash("TestPass123!", 10);

  const coach = await prisma.user.create({
    data: {
      name: "Coach Lester",
      email: `lester.video.${stamp}@example.com`,
      passwordHash,
      role: "COACH",
      onboardingCompletedAt: new Date(),
      lookingForSport: "Basketball",
    },
  });
  const stranger = await prisma.user.create({
    data: {
      name: "Stranger",
      email: `stranger.video.${stamp}@example.com`,
      passwordHash,
      role: "COACH",
      onboardingCompletedAt: new Date(),
    },
  });
  const athleteUser = await prisma.user.create({
    data: {
      name: "John Smith",
      email: `john.video.${stamp}@example.com`,
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
      sports: { create: [{ sport: "Basketball", isPrimary: true }] },
    },
  });

  await ensureCoachConnectionCode(coach.id);
  const req = await requestCoachConnection({
    athleteProfileId: profile.id,
    coachUserId: coach.id,
    source: CONNECTION_SOURCE.COACH_CODE,
  });
  await approveCoachConnection({
    connectionId: req.id,
    coachUserId: coach.id,
  });
  const linked = await prisma.athleteProfile.findUniqueOrThrow({
    where: { id: profile.id },
  });
  assert.ok(linked.legacyAthleteId);

  // Cannot submit to unconnected coach
  await assert.rejects(
    () =>
      submitVideoForReview({
        uploadedByUserId: athleteUser.id,
        athleteProfileId: profile.id,
        legacyAthleteId: linked.legacyAthleteId,
        coachUserId: stranger.id,
        title: "Nope",
        sport: "Basketball",
        category: "Shooting",
        videoUrl: DEMO_VIDEO_URL,
        sourceType: "URL",
      }),
    /connected/i,
  );

  const { review } = await submitVideoForReview({
    uploadedByUserId: athleteUser.id,
    athleteProfileId: profile.id,
    legacyAthleteId: linked.legacyAthleteId,
    coachUserId: coach.id,
    title: "Shooting Form",
    sport: "Basketball",
    category: "Shooting",
    athleteNote: "I'm missing left. Can you check my feet?",
    videoUrl: DEMO_VIDEO_URL,
    sourceType: "URL",
  });
  assert.equal(review.status, VIDEO_REVIEW_STATUS.AWAITING_REVIEW);

  const coachAccess = await canAccessVideoReview({
    reviewId: review.id,
    userId: coach.id,
    asCoach: true,
  });
  assert.ok(coachAccess);

  const strangerAccess = await canAccessVideoReview({
    reviewId: review.id,
    userId: stranger.id,
    asCoach: true,
  });
  assert.equal(strangerAccess, null);

  await prisma.videoAnnotation.create({
    data: {
      videoId: review.trainingVideoId,
      timestampMs: 1500,
      label: "Feet",
      note: "Too narrow",
      strokes: JSON.stringify([
        {
          tool: "circle",
          color: "#FF6600",
          width: 3,
          points: [
            { x: 0.4, y: 0.6 },
            { x: 0.5, y: 0.7 },
          ],
        },
      ]),
    },
  });

  const drills = await listCatalogDrillsForSport("Basketball");
  assert.ok(drills.length > 0);
  const plan = await assignDrillFromReview({
    reviewId: review.id,
    coachUserId: coach.id,
    drillId: drills[0]!.drill.id,
    sport: "Basketball",
    sets: 3,
    reps: 10,
    coachNote: "Get your feet set early.",
    legacyAthleteId: linked.legacyAthleteId!,
  });
  assert.equal(plan.athleteId, linked.legacyAthleteId);

  await completeVideoReview({
    reviewId: review.id,
    coachUserId: coach.id,
    coachFeedback: "Your base is too narrow before the catch.",
  });

  const done = await prisma.videoReview.findUniqueOrThrow({
    where: { id: review.id },
    include: { trainingLinks: true },
  });
  assert.equal(done.status, VIDEO_REVIEW_STATUS.REVIEWED);
  assert.ok(done.trainingLinks.length >= 1);

  const athleteNotifs = await prisma.appNotification.findMany({
    where: { userId: athleteUser.id },
  });
  assert.ok(athleteNotifs.length >= 1);

  const coachNotifs = await prisma.appNotification.findMany({
    where: { userId: coach.id, type: "VIDEO_SUBMITTED" },
  });
  assert.ok(coachNotifs.length >= 1);

  console.log("video-review integration checks passed");

  // cleanup
  await prisma.appNotification.deleteMany({
    where: { userId: { in: [coach.id, athleteUser.id, stranger.id] } },
  });
  await prisma.videoReviewTrainingLink.deleteMany({
    where: { videoReviewId: review.id },
  });
  await prisma.trainingPlan.deleteMany({ where: { id: plan.id } });
  await prisma.videoAnnotation.deleteMany({
    where: { videoId: review.trainingVideoId },
  });
  await prisma.videoReview.deleteMany({ where: { id: review.id } });
  await prisma.trainingVideo.deleteMany({
    where: { id: review.trainingVideoId },
  });
  await prisma.coachAthleteConnection.deleteMany({
    where: { athleteProfileId: profile.id },
  });
  await prisma.athleteMembership.deleteMany({
    where: { athleteProfileId: profile.id },
  });
  await prisma.athleteProfile.delete({ where: { id: profile.id } });
  if (linked.legacyAthleteId) {
    await prisma.athlete.delete({ where: { id: linked.legacyAthleteId } });
  }
  await prisma.user.deleteMany({
    where: { id: { in: [coach.id, stranger.id, athleteUser.id] } },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
