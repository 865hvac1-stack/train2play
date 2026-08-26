-- AlterTable
ALTER TABLE "MetricDefinition" ADD COLUMN     "isSensitive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "leaderboardEligible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publicLeaderboardEligible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "verificationRequirement" TEXT NOT NULL DEFAULT 'NONE';

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "deactivatedAt" TIMESTAMP(3),
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deactivatedAt" TIMESTAMP(3),
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastActiveAt" TIMESTAMP(3),
ADD COLUMN     "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "PlatformSport" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSport_pkey" PRIMARY KEY ("id")
);

-- Seed the sports Train2Play already supports. Adding future sports is now data,
-- not an application rewrite.
INSERT INTO "PlatformSport" ("id", "name", "slug", "sortOrder", "updatedAt") VALUES
  ('sport_baseball', 'Baseball', 'baseball', 0, CURRENT_TIMESTAMP),
  ('sport_basketball', 'Basketball', 'basketball', 1, CURRENT_TIMESTAMP),
  ('sport_football', 'Football', 'football', 2, CURRENT_TIMESTAMP),
  ('sport_soccer', 'Soccer', 'soccer', 3, CURRENT_TIMESTAMP),
  ('sport_softball', 'Softball', 'softball', 4, CURRENT_TIMESTAMP),
  ('sport_track_field', 'Track & Field', 'track-field', 5, CURRENT_TIMESTAMP),
  ('sport_volleyball', 'Volleyball', 'volleyball', 6, CURRENT_TIMESTAMP),
  ('sport_wrestling', 'Wrestling', 'wrestling', 7, CURRENT_TIMESTAMP);

-- CreateTable
CREATE TABLE "DirectorSportAssignment" (
    "id" TEXT NOT NULL,
    "directorUserId" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "organizationId" TEXT,
    "assignedById" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectorSportAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformSport_name_key" ON "PlatformSport"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformSport_slug_key" ON "PlatformSport"("slug");

-- CreateIndex
CREATE INDEX "PlatformSport_isActive_sortOrder_idx" ON "PlatformSport"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "DirectorSportAssignment_directorUserId_isActive_idx" ON "DirectorSportAssignment"("directorUserId", "isActive");

-- CreateIndex
CREATE INDEX "DirectorSportAssignment_sportId_isActive_idx" ON "DirectorSportAssignment"("sportId", "isActive");

-- CreateIndex
CREATE INDEX "DirectorSportAssignment_organizationId_isActive_idx" ON "DirectorSportAssignment"("organizationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "DirectorSportAssignment_directorUserId_sportId_organization_key" ON "DirectorSportAssignment"("directorUserId", "sportId", "organizationId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_actorUserId_createdAt_idx" ON "AdminAuditLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_entityType_entityId_idx" ON "AdminAuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_action_idx" ON "AdminAuditLog"("action");

-- CreateIndex
CREATE INDEX "Organization_isActive_idx" ON "Organization"("isActive");

-- CreateIndex
CREATE INDEX "User_role_isActive_idx" ON "User"("role", "isActive");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "User_lastActiveAt_idx" ON "User"("lastActiveAt");

-- AddForeignKey
ALTER TABLE "DirectorSportAssignment" ADD CONSTRAINT "DirectorSportAssignment_directorUserId_fkey" FOREIGN KEY ("directorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectorSportAssignment" ADD CONSTRAINT "DirectorSportAssignment_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "PlatformSport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectorSportAssignment" ADD CONSTRAINT "DirectorSportAssignment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectorSportAssignment" ADD CONSTRAINT "DirectorSportAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
