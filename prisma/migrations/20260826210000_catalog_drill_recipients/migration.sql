ALTER TABLE "CatalogDrill"
ADD COLUMN "athleteAudience" TEXT NOT NULL DEFAULT 'ALL_SPORT';

CREATE TABLE "CatalogDrillAthleteRecipient" (
    "id" TEXT NOT NULL,
    "catalogDrillId" TEXT NOT NULL,
    "athleteProfileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatalogDrillAthleteRecipient_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CatalogDrillAthleteRecipient_catalogDrillId_athleteProfileId_key"
ON "CatalogDrillAthleteRecipient"("catalogDrillId", "athleteProfileId");

CREATE INDEX "CatalogDrillAthleteRecipient_athleteProfileId_idx"
ON "CatalogDrillAthleteRecipient"("athleteProfileId");

ALTER TABLE "CatalogDrillAthleteRecipient"
ADD CONSTRAINT "CatalogDrillAthleteRecipient_catalogDrillId_fkey"
FOREIGN KEY ("catalogDrillId") REFERENCES "CatalogDrill"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CatalogDrillAthleteRecipient"
ADD CONSTRAINT "CatalogDrillAthleteRecipient_athleteProfileId_fkey"
FOREIGN KEY ("athleteProfileId") REFERENCES "AthleteProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
