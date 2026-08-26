/**
 * Suggested drill delivery checks: real sends, coach hand-offs, and the
 * director's "who has it" report. Run: npx tsx scripts/test-drill-delivery.ts
 */
import "dotenv/config";
import assert from "node:assert/strict";

import { createPrismaClient } from "../lib/db";
import {
  getDrillDeliveryCounts,
  getDrillDeliveryReport,
  listCoachPushAthletes,
  markDrillPushesViewed,
  pushDrillToAthletes,
  pushDrillToSavedAudience,
  resolveDrillAudienceAthleteIds,
} from "../lib/catalog-drill-delivery";
import { getSuggestedDrills } from "../lib/catalog-drills";

const prisma = createPrismaClient();
const stamp = Date.now();

async function main() {
  const director = await prisma.user.create({
    data: {
      name: "Delivery Director",
      email: `delivery-director-${stamp}@example.com`,
      role: "TRAINER",
      passwordHash: "not-a-real-login",
    },
  });
  const coach = await prisma.user.create({
    data: {
      name: "Delivery Coach",
      email: `delivery-coach-${stamp}@example.com`,
      role: "COACH",
      passwordHash: "not-a-real-login",
    },
  });
  const rosterAthlete = await prisma.athlete.create({
    data: {
      coachId: coach.id,
      firstName: "Rostered",
      lastName: `Delivery${stamp}`,
      sport: "Soccer",
      dateOfBirth: new Date("2016-05-01T00:00:00.000Z"),
    },
  });
  const coachPlayer = await prisma.athleteProfile.create({
    data: {
      firstName: "Rostered",
      lastName: `Delivery${stamp}`,
      primarySport: "Soccer",
      dateOfBirth: new Date("2016-05-01T00:00:00.000Z"),
      legacyAthleteId: rosterAthlete.id,
      sports: { create: { sport: "Soccer", isPrimary: true } },
    },
  });
  const sportPlayer = await prisma.athleteProfile.create({
    data: {
      firstName: "Everyone",
      lastName: `Delivery${stamp}`,
      primarySport: "Soccer",
      dateOfBirth: new Date("2016-05-01T00:00:00.000Z"),
      sports: { create: { sport: "Soccer", isPrimary: true } },
    },
  });

  const drill = await prisma.catalogDrill.create({
    data: {
      sport: "Soccer",
      // Deliberately mismatched with both players' age band.
      ageBand: "17-18",
      title: `Delivery test ${stamp}`,
      focus: "Delivery",
      durationMin: 10,
      equipment: "Ball",
      howTo: "Confirm the send actually lands.",
      coachingCue: "Should arrive even with a different age band.",
      shareWithCoaches: true,
      shareWithAthletes: true,
      athleteAudience: "ALL_SPORT",
      sortOrder: 9999,
      updatedById: director.id,
    },
  });

  try {
    const audience = await resolveDrillAudienceAthleteIds(drill);
    assert.ok(
      audience.includes(coachPlayer.id) && audience.includes(sportPlayer.id),
      "all-sport audience should cover every player in the sport",
    );

    const pushed = await pushDrillToSavedAudience({
      drillId: drill.id,
      pushedByUserId: director.id,
    });
    assert.ok(pushed.sent >= 2, "director send should reach the sport roster");

    const delivered = await getSuggestedDrills({
      sport: "Soccer",
      dateOfBirth: sportPlayer.dateOfBirth,
      limit: 3,
      audience: "athletes",
      athleteProfileId: sportPlayer.id,
    });
    const deliveredDrill = delivered.drills.find(
      (item) => item.id === drill.id,
    );
    assert.ok(
      deliveredDrill,
      "a sent drill must reach the player even when the age band differs",
    );
    assert.equal(
      deliveredDrill?.sentByName,
      director.name,
      "player should see who sent the drill",
    );

    const strangerReport = await getSuggestedDrills({
      sport: "Soccer",
      dateOfBirth: sportPlayer.dateOfBirth,
      limit: 3,
      audience: "athletes",
    });
    assert.equal(
      strangerReport.drills.some((item) => item.id === drill.id),
      false,
      "an off-band drill should not leak into generic browsing",
    );

    const coachRoster = await listCoachPushAthletes(coach.id);
    assert.ok(
      coachRoster.some((athlete) => athlete.id === coachPlayer.id),
      "coach should be able to send to their own roster player",
    );

    await pushDrillToAthletes({
      drillId: drill.id,
      athleteProfileIds: [coachPlayer.id],
      pushedByUserId: coach.id,
      source: "COACH",
    });

    const report = await getDrillDeliveryReport(drill.id);
    assert.ok(report, "report should exist");
    const reported = report!.players.find(
      (player) => player.id === coachPlayer.id,
    );
    assert.ok(reported?.directorSentAt, "director send should be recorded");
    assert.equal(
      reported?.coachPushes[0]?.coachName,
      coach.name,
      "coach hand-off should name the coach",
    );
    assert.equal(reported?.viewedAt, null, "nothing opened yet");
    assert.equal(
      report!.totals.playersFromCoaches,
      1,
      "one player received a coach hand-off",
    );
    assert.ok(
      report!.coaches.some(
        (item) => item.id === coach.id && item.sentToPlayers === 1,
      ),
      "coach row should show the hand-off count",
    );

    await markDrillPushesViewed({
      athleteProfileId: coachPlayer.id,
      drillIds: [drill.id],
    });
    const afterView = await getDrillDeliveryReport(drill.id);
    assert.ok(
      afterView!.players.find((player) => player.id === coachPlayer.id)
        ?.viewedAt,
      "opening the drill should be recorded",
    );

    const counts = await getDrillDeliveryCounts([drill]);
    const summary = counts.get(drill.id)!;
    assert.ok(summary.audiencePlayers >= 2);
    assert.ok(summary.sentPlayers >= 2);
    assert.equal(summary.coachSentPlayers, 1);
    assert.equal(summary.viewedPlayers, 1);

    await prisma.catalogDrill.update({
      where: { id: drill.id },
      data: { athleteAudience: "NONE", shareWithAthletes: false },
    });
    const noneAudience = await resolveDrillAudienceAthleteIds({
      ...drill,
      athleteAudience: "NONE",
      shareWithAthletes: false,
    });
    assert.equal(noneAudience.length, 0, "NONE audience should send to nobody");

    console.log("drill delivery checks passed");
  } finally {
    await prisma.catalogDrill.delete({ where: { id: drill.id } });
    await prisma.athleteProfile.deleteMany({
      where: { id: { in: [coachPlayer.id, sportPlayer.id] } },
    });
    await prisma.athlete.delete({ where: { id: rosterAthlete.id } });
    await prisma.user.deleteMany({
      where: { id: { in: [director.id, coach.id] } },
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
