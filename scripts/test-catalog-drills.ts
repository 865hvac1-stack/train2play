/**
 * Trainer catalog checks. Run: npx tsx scripts/test-catalog-drills.ts
 */
import "dotenv/config";
import assert from "node:assert/strict";

import { createPrismaClient } from "../lib/db";
import {
  getSuggestedDrills,
  getSuggestedDrillsForSports,
  seedCatalogDrillsIfEmpty,
} from "../lib/catalog-drills";

const prisma = createPrismaClient();

async function main() {
  const seeded = await seedCatalogDrillsIfEmpty();
  const count = await prisma.catalogDrill.count();
  assert.ok(count > 0, "catalog should have starter drills");
  const basketball = await getSuggestedDrills({
    sport: "Basketball",
    ageBandId: "11-13",
    limit: 3,
  });
  assert.ok(basketball.drills.length > 0);
  assert.equal(basketball.band.id, "11-13");
  const multiSport = await getSuggestedDrillsForSports({
    sports: ["Baseball", "Basketball"],
    dateOfBirth: new Date("2014-01-01T00:00:00.000Z"),
    athleteProfileId: "test-profile",
  });
  assert.ok(multiSport.drills.some((drill) => drill.sport === "Baseball"));
  assert.ok(multiSport.drills.some((drill) => drill.sport === "Basketball"));
  assert.equal(
    multiSport.drills.length,
    4,
    "athletes should receive two recommendations per selected sport",
  );
  const audienceDrill = await prisma.catalogDrill.create({
    data: {
      sport: "Basketball",
      ageBand: "11-13",
      title: `Audience test ${Date.now()}`,
      focus: "Publishing",
      durationMin: 5,
      equipment: "Ball",
      howTo: "Test audience delivery.",
      coachingCue: "Only selected audiences should see this.",
      shareWithCoaches: false,
      shareWithAthletes: true,
      sortOrder: 9999,
    },
  });
  try {
    const coachSuggestions = await getSuggestedDrills({
      sport: "Basketball",
      ageBandId: "11-13",
      limit: 100,
      audience: "coaches",
    });
    const athleteSuggestions = await getSuggestedDrills({
      sport: "Basketball",
      ageBandId: "11-13",
      limit: 100,
      audience: "athletes",
    });
    assert.equal(
      coachSuggestions.drills.some((drill) => drill.id === audienceDrill.id),
      false,
      "coach-disabled drill must not reach coaches",
    );
    assert.equal(
      athleteSuggestions.drills.some((drill) => drill.id === audienceDrill.id),
      true,
      "athlete-enabled drill should reach players",
    );
  } finally {
    await prisma.catalogDrill.delete({ where: { id: audienceDrill.id } });
  }
  console.log(
    `catalog-drill checks passed (inserted=${seeded.inserted}, total=${count})`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
