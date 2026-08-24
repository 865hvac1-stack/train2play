-- Phase 1 foundation: multi-tenant org layer, athlete profiles, configurable metrics

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PLATFORM_ADMIN', 'ORG_ADMIN', 'COACH', 'STAFF', 'PARENT', 'ATHLETE');
CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'ADMIN', 'COACH', 'STAFF');
CREATE TYPE "MetricDirection" AS ENUM ('HIGHER_IS_BETTER', 'LOWER_IS_BETTER');
CREATE TYPE "MetricSource" AS ENUM ('SELF_REPORTED', 'COACH_ENTERED', 'TEST_EVENT', 'DEVICE', 'VERIFIED');

-- Alter User.role from TEXT to UserRole enum
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole" USING ("role"::"UserRole");
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'COACH';

-- CreateTable Organization
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "primaryColor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable OrganizationMembership
CREATE TABLE "OrganizationMembership" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL DEFAULT 'COACH',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable Team
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "season" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable AthleteProfile
CREATE TABLE "AthleteProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "graduationYear" INTEGER,
    "avatarUrl" TEXT,
    "primarySport" TEXT,
    "legacyAthleteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable AthleteSport
CREATE TABLE "AthleteSport" (
    "id" TEXT NOT NULL,
    "athleteProfileId" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "position" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AthleteSport_pkey" PRIMARY KEY ("id")
);

-- CreateTable AthleteMembership
CREATE TABLE "AthleteMembership" (
    "id" TEXT NOT NULL,
    "athleteProfileId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "teamId" TEXT,
    "coachUserId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),

    CONSTRAINT "AthleteMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable GuardianLink
CREATE TABLE "GuardianLink" (
    "id" TEXT NOT NULL,
    "guardianUserId" TEXT NOT NULL,
    "athleteProfileId" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "consentGivenAt" TIMESTAMP(3),
    "canViewProgress" BOOLEAN NOT NULL DEFAULT true,
    "canManageAccount" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuardianLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable MetricDefinition
CREATE TABLE "MetricDefinition" (
    "id" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "direction" "MetricDirection" NOT NULL,
    "inputType" TEXT NOT NULL DEFAULT 'number',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetricDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable MetricEntry
CREATE TABLE "MetricEntry" (
    "id" TEXT NOT NULL,
    "athleteProfileId" TEXT NOT NULL,
    "metricDefinitionId" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "MetricSource" NOT NULL DEFAULT 'COACH_ENTERED',
    "verifiedAt" TIMESTAMP(3),
    "enteredByUserId" TEXT,
    "notes" TEXT,
    "legacyMetricId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetricEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "OrganizationMembership_userId_idx" ON "OrganizationMembership"("userId");
CREATE UNIQUE INDEX "OrganizationMembership_organizationId_userId_key" ON "OrganizationMembership"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "Team_organizationId_idx" ON "Team"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "AthleteProfile_userId_key" ON "AthleteProfile"("userId");
CREATE UNIQUE INDEX "AthleteProfile_legacyAthleteId_key" ON "AthleteProfile"("legacyAthleteId");
CREATE INDEX "AthleteProfile_legacyAthleteId_idx" ON "AthleteProfile"("legacyAthleteId");

-- CreateIndex
CREATE UNIQUE INDEX "AthleteSport_athleteProfileId_sport_key" ON "AthleteSport"("athleteProfileId", "sport");

-- CreateIndex
CREATE INDEX "AthleteMembership_athleteProfileId_idx" ON "AthleteMembership"("athleteProfileId");
CREATE INDEX "AthleteMembership_organizationId_idx" ON "AthleteMembership"("organizationId");
CREATE INDEX "AthleteMembership_coachUserId_idx" ON "AthleteMembership"("coachUserId");

-- CreateIndex
CREATE INDEX "GuardianLink_athleteProfileId_idx" ON "GuardianLink"("athleteProfileId");
CREATE UNIQUE INDEX "GuardianLink_guardianUserId_athleteProfileId_key" ON "GuardianLink"("guardianUserId", "athleteProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "MetricDefinition_sport_slug_key" ON "MetricDefinition"("sport", "slug");
CREATE INDEX "MetricDefinition_sport_isActive_idx" ON "MetricDefinition"("sport", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "MetricEntry_legacyMetricId_key" ON "MetricEntry"("legacyMetricId");
CREATE INDEX "MetricEntry_athleteProfileId_idx" ON "MetricEntry"("athleteProfileId");
CREATE INDEX "MetricEntry_metricDefinitionId_idx" ON "MetricEntry"("metricDefinitionId");
CREATE INDEX "MetricEntry_athleteProfileId_recordedAt_idx" ON "MetricEntry"("athleteProfileId", "recordedAt");

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Team" ADD CONSTRAINT "Team_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AthleteProfile" ADD CONSTRAINT "AthleteProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AthleteProfile" ADD CONSTRAINT "AthleteProfile_legacyAthleteId_fkey" FOREIGN KEY ("legacyAthleteId") REFERENCES "Athlete"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AthleteSport" ADD CONSTRAINT "AthleteSport_athleteProfileId_fkey" FOREIGN KEY ("athleteProfileId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AthleteMembership" ADD CONSTRAINT "AthleteMembership_athleteProfileId_fkey" FOREIGN KEY ("athleteProfileId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AthleteMembership" ADD CONSTRAINT "AthleteMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AthleteMembership" ADD CONSTRAINT "AthleteMembership_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AthleteMembership" ADD CONSTRAINT "AthleteMembership_coachUserId_fkey" FOREIGN KEY ("coachUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GuardianLink" ADD CONSTRAINT "GuardianLink_guardianUserId_fkey" FOREIGN KEY ("guardianUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GuardianLink" ADD CONSTRAINT "GuardianLink_athleteProfileId_fkey" FOREIGN KEY ("athleteProfileId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MetricEntry" ADD CONSTRAINT "MetricEntry_athleteProfileId_fkey" FOREIGN KEY ("athleteProfileId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MetricEntry" ADD CONSTRAINT "MetricEntry_metricDefinitionId_fkey" FOREIGN KEY ("metricDefinitionId") REFERENCES "MetricDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MetricEntry" ADD CONSTRAINT "MetricEntry_enteredByUserId_fkey" FOREIGN KEY ("enteredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MetricEntry" ADD CONSTRAINT "MetricEntry_legacyMetricId_fkey" FOREIGN KEY ("legacyMetricId") REFERENCES "ProgressMetric"("id") ON DELETE SET NULL ON UPDATE CASCADE;
