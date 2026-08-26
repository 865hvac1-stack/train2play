/**
 * Sport library + multi-sport athlete checks (requires DATABASE_URL).
 * Run: npx tsx scripts/test-sport-library.ts
 */
import "dotenv/config";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";

import { createPrismaClient } from "../lib/db";
import { replaceAthleteSports } from "../lib/athlete-sports";
import { parseSportsFromFormData } from "../lib/athletes";
import {
  COURSE_ORIGIN,
  copyPlatformCourseToCoach,
  getSharedPlatformCourse,
  listPlatformCoursesForSports,
} from "../lib/sport-library";

const prisma = createPrismaClient();
const stamp = Date.now();

async function main() {
  const form = new FormData();
  form.append("sports", "Baseball");
  form.append("sports", "Basketball");
  form.append("primarySport", "Basketball");
  const parsed = parseSportsFromFormData(form);
  assert.deepEqual(parsed.sports.sort(), ["Baseball", "Basketball"]);
  assert.equal(parsed.primarySport, "Basketball");

  const passwordHash = await bcrypt.hash("TestPass123!", 10);
  const admin = await prisma.user.create({
    data: {
      name: "Library Admin",
      email: `library.admin.${stamp}@example.com`,
      passwordHash,
      role: "PLATFORM_ADMIN",
      onboardingCompletedAt: new Date(),
    },
  });
  const coach = await prisma.user.create({
    data: {
      name: "Baseball Coach",
      email: `library.coach.${stamp}@example.com`,
      passwordHash,
      role: "COACH",
      onboardingCompletedAt: new Date(),
      lookingForSport: "Baseball",
    },
  });
  const athleteUser = await prisma.user.create({
    data: {
      name: "Multi Kid",
      email: `library.athlete.${stamp}@example.com`,
      passwordHash,
      role: "ATHLETE",
      onboardingCompletedAt: new Date(),
    },
  });
  const profile = await prisma.athleteProfile.create({
    data: {
      userId: athleteUser.id,
      firstName: "Multi",
      lastName: "Kid",
      primarySport: "Basketball",
      sports: {
        create: [{ sport: "Basketball", isPrimary: true }],
      },
    },
  });

  await replaceAthleteSports({
    athleteProfileId: profile.id,
    sports: ["Basketball", "Volleyball"],
    primarySport: "Volleyball",
  });
  const sports = await prisma.athleteSport.findMany({
    where: { athleteProfileId: profile.id },
    orderBy: { sport: "asc" },
  });
  assert.deepEqual(
    sports.map((row) => row.sport),
    ["Basketball", "Volleyball"],
  );
  assert.equal(sports.find((row) => row.isPrimary)?.sport, "Volleyball");

  const baseball = await prisma.course.create({
    data: {
      coachId: admin.id,
      origin: COURSE_ORIGIN.PLATFORM,
      sport: "Baseball",
      title: "Infield footwork",
      published: true,
      shareWithCoaches: true,
      shareWithAthletes: false,
      items: {
        create: {
          type: "VIDEO",
          title: "Ready position",
          body: "Stay low.",
          sortOrder: 0,
        },
      },
    },
  });
  const volleyball = await prisma.course.create({
    data: {
      coachId: admin.id,
      origin: COURSE_ORIGIN.PLATFORM,
      sport: "Volleyball",
      title: "Serve receive",
      published: true,
      shareWithCoaches: true,
      shareWithAthletes: true,
      items: {
        create: {
          type: "DRILL",
          title: "Platform angle",
          sortOrder: 0,
        },
      },
    },
  });

  const coachFeed = await listPlatformCoursesForSports({
    sports: ["Baseball"],
    audience: "coaches",
  });
  assert.ok(coachFeed.some((row) => row.id === baseball.id));
  assert.ok(!coachFeed.some((row) => row.id === volleyball.id));

  const athleteFeed = await listPlatformCoursesForSports({
    sports: ["Basketball", "Volleyball"],
    audience: "athletes",
  });
  assert.ok(athleteFeed.some((row) => row.id === volleyball.id));
  assert.ok(!athleteFeed.some((row) => row.id === baseball.id));

  const hiddenFromAthlete = await getSharedPlatformCourse({
    courseId: baseball.id,
    sports: ["Basketball", "Volleyball"],
    audience: "athletes",
  });
  assert.equal(hiddenFromAthlete, null);

  const copy = await copyPlatformCourseToCoach({
    sourceCourseId: baseball.id,
    coachUserId: coach.id,
    coachSports: ["Baseball"],
  });
  assert.equal(copy.sourceCourseId, baseball.id);
  assert.equal(copy.origin, COURSE_ORIGIN.COACH);
  const items = await prisma.courseItem.count({ where: { courseId: copy.id } });
  assert.equal(items, 1);

  const again = await copyPlatformCourseToCoach({
    sourceCourseId: baseball.id,
    coachUserId: coach.id,
    coachSports: ["Baseball"],
  });
  assert.equal(again.id, copy.id);

  await prisma.course.deleteMany({
    where: { id: { in: [baseball.id, volleyball.id, copy.id] } },
  });
  await prisma.athleteProfile.delete({ where: { id: profile.id } });
  await prisma.user.deleteMany({
    where: { id: { in: [admin.id, coach.id, athleteUser.id] } },
  });

  console.log("sport-library integration checks passed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
