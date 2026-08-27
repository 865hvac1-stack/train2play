/**
 * Trainer catalog checks. Run: npx tsx scripts/test-catalog-drills.ts
 */
import "dotenv/config";
import assert from "node:assert/strict";

import { createPrismaClient } from "../lib/db";
import {
  getCatalogDrillForAthlete,
  getSuggestedDrills,
  listCatalogDrills,
} from "../lib/catalog-drills";

const prisma = createPrismaClient();

async function main() {
  const countBefore = await prisma.catalogDrill.count();
  const unpublishedSport = `Unpublished Test Sport ${Date.now()}`;
  const emptyCatalog = await listCatalogDrills({ sport: unpublishedSport });
  const emptySuggestions = await getSuggestedDrills({
    sport: unpublishedSport,
    ageBandId: "11-13",
    limit: 3,
    audience: "athletes",
    athleteProfileId: "test-profile",
  });
  assert.deepEqual(emptyCatalog, [], "an empty catalog must stay empty");
  assert.deepEqual(
    emptySuggestions.drills,
    [],
    "unpublished sports must not fall back to hidden built-in drills",
  );
  assert.equal(
    await prisma.catalogDrill.count(),
    countBefore,
    "reading suggestions must never auto-seed catalog rows",
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
  const recipientProfileIds: string[] = [];
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

    const selectedAthlete = await prisma.athleteProfile.create({
      data: {
        firstName: "Selected",
        lastName: "Audience Test",
        primarySport: "Basketball",
        sports: { create: { sport: "Basketball", isPrimary: true } },
      },
    });
    const otherAthlete = await prisma.athleteProfile.create({
      data: {
        firstName: "Other",
        lastName: "Audience Test",
        primarySport: "Basketball",
        sports: { create: { sport: "Basketball", isPrimary: true } },
      },
    });
    recipientProfileIds.push(selectedAthlete.id, otherAthlete.id);
    await prisma.catalogDrill.update({
      where: { id: audienceDrill.id },
      data: {
        athleteAudience: "SELECTED",
        athleteRecipients: {
          create: { athleteProfileId: selectedAthlete.id },
        },
      },
    });

    const selectedSuggestions = await getSuggestedDrills({
      sport: "Basketball",
      ageBandId: "11-13",
      limit: 100,
      audience: "athletes",
      athleteProfileId: selectedAthlete.id,
    });
    const otherSuggestions = await getSuggestedDrills({
      sport: "Basketball",
      ageBandId: "11-13",
      limit: 100,
      audience: "athletes",
      athleteProfileId: otherAthlete.id,
    });
    assert.equal(
      selectedSuggestions.drills.some(
        (drill) => drill.id === audienceDrill.id,
      ),
      true,
      "selected player should receive the targeted drill",
    );
    assert.equal(
      otherSuggestions.drills.some((drill) => drill.id === audienceDrill.id),
      false,
      "unselected player must not receive the targeted drill",
    );

    const allowed = await getCatalogDrillForAthlete({
      drillId: audienceDrill.id,
      athleteProfileId: selectedAthlete.id,
      sports: ["Basketball"],
    });
    const blocked = await getCatalogDrillForAthlete({
      drillId: audienceDrill.id,
      athleteProfileId: otherAthlete.id,
      sports: ["Basketball"],
    });
    const wrongSport = await getCatalogDrillForAthlete({
      drillId: audienceDrill.id,
      athleteProfileId: selectedAthlete.id,
      sports: ["Baseball"],
    });
    assert.equal(allowed?.id, audienceDrill.id);
    assert.equal(blocked, null, "unselected players cannot open the drill");
    assert.equal(wrongSport, null, "athletes in another sport cannot open it");
  } finally {
    await prisma.catalogDrill.delete({ where: { id: audienceDrill.id } });
    if (recipientProfileIds.length > 0) {
      await prisma.athleteProfile.deleteMany({
        where: { id: { in: recipientProfileIds } },
      });
    }
  }
  console.log("catalog-drill checks passed (database-only publishing)");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
