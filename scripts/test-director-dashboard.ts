import assert from "node:assert/strict";

import { prisma } from "../lib/db";
import { getSportProgramHealth } from "../lib/director-dashboard";

async function main() {
const stamp = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
let coachId: string | null = null;
const athleteProfileIds: string[] = [];
const courseIds: string[] = [];
let trainingVideoId: string | null = null;

try {
  const coach = await prisma.user.create({
    data: {
      name: "Director dashboard test coach",
      email: `director-coach-${stamp}@example.com`,
      passwordHash: "not-a-login",
      role: "COACH",
      onboardingCompletedAt: new Date(),
    },
  });
  coachId = coach.id;

  const athlete = await prisma.athleteProfile.create({
    data: {
      firstName: "Dashboard",
      lastName: "Test Athlete",
      dateOfBirth: new Date("2012-05-01T00:00:00.000Z"),
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
      primarySport: "Baseball",
      sports: {
        create: [
          { sport: "Baseball", isPrimary: true },
          { sport: "Basketball", isPrimary: false },
        ],
      },
      coachConnections: {
        create: {
          coachUserId: coach.id,
          status: "APPROVED",
          source: "ADMIN",
          approvedAt: new Date(),
        },
      },
    },
  });
  athleteProfileIds.push(athlete.id);

  const course = await prisma.course.create({
    data: {
      coachId: coach.id,
      sport: "Baseball",
      title: `Director test course ${stamp}`,
      origin: "PLATFORM",
      published: true,
      shareWithAthletes: true,
      items: {
        create: {
          type: "VIDEO",
          title: "Director test video",
          videoUrl: "https://example.com/demo.mp4",
        },
      },
    },
    include: { items: true },
  });
  courseIds.push(course.id);
  const item = course.items[0]!;

  await prisma.courseItemProgress.create({
    data: {
      athleteProfileId: athlete.id,
      courseItemId: item.id,
      viewedAt: new Date(),
      completedAt: new Date(),
      viewCount: 1,
    },
  });

  const incompleteCourse = await prisma.course.create({
    data: {
      coachId: coach.id,
      sport: "Baseball",
      title: `Incomplete director test course ${stamp}`,
      origin: "PLATFORM",
      published: true,
      shareWithAthletes: true,
      items: {
        create: [
          {
            type: "VIDEO",
            title: "Started test item",
            videoUrl: "https://example.com/started.mp4",
            sortOrder: 0,
          },
          { type: "DRILL", title: "Unfinished test item", sortOrder: 1 },
        ],
      },
    },
    include: { items: true },
  });
  courseIds.push(incompleteCourse.id);
  await prisma.courseItemProgress.create({
    data: {
      athleteProfileId: athlete.id,
      courseItemId: incompleteCourse.items[0]!.id,
      viewedAt: new Date(),
      completedAt: new Date(),
      viewCount: 1,
    },
  });

  const uncoachedAthlete = await prisma.athleteProfile.create({
    data: {
      firstName: "Uncoached",
      lastName: "Test Athlete",
      primarySport: "Baseball",
      sports: { create: { sport: "Baseball", isPrimary: true } },
    },
  });
  athleteProfileIds.push(uncoachedAthlete.id);

  const trainingVideo = await prisma.trainingVideo.create({
    data: {
      coachId: coach.id,
      title: "Waiting review test video",
      videoUrl: "https://example.com/review.mp4",
    },
  });
  trainingVideoId = trainingVideo.id;
  const waitingReview = await prisma.videoReview.create({
    data: {
      trainingVideoId: trainingVideo.id,
      athleteProfileId: athlete.id,
      coachUserId: coach.id,
      uploadedByUserId: coach.id,
      title: "Waiting director test review",
      sport: "Baseball",
      category: "Hitting",
      status: "AWAITING_REVIEW",
    },
  });

  const health = await getSportProgramHealth("Baseball");
  const athleteRow = health.athletes.find((row) => row.id === athlete.id);
  const courseRow = health.courseHealth.find((row) => row.id === course.id);

  assert.ok(athleteRow, "Baseball athlete should appear in director roster");
  assert.equal(athleteRow.sports.length, 2, "Multi-sport profile should be preserved");
  assert.equal(athleteRow.watchedVideo, true, "Video view should reach dashboard");
  assert.equal(athleteRow.completedCourse, true, "Completion should reach dashboard");
  assert.equal(
    athleteRow.incompleteCourse,
    true,
    "Started but unfinished course should need attention",
  );
  assert.equal(athleteRow.needsTraining, true, "14-day inactivity should surface");
  assert.equal(athleteRow.coachCount, 1, "Approved coach should be counted");
  assert.ok(courseRow, "Published Baseball course should appear");
  assert.equal(courseRow.viewerCount >= 1, true, "Course should count its viewer");
  assert.equal(
    courseRow.completionCount >= 1,
    true,
    "Course should count its completer",
  );
  assert.equal(
    health.athletes.find((row) => row.id === uncoachedAthlete.id)?.coachCount,
    0,
    "Unconnected athlete should need attention",
  );
  assert.ok(
    health.waitingVideoReviews.some((review) => review.id === waitingReview.id),
    "Waiting review should reach director queue",
  );
  assert.ok(
    health.inactiveCoaches.some((row) => row.id === coach.id),
    "Coach without a recent assignment should need attention",
  );

  console.log("director-dashboard integration checks passed");
} finally {
  if (courseIds.length > 0) {
    await prisma.course.deleteMany({ where: { id: { in: courseIds } } });
  }
  if (athleteProfileIds.length > 0) {
    await prisma.athleteProfile.deleteMany({
      where: { id: { in: athleteProfileIds } },
    });
  }
  if (trainingVideoId) {
    await prisma.trainingVideo.deleteMany({ where: { id: trainingVideoId } });
  }
  if (coachId) {
    await prisma.user.deleteMany({ where: { id: coachId } });
  }
  await prisma.$disconnect();
}
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
