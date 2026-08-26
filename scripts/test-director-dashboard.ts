import assert from "node:assert/strict";

import { prisma } from "../lib/db";
import { getSportProgramHealth } from "../lib/director-dashboard";

async function main() {
const stamp = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
let coachId: string | null = null;
let athleteProfileId: string | null = null;
let courseId: string | null = null;

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
  athleteProfileId = athlete.id;

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
  courseId = course.id;
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

  const health = await getSportProgramHealth("Baseball");
  const athleteRow = health.athletes.find((row) => row.id === athlete.id);
  const courseRow = health.courseHealth.find((row) => row.id === course.id);

  assert.ok(athleteRow, "Baseball athlete should appear in director roster");
  assert.equal(athleteRow.sports.length, 2, "Multi-sport profile should be preserved");
  assert.equal(athleteRow.watchedVideo, true, "Video view should reach dashboard");
  assert.equal(athleteRow.completedCourse, true, "Completion should reach dashboard");
  assert.equal(athleteRow.coachCount, 1, "Approved coach should be counted");
  assert.ok(courseRow, "Published Baseball course should appear");
  assert.equal(courseRow.viewerCount >= 1, true, "Course should count its viewer");
  assert.equal(
    courseRow.completionCount >= 1,
    true,
    "Course should count its completer",
  );

  console.log("director-dashboard integration checks passed");
} finally {
  if (courseId) {
    await prisma.course.deleteMany({ where: { id: courseId } });
  }
  if (athleteProfileId) {
    await prisma.athleteProfile.deleteMany({ where: { id: athleteProfileId } });
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
