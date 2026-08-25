/**
 * Integration checks for coach connection codes (requires DATABASE_URL).
 * Run: npx tsx scripts/test-coach-connections.ts
 */
import "dotenv/config";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";

import { createPrismaClient } from "../lib/db";
import {
  CONNECTION_SOURCE,
  CONNECTION_STATUS,
  approveCoachConnection,
  declineCoachConnection,
  ensureCoachConnectionCode,
  ensureEmailInviteConnection,
  lookupCoachByConnectionCode,
  regenerateCoachConnectionCode,
  requestCoachConnection,
} from "../lib/coach-connections";
import { canEditAthlete, canViewAthlete } from "../lib/authz";
import { getRosterAthletesForCoach } from "../lib/player-profile-server";

const prisma = createPrismaClient();
const stamp = Date.now();

async function main() {
  const passwordHash = await bcrypt.hash("TestPass123!", 10);

  const coachA = await prisma.user.create({
    data: {
      name: "Coach Lester",
      email: `lester.conn.${stamp}@example.com`,
      passwordHash,
      role: "COACH",
      onboardingCompletedAt: new Date(),
      lookingForSport: "Basketball",
    },
  });
  const coachB = await prisma.user.create({
    data: {
      name: "Coach Speed",
      email: `speed.conn.${stamp}@example.com`,
      passwordHash,
      role: "COACH",
      onboardingCompletedAt: new Date(),
      lookingForSport: "Track",
    },
  });
  const athleteUser = await prisma.user.create({
    data: {
      name: "John Smith",
      email: `john.conn.${stamp}@example.com`,
      passwordHash,
      role: "ATHLETE",
    },
  });
  const stranger = await prisma.user.create({
    data: {
      name: "Stranger Coach",
      email: `stranger.conn.${stamp}@example.com`,
      passwordHash,
      role: "COACH",
      onboardingCompletedAt: new Date(),
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

  // 1. Unique connection code
  const codeA = await ensureCoachConnectionCode(coachA.id);
  assert.ok(codeA.code);
  const again = await ensureCoachConnectionCode(coachA.id);
  assert.equal(again.code, codeA.code);

  const codeB = await ensureCoachConnectionCode(coachB.id);
  assert.notEqual(codeA.code, codeB.code);

  // 2–3. Lookup preview (no email)
  const preview = await lookupCoachByConnectionCode(codeA.code.toLowerCase());
  assert.ok(preview);
  assert.equal(preview!.name, "Coach Lester");
  assert.equal(preview!.sport, "Basketball");
  assert.equal(
    Object.prototype.hasOwnProperty.call(preview, "email"),
    false,
  );

  const invalid = await lookupCoachByConnectionCode("NOPE9999");
  assert.equal(invalid, null);

  // 4. Request connection
  const request = await requestCoachConnection({
    athleteProfileId: profile.id,
    coachUserId: coachA.id,
    source: CONNECTION_SOURCE.COACH_CODE,
  });
  assert.equal(request.status, CONNECTION_STATUS.PENDING);

  // 14. Duplicate pending prevented
  await assert.rejects(
    () =>
      requestCoachConnection({
        athleteProfileId: profile.id,
        coachUserId: coachA.id,
      }),
    /pending/i,
  );

  // 5. Coach sees pending
  const pending = await prisma.coachAthleteConnection.findMany({
    where: { coachUserId: coachA.id, status: CONNECTION_STATUS.PENDING },
  });
  assert.equal(pending.length, 1);

  // 13. Decline does not create active connection
  const declineReq = await requestCoachConnection({
    athleteProfileId: profile.id,
    coachUserId: coachB.id,
  });
  await declineCoachConnection({
    connectionId: declineReq.id,
    coachUserId: coachB.id,
  });
  const declined = await prisma.coachAthleteConnection.findUnique({
    where: { id: declineReq.id },
  });
  assert.equal(declined?.status, CONNECTION_STATUS.DECLINED);
  assert.equal(await canViewAthlete(prisma, coachB.id, "missing"), false);

  // 6. Approve
  await approveCoachConnection({
    connectionId: request.id,
    coachUserId: coachA.id,
  });
  const approved = await prisma.coachAthleteConnection.findUnique({
    where: { id: request.id },
  });
  assert.equal(approved?.status, CONNECTION_STATUS.APPROVED);

  const linkedProfile = await prisma.athleteProfile.findUniqueOrThrow({
    where: { id: profile.id },
  });
  assert.ok(linkedProfile.legacyAthleteId);

  // 7. On roster
  const rosterA = await getRosterAthletesForCoach(coachA.id);
  assert.ok(rosterA.some((a) => a.id === linkedProfile.legacyAthleteId));

  // 8–9. Assign training
  const plan = await prisma.trainingPlan.create({
    data: {
      coachId: coachA.id,
      athleteId: linkedProfile.legacyAthleteId!,
      title: "8-Week Basketball Development",
      status: "ACTIVE",
      workouts: {
        create: [{ title: "Week 1 Day 1", sortOrder: 0, durationMinutes: 35 }],
      },
    },
  });
  assert.ok(plan.id);

  // Authz: coach A can edit; stranger cannot
  assert.equal(
    await canEditAthlete(prisma, coachA.id, linkedProfile.legacyAthleteId!),
    true,
  );
  assert.equal(
    await canViewAthlete(prisma, stranger.id, linkedProfile.legacyAthleteId!),
    false,
  );

  // 10–11. Second coach
  const req2 = await requestCoachConnection({
    athleteProfileId: profile.id,
    coachUserId: coachB.id,
  });
  await approveCoachConnection({
    connectionId: req2.id,
    coachUserId: coachB.id,
  });
  const rosterB = await getRosterAthletesForCoach(coachB.id);
  assert.ok(rosterB.some((a) => a.id === linkedProfile.legacyAthleteId));
  const stillA = await getRosterAthletesForCoach(coachA.id);
  assert.ok(stillA.some((a) => a.id === linkedProfile.legacyAthleteId));

  // 17. Email invite path still creates approved connection
  const emailAthlete = await prisma.athlete.create({
    data: {
      coachId: coachA.id,
      firstName: "Roster",
      lastName: "Kid",
      sport: "Basketball",
      rosterStatus: "ROSTER",
    },
  });
  await prisma.athleteProfile.create({
    data: {
      firstName: "Roster",
      lastName: "Kid",
      primarySport: "Basketball",
      legacyAthleteId: emailAthlete.id,
    },
  });
  const emailConn = await ensureEmailInviteConnection({
    coachUserId: coachA.id,
    athleteId: emailAthlete.id,
  });
  assert.equal(emailConn?.status, CONNECTION_STATUS.APPROVED);
  assert.equal(emailConn?.source, CONNECTION_SOURCE.EMAIL_INVITE);

  // 15. Code is not a login credential — regenerating invalidates old lookup
  const oldCode = codeA.code;
  const regenerated = await regenerateCoachConnectionCode(coachA.id);
  assert.notEqual(regenerated.code, oldCode);
  assert.equal(await lookupCoachByConnectionCode(oldCode), null);
  assert.ok(await lookupCoachByConnectionCode(regenerated.code));

  // Existing approved connection survives regenerate
  assert.equal(
    await canEditAthlete(prisma, coachA.id, linkedProfile.legacyAthleteId!),
    true,
  );

  console.log("coach-connection integration checks passed");

  // cleanup
  await prisma.trainingPlan.deleteMany({
    where: { coachId: { in: [coachA.id, coachB.id] } },
  });
  await prisma.coachAthleteConnection.deleteMany({
    where: { coachUserId: { in: [coachA.id, coachB.id, stranger.id] } },
  });
  await prisma.athleteMembership.deleteMany({
    where: { coachUserId: { in: [coachA.id, coachB.id] } },
  });
  await prisma.athleteProfile.deleteMany({
    where: {
      OR: [
        { userId: athleteUser.id },
        { legacyAthleteId: emailAthlete.id },
      ],
    },
  });
  await prisma.athlete.deleteMany({
    where: { id: { in: [linkedProfile.legacyAthleteId!, emailAthlete.id] } },
  });
  await prisma.user.deleteMany({
    where: {
      id: { in: [coachA.id, coachB.id, athleteUser.id, stranger.id] },
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
