-- Real sends of a suggested drill to one player, by the director or by a coach.
CREATE TABLE "CatalogDrillPush" (
    "id" TEXT NOT NULL,
    "catalogDrillId" TEXT NOT NULL,
    "athleteProfileId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'DIRECTOR',
    "pushedByUserId" TEXT NOT NULL,
    "note" TEXT,
    "firstViewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogDrillPush_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CatalogDrillPush_catalogDrillId_athleteProfileId_pushedByUse_key" ON "CatalogDrillPush"("catalogDrillId", "athleteProfileId", "pushedByUserId");

CREATE INDEX "CatalogDrillPush_catalogDrillId_source_idx" ON "CatalogDrillPush"("catalogDrillId", "source");

CREATE INDEX "CatalogDrillPush_athleteProfileId_idx" ON "CatalogDrillPush"("athleteProfileId");

CREATE INDEX "CatalogDrillPush_pushedByUserId_idx" ON "CatalogDrillPush"("pushedByUserId");

ALTER TABLE "CatalogDrillPush" ADD CONSTRAINT "CatalogDrillPush_catalogDrillId_fkey" FOREIGN KEY ("catalogDrillId") REFERENCES "CatalogDrill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CatalogDrillPush" ADD CONSTRAINT "CatalogDrillPush_athleteProfileId_fkey" FOREIGN KEY ("athleteProfileId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CatalogDrillPush" ADD CONSTRAINT "CatalogDrillPush_pushedByUserId_fkey" FOREIGN KEY ("pushedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
