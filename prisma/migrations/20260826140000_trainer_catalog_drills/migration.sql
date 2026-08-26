-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'TRAINER';

-- CreateTable
CREATE TABLE IF NOT EXISTS "CatalogDrill" (
    "id" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "ageBand" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "focus" TEXT NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "equipment" TEXT NOT NULL,
    "howTo" TEXT NOT NULL,
    "coachingCue" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogDrill_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CatalogDrill_sport_ageBand_isActive_idx" ON "CatalogDrill"("sport", "ageBand", "isActive");
