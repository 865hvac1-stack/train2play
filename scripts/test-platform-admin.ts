/**
 * Platform Admin analytics and governance checks.
 * Run: npx tsx scripts/test-platform-admin.ts
 */
import "dotenv/config";
import assert from "node:assert/strict";

import {
  countAthletesForSport,
  countCoachesForSport,
  countOrganizationsForSport,
  getAdminActivity,
  getPlatformCommandCenter,
  getPlatformGrowth,
  normalizeAdminRange,
  rangeStart,
} from "../lib/admin-analytics";
import { createPrismaClient } from "../lib/db";
import {
  ALLOWLIST_ENV_VARS,
  allowlistedRoleForEmail,
} from "../lib/role-allowlist";

const prisma = createPrismaClient();
const stamp = Date.now();

function checkAllowlist() {
  const previousAdmins = process.env.PLATFORM_ADMIN_EMAIL;
  const previousTrainers = process.env.TRAINER_EMAILS;
  try {
    process.env.PLATFORM_ADMIN_EMAIL = "";
    process.env.TRAINER_EMAILS = "";
    assert.equal(allowlistedRoleForEmail("nobody@train2play.com"), null);

    process.env.PLATFORM_ADMIN_EMAIL = " Admin@Train2Play.com , tj@t2p.com ";
    process.env.TRAINER_EMAILS = "chase@train2play.com";
    assert.equal(
      allowlistedRoleForEmail("admin@train2play.com"),
      "PLATFORM_ADMIN",
      "allowlist must ignore case and surrounding spaces",
    );
    assert.equal(allowlistedRoleForEmail("TJ@t2p.com"), "PLATFORM_ADMIN");
    assert.equal(allowlistedRoleForEmail("chase@train2play.com"), "TRAINER");
    assert.equal(allowlistedRoleForEmail("someone@else.com"), null);
    assert.equal(allowlistedRoleForEmail(null), null);

    process.env.TRAINER_EMAILS = "admin@train2play.com";
    assert.equal(
      allowlistedRoleForEmail("admin@train2play.com"),
      "PLATFORM_ADMIN",
      "platform admin must win when an email is in both variables",
    );
    assert.equal(ALLOWLIST_ENV_VARS.TRAINER, "TRAINER_EMAILS");
    assert.equal(ALLOWLIST_ENV_VARS.PLATFORM_ADMIN, "PLATFORM_ADMIN_EMAIL");
  } finally {
    process.env.PLATFORM_ADMIN_EMAIL = previousAdmins;
    process.env.TRAINER_EMAILS = previousTrainers;
  }
}

async function main() {
  checkAllowlist();

  assert.equal(normalizeAdminRange(undefined), "30d");
  assert.equal(normalizeAdminRange("nonsense"), "30d");
  assert.equal(normalizeAdminRange("7d"), "7d");
  assert.equal(rangeStart("all"), null, "all time must not filter by date");
  assert.ok(rangeStart("7d")! < new Date(), "range start must be in the past");

  const sports = await prisma.platformSport.findMany();
  assert.ok(
    sports.some((sport) => sport.name === "Baseball"),
    "platform sport catalog should be seeded",
  );

  const organization = await prisma.organization.create({
    data: {
      name: `Admin Test Org ${stamp}`,
      slug: `admin-test-org-${stamp}`,
    },
  });
  const coach = await prisma.user.create({
    data: {
      name: "Admin Test Coach",
      email: `admin-test-coach-${stamp}@example.com`,
      passwordHash: "not-a-real-login",
      role: "COACH",
    },
  });
  const director = await prisma.user.create({
    data: {
      name: "Admin Test Director",
      email: `admin-test-director-${stamp}@example.com`,
      passwordHash: "not-a-real-login",
      role: "TRAINER",
    },
  });
  const rosterAthlete = await prisma.athlete.create({
    data: {
      coachId: coach.id,
      firstName: "AdminTest",
      lastName: `Athlete${stamp}`,
      sport: "Wrestling",
      dateOfBirth: new Date("2013-03-03T00:00:00.000Z"),
    },
  });
  const profile = await prisma.athleteProfile.create({
    data: {
      firstName: "AdminTest",
      lastName: `Athlete${stamp}`,
      primarySport: "Wrestling",
      legacyAthleteId: rosterAthlete.id,
      sports: { create: { sport: "Wrestling", isPrimary: true } },
      memberships: {
        create: { organizationId: organization.id, coachUserId: coach.id },
      },
    },
  });
  const wrestling = sports.find((sport) => sport.name === "Wrestling")!;
  const assignment = await prisma.directorSportAssignment.create({
    data: {
      directorUserId: director.id,
      sportId: wrestling.id,
      organizationId: organization.id,
      assignedById: director.id,
    },
  });
  const plan = await prisma.trainingPlan.create({
    data: {
      coachId: coach.id,
      athleteId: rosterAthlete.id,
      title: `Admin test plan ${stamp}`,
      status: "ACTIVE",
      workouts: {
        create: { title: "Admin test workout", sortOrder: 0 },
      },
    },
    include: { workouts: true },
  });
  const session = await prisma.workoutSession.create({
    data: {
      workoutId: plan.workouts[0]!.id,
      athleteId: rosterAthlete.id,
      status: "COMPLETED",
      completedAt: new Date(),
    },
  });
  const audit = await prisma.adminAuditLog.create({
    data: {
      actorUserId: director.id,
      action: "ADMIN_TEST_ACTION",
      entityType: "ORGANIZATION",
      entityId: organization.id,
      summary: `Admin test audit ${stamp}`,
    },
  });

  try {
    const wrestlingAthletes = await countAthletesForSport("Wrestling");
    assert.ok(wrestlingAthletes >= 1, "sport athlete count should see the profile");
    const activeWrestling = await countAthletesForSport(
      "Wrestling",
      new Date(Date.now() - 7 * 86400000),
    );
    assert.ok(
      activeWrestling >= 1,
      "a completed workout should count as meaningful activity",
    );
    const wrestlingCoaches = await countCoachesForSport("Wrestling");
    assert.ok(wrestlingCoaches >= 1, "sport coach count should see the coach");
    const wrestlingOrgs = await countOrganizationsForSport("Wrestling");
    assert.ok(
      wrestlingOrgs >= 1,
      "organization count should see the athlete membership",
    );

    const data = await getPlatformCommandCenter("30d");
    assert.ok(data.metrics.totalAthletes >= 1);
    assert.ok(data.metrics.totalCoaches >= 1);
    assert.ok(data.metrics.totalDirectors >= 1);
    assert.ok(data.metrics.totalOrganizations >= 1);
    assert.ok(
      data.metrics.workoutsCompleted >= 1,
      "training output should count the completed session",
    );
    assert.equal(data.journey[0]?.key, "registered");
    assert.equal(
      data.journey[0]?.count,
      data.metrics.totalAthletes,
      "journey should start from every registered profile",
    );
    assert.ok(
      data.journey.every((stage) => stage.percent >= 0 && stage.percent <= 100),
      "journey percentages must be real percentages",
    );
    assert.equal(
      data.conversions.length,
      data.journey.length - 1,
      "each journey step needs a conversion rate",
    );
    assert.ok(
      data.attention.every((item) => item.count > 0),
      "attention must only surface real conditions",
    );
    assert.ok(
      data.sports.some((sport) => sport.name === "Wrestling"),
      "sport health should include catalog sports",
    );
    const wrestlingHealth = data.sports.find(
      (sport) => sport.name === "Wrestling",
    )!;
    assert.ok(wrestlingHealth.athletes >= 1);
    assert.ok(
      wrestlingHealth.activeRate >= 0 && wrestlingHealth.activeRate <= 100,
    );
    assert.ok(
      data.organizations.some((org) => org.id === organization.id),
      "organization health should include the new organization",
    );

    const allTime = await getPlatformCommandCenter("all");
    assert.ok(
      allTime.metrics.workoutsCompleted >= data.metrics.workoutsCompleted,
      "all-time activity cannot be lower than a 30 day window",
    );
    assert.equal(
      allTime.metrics.totalAthletes,
      data.metrics.totalAthletes,
      "lifetime population must not change with the date filter",
    );

    const growth = await getPlatformGrowth(30);
    assert.ok(Array.isArray(growth));
    assert.ok(
      growth.every(
        (point) =>
          point.athletes >= 0 &&
          point.coaches >= 0 &&
          point.directors >= 0 &&
          point.organizations >= 0,
      ),
      "growth buckets must be real non-negative counts",
    );

    const activity = await getAdminActivity({ limit: 50 });
    assert.ok(
      activity.some((item) => item.type === "TRAINING"),
      "activity should include the completed workout",
    );
    const videosOnly = await getAdminActivity({ type: "VIDEOS", limit: 20 });
    assert.ok(
      videosOnly.every((item) => item.type === "VIDEOS"),
      "activity filters must be honored",
    );
    const sorted = [...activity].sort((a, b) => b.at.getTime() - a.at.getTime());
    assert.deepEqual(
      activity.map((item) => item.id),
      sorted.map((item) => item.id),
      "activity must be newest first",
    );

    console.log("platform-admin checks passed");
  } finally {
    await prisma.adminAuditLog.delete({ where: { id: audit.id } });
    await prisma.workoutSession.delete({ where: { id: session.id } });
    await prisma.trainingPlan.delete({ where: { id: plan.id } });
    await prisma.directorSportAssignment.delete({ where: { id: assignment.id } });
    await prisma.athleteProfile.delete({ where: { id: profile.id } });
    await prisma.athlete.delete({ where: { id: rosterAthlete.id } });
    await prisma.organization.delete({ where: { id: organization.id } });
    await prisma.user.deleteMany({
      where: { id: { in: [coach.id, director.id] } },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
