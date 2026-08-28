/**
 * Integration checks for Coach Profiles, Find a Coach, and discovery requests.
 * Run: npx tsx scripts/test-coach-discovery.ts
 */
import "dotenv/config";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";

import { createPrismaClient } from "../lib/db";
import {
  CONNECTION_SOURCE,
  CONNECTION_STATUS,
  approveCoachConnection,
  approveGuardianForConnection,
  requestCoachConnection,
} from "../lib/coach-connections";
import { adminReviewCoachProfile, adminUpdateBackgroundCheck, submitCoachProfileForApproval } from "../lib/coaching/approval";
import { searchDiscoverableCoaches } from "../lib/coaching/discovery";
import { ensureCoachProfile, getPublicCoachProfile } from "../lib/coaching/profile";
import { BACKGROUND_CHECK_STATUS, COACH_DISCOVERY_STATUS } from "../lib/coaching/status";
import { canViewAthlete } from "../lib/authz";

const prisma = createPrismaClient();
const stamp = Date.now();

async function main() {
  const passwordHash = await bcrypt.hash("TestPass123!", 10);
  const ids: string[] = [];

  const admin = await prisma.user.create({
    data: {
      name: "Admin Reviewer",
      email: `admin.disc.${stamp}@example.com`,
      passwordHash,
      role: "PLATFORM_ADMIN",
    },
  });
  ids.push(admin.id);

  const coach = await prisma.user.create({
    data: {
      name: "TJ Hurst",
      email: `tj.disc.${stamp}@example.com`,
      passwordHash,
      role: "COACH",
      onboardingCompletedAt: new Date(),
      lookingForSport: "Baseball",
    },
  });
  ids.push(coach.id);

  const trainer = await prisma.user.create({
    data: {
      name: "Director Only",
      email: `director.disc.${stamp}@example.com`,
      passwordHash,
      role: "TRAINER",
    },
  });
  ids.push(trainer.id);

  const adultAthlete = await prisma.user.create({
    data: {
      name: "Adult Player",
      email: `adult.disc.${stamp}@example.com`,
      passwordHash,
      role: "ATHLETE",
    },
  });
  ids.push(adultAthlete.id);

  const minorAthlete = await prisma.user.create({
    data: {
      name: "Minor Player",
      email: `minor.disc.${stamp}@example.com`,
      passwordHash,
      role: "ATHLETE",
    },
  });
  ids.push(minorAthlete.id);

  const adultProfile = await prisma.athleteProfile.create({
    data: {
      userId: adultAthlete.id,
      firstName: "Adult",
      lastName: "Player",
      primarySport: "Baseball",
      dateOfBirth: new Date("2000-01-15"),
      sports: { create: [{ sport: "Baseball", isPrimary: true, position: "SS" }] },
    },
  });
  const minorProfile = await prisma.athleteProfile.create({
    data: {
      userId: minorAthlete.id,
      firstName: "Minor",
      lastName: "Player",
      primarySport: "Baseball",
      dateOfBirth: new Date("2014-06-01"),
      sports: { create: [{ sport: "Baseball", isPrimary: true, position: "CF" }] },
    },
  });

  await assert.rejects(() => ensureCoachProfile(trainer.id), /Only coaches/);

  const profile = await ensureCoachProfile(coach.id);
  assert.equal(profile.discoveryStatus, COACH_DISCOVERY_STATUS.DRAFT);
  assert.equal(profile.backgroundCheckStatus, BACKGROUND_CHECK_STATUS.NOT_STARTED);
  assert.equal(profile.appearInFindACoach, true);

  await prisma.coachProfile.update({
    where: { id: profile.id },
    data: {
      publicSlug: `tj-hurst-${stamp}`,
      displayName: "TJ Hurst",
      bio: "Hitting and fielding development.",
      avatarUrl: "/uploads/images/tj.jpg",
      locationLabel: "Knoxville Area, Tennessee",
      locationState: "TN",
      organizationName: "NexGen Athletics",
      inPersonCoaching: true,
      remoteCoaching: true,
      acceptingAthletes: true,
      appearInFindACoach: true,
      sports: {
        create: {
          sport: "Baseball",
          isPrimary: true,
          specialties: ["Hitting", "Fielding", "Player Development"],
          positions: ["Infield"],
          ageGroups: ["14U", "16U"],
        },
      },
    },
  });

  let search = await searchDiscoverableCoaches({ sport: "Baseball" });
  assert.equal(
    search.coaches.some((row) => row.userId === coach.id),
    false,
    "Unapproved coach must not appear in Find a Coach",
  );

  const publicDraft = await getPublicCoachProfile(`tj-hurst-${stamp}`);
  assert.equal(publicDraft.status, "not_found");

  await submitCoachProfileForApproval(coach.id);
  const submitted = await prisma.coachProfile.findUniqueOrThrow({ where: { id: profile.id } });
  assert.equal(submitted.discoveryStatus, COACH_DISCOVERY_STATUS.SUBMITTED);
  assert.notEqual(submitted.discoveryStatus, COACH_DISCOVERY_STATUS.APPROVED);

  await assert.rejects(
    () =>
      requestCoachConnection({
        athleteProfileId: adultProfile.id,
        coachUserId: coach.id,
        source: CONNECTION_SOURCE.DISCOVERY,
      }),
    /not available in Find a Coach/,
  );

  await adminReviewCoachProfile({
    adminUserId: admin.id,
    coachProfileId: profile.id,
    action: "APPROVE",
  });
  const approved = await prisma.coachProfile.findUniqueOrThrow({ where: { id: profile.id } });
  assert.equal(approved.discoveryStatus, COACH_DISCOVERY_STATUS.APPROVED);
  assert.equal(approved.appearInFindACoach, true);
  assert.equal(approved.backgroundCheckStatus, BACKGROUND_CHECK_STATUS.NOT_STARTED);

  search = await searchDiscoverableCoaches({ sport: "Baseball" });
  assert.equal(search.coaches.some((row) => row.userId === coach.id), true);
  const card = search.coaches.find((row) => row.userId === coach.id)!;
  assert.equal(card.approved, true);
  assert.equal(card.backgroundCheckCompleted, false);

  const publicOk = await getPublicCoachProfile(`tj-hurst-${stamp}`);
  assert.equal(publicOk.status, "ok");
  if (publicOk.status === "ok") {
    assert.equal(publicOk.profile.approved, true);
    assert.equal(publicOk.profile.backgroundCheckCompleted, false);
  }

  await prisma.coachProfile.update({
    where: { id: profile.id },
    data: { appearInFindACoach: false },
  });
  search = await searchDiscoverableCoaches({ sport: "Baseball" });
  assert.equal(search.coaches.some((row) => row.userId === coach.id), false);

  await prisma.coachProfile.update({
    where: { id: profile.id },
    data: { appearInFindACoach: true },
  });

  await adminUpdateBackgroundCheck({
    adminUserId: admin.id,
    coachProfileId: profile.id,
    status: BACKGROUND_CHECK_STATUS.CLEAR,
  });
  const withBg = await getPublicCoachProfile(`tj-hurst-${stamp}`);
  assert.equal(withBg.status, "ok" && withBg.profile.backgroundCheckCompleted);

  const adultRequest = await requestCoachConnection({
    athleteProfileId: adultProfile.id,
    coachUserId: coach.id,
    source: CONNECTION_SOURCE.DISCOVERY,
    athleteNote: "Looking for help with hitting and fielding.",
    requestedSpecialty: "Hitting",
  });
  assert.equal(adultRequest.status, CONNECTION_STATUS.PENDING_COACH);
  assert.equal(adultRequest.guardianApprovalRequired, false);

  await assert.rejects(
    () =>
      requestCoachConnection({
        athleteProfileId: adultProfile.id,
        coachUserId: coach.id,
        source: CONNECTION_SOURCE.DISCOVERY,
      }),
    /pending request/,
  );

  const membershipBefore = await prisma.athleteMembership.findFirst({
    where: { athleteProfileId: adultProfile.id, coachUserId: coach.id, endsAt: null },
  });
  assert.equal(membershipBefore, null);

  const accepted = await approveCoachConnection({
    connectionId: adultRequest.id,
    coachUserId: coach.id,
  });
  assert.equal(accepted.status, CONNECTION_STATUS.APPROVED);
  const rel = await prisma.coachAthleteConnection.findUniqueOrThrow({ where: { id: adultRequest.id } });
  assert.equal(rel.status, CONNECTION_STATUS.APPROVED);
  const membership = await prisma.athleteMembership.findFirst({
    where: { athleteProfileId: adultProfile.id, coachUserId: coach.id, endsAt: null },
  });
  assert.ok(membership);

  const refreshedAdult = await prisma.athleteProfile.findUniqueOrThrow({
    where: { id: adultProfile.id },
    select: { legacyAthleteId: true },
  });
  assert.ok(refreshedAdult.legacyAthleteId);
  assert.equal(await canViewAthlete(prisma, coach.id, refreshedAdult.legacyAthleteId!), true);

  const minorRequest = await requestCoachConnection({
    athleteProfileId: minorProfile.id,
    coachUserId: coach.id,
    source: CONNECTION_SOURCE.DISCOVERY,
  });
  assert.equal(minorRequest.status, CONNECTION_STATUS.PENDING_GUARDIAN);
  assert.equal(minorRequest.guardianApprovalRequired, true);

  await assert.rejects(
    () => approveCoachConnection({ connectionId: minorRequest.id, coachUserId: coach.id }),
    /not found/,
  );

  await approveGuardianForConnection({
    connectionId: minorRequest.id,
    athleteProfileId: minorProfile.id,
  });
  const afterGuardian = await prisma.coachAthleteConnection.findUniqueOrThrow({
    where: { id: minorRequest.id },
  });
  assert.equal(afterGuardian.status, CONNECTION_STATUS.PENDING_COACH);
  assert.ok(afterGuardian.guardianApprovedAt);

  await approveCoachConnection({
    connectionId: minorRequest.id,
    coachUserId: coach.id,
  });

  await adminReviewCoachProfile({
    adminUserId: admin.id,
    coachProfileId: profile.id,
    action: "SUSPEND",
  });
  search = await searchDiscoverableCoaches({ sport: "Baseball" });
  assert.equal(search.coaches.some((row) => row.userId === coach.id), false);
  const publicSuspended = await getPublicCoachProfile(`tj-hurst-${stamp}`);
  assert.equal(publicSuspended.status, "not_found");

  const stillConnected = await prisma.coachAthleteConnection.findFirst({
    where: { coachUserId: coach.id, athleteProfileId: adultProfile.id, status: CONNECTION_STATUS.APPROVED },
  });
  assert.ok(stillConnected, "Suspension must not destroy existing relationships");

  const codeCoach = await prisma.user.create({
    data: {
      name: "Code Coach",
      email: `code.disc.${stamp}@example.com`,
      passwordHash,
      role: "COACH",
      onboardingCompletedAt: new Date(),
      connectionCode: `HURST${String(stamp).slice(-4)}`,
    },
  });
  ids.push(codeCoach.id);
  const extraAthlete = await prisma.user.create({
    data: {
      name: "Code Athlete",
      email: `codeath.disc.${stamp}@example.com`,
      passwordHash,
      role: "ATHLETE",
    },
  });
  ids.push(extraAthlete.id);
  const extraProfile = await prisma.athleteProfile.create({
    data: {
      userId: extraAthlete.id,
      firstName: "Code",
      lastName: "Athlete",
      primarySport: "Baseball",
      dateOfBirth: new Date("2001-03-03"),
      sports: { create: [{ sport: "Baseball", isPrimary: true }] },
    },
  });
  const codeRequest = await requestCoachConnection({
    athleteProfileId: extraProfile.id,
    coachUserId: codeCoach.id,
    source: CONNECTION_SOURCE.COACH_CODE,
  });
  assert.equal(codeRequest.status, CONNECTION_STATUS.PENDING);
  await approveCoachConnection({ connectionId: codeRequest.id, coachUserId: codeCoach.id });
  const codeApproved = await prisma.coachAthleteConnection.findUniqueOrThrow({
    where: { id: codeRequest.id },
  });
  assert.equal(codeApproved.status, CONNECTION_STATUS.APPROVED);
  assert.equal(codeApproved.source, CONNECTION_SOURCE.COACH_CODE);

  console.log("coach-discovery integration checks passed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
