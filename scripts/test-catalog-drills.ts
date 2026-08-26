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
  });
  assert.ok(multiSport.drills.some((drill) => drill.sport === "Baseball"));
  assert.ok(multiSport.drills.some((drill) => drill.sport === "Basketball"));
  assert.equal(
    multiSport.drills.length,
    4,
    "athletes should receive two recommendations per selected sport",
  );
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
