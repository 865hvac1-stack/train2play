-- CreateEnum
CREATE TYPE "ProfileVisibility" AS ENUM ('PRIVATE', 'AUTHENTICATED', 'ORGANIZATION', 'PUBLIC');

-- CreateEnum
CREATE TYPE "VerificationType" AS ENUM ('SELF_REPORTED', 'COACH', 'TRAIN2PLAY');

-- CreateEnum
CREATE TYPE "ResultStatus" AS ENUM ('ACTIVE', 'FLAGGED', 'INVALIDATED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "HomepageModuleKind" AS ENUM ('PLAYER_OF_THE_WEEK', 'TOP_PERFORMANCE', 'MOST_IMPROVED', 'TRAINING_LEADER', 'CURRENT_CHALLENGE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ChallengeScoringType" AS ENUM ('WORKOUT_COUNT', 'TRAINING_DAYS', 'PROGRAM_COMPLETION', 'SPECIFIC_WORKOUT', 'SPECIFIC_DRILL', 'PR_ACHIEVEMENT', 'METRIC_IMPROVEMENT');

-- CreateEnum
CREATE TYPE "ChallengeStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RankingType" AS ENUM ('METRIC', 'MOST_IMPROVED', 'TRAINING_DAYS', 'WORKOUTS_COMPLETED', 'PROGRAM_COMPLETION', 'CONSISTENCY');

-- AlterTable AthleteProfile
ALTER TABLE "AthleteProfile"
  ADD COLUMN "displayName" TEXT,
  ADD COLUMN "publicSlug" TEXT,
  ADD COLUMN "bio" TEXT,
  ADD COLUMN "coverImageUrl" TEXT,
  ADD COLUMN "locationState" TEXT,
  ADD COLUMN "instagramHandle" TEXT,
  ADD COLUMN "instagramUrl" TEXT,
  ADD COLUMN "instagramPublic" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "xHandle" TEXT,
  ADD COLUMN "xUrl" TEXT,
  ADD COLUMN "xPublic" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "tiktokHandle" TEXT,
  ADD COLUMN "tiktokUrl" TEXT,
  ADD COLUMN "tiktokPublic" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "youtubeHandle" TEXT,
  ADD COLUMN "youtubeUrl" TEXT,
  ADD COLUMN "youtubePublic" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "profileVisibility" "ProfileVisibility" NOT NULL DEFAULT 'PRIVATE',
  ADD COLUMN "featuredVideoReviewId" TEXT,
  ADD COLUMN "featuredMetricIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "recruitingStatus" TEXT,
  ADD COLUMN "collegeInterest" TEXT,
  ADD COLUMN "academicNotes" TEXT,
  ADD COLUMN "awardsNotes" TEXT,
  ADD COLUMN "contactPreference" TEXT,
  ADD COLUMN "slugUpdatedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "AthleteProfile_publicSlug_key" ON "AthleteProfile"("publicSlug");
CREATE INDEX "AthleteProfile_profileVisibility_idx" ON "AthleteProfile"("profileVisibility");
CREATE INDEX "AthleteProfile_locationState_idx" ON "AthleteProfile"("locationState");
CREATE INDEX "AthleteProfile_primarySport_idx" ON "AthleteProfile"("primarySport");

-- AlterTable AthleteSport
ALTER TABLE "AthleteSport" ADD COLUMN "secondaryPosition" TEXT;

-- AlterTable MetricEntry
ALTER TABLE "MetricEntry"
  ADD COLUMN "verifiedByUserId" TEXT,
  ADD COLUMN "verificationType" "VerificationType" NOT NULL DEFAULT 'SELF_REPORTED',
  ADD COLUMN "resultStatus" "ResultStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "resultSource" TEXT,
  ADD COLUMN "flaggedAt" TIMESTAMP(3),
  ADD COLUMN "flaggedReason" TEXT;

-- Backfill verification from existing MetricSource
UPDATE "MetricEntry"
SET "verificationType" = 'TRAIN2PLAY',
    "verifiedAt" = COALESCE("verifiedAt", "createdAt")
WHERE "source" = 'VERIFIED';

UPDATE "MetricEntry"
SET "verificationType" = 'COACH',
    "verifiedAt" = COALESCE("verifiedAt", "createdAt")
WHERE "source" = 'COACH_ENTERED';

UPDATE "MetricEntry"
SET "verificationType" = 'SELF_REPORTED'
WHERE "source" IN ('SELF_REPORTED', 'DEVICE', 'TEST_EVENT');

ALTER TABLE "MetricEntry"
  ADD CONSTRAINT "MetricEntry_verifiedByUserId_fkey"
  FOREIGN KEY ("verifiedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "MetricEntry_resultStatus_recordedAt_idx" ON "MetricEntry"("resultStatus", "recordedAt");
CREATE INDEX "MetricEntry_verificationType_resultStatus_idx" ON "MetricEntry"("verificationType", "resultStatus");
CREATE INDEX "MetricEntry_metricDefinitionId_resultStatus_recordedAt_idx" ON "MetricEntry"("metricDefinitionId", "resultStatus", "recordedAt");

-- AthleteProfile featured video FK (after VideoReview already exists)
ALTER TABLE "AthleteProfile"
  ADD CONSTRAINT "AthleteProfile_featuredVideoReviewId_fkey"
  FOREIGN KEY ("featuredVideoReviewId") REFERENCES "VideoReview"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable AthleteProfileVideoShowcase
CREATE TABLE "AthleteProfileVideoShowcase" (
    "id" TEXT NOT NULL,
    "athleteProfileId" TEXT NOT NULL,
    "videoReviewId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AthleteProfileVideoShowcase_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AthleteProfileVideoShowcase_athleteProfileId_videoReviewId_key" ON "AthleteProfileVideoShowcase"("athleteProfileId", "videoReviewId");
CREATE INDEX "AthleteProfileVideoShowcase_athleteProfileId_sortOrder_idx" ON "AthleteProfileVideoShowcase"("athleteProfileId", "sortOrder");
CREATE INDEX "AthleteProfileVideoShowcase_videoReviewId_idx" ON "AthleteProfileVideoShowcase"("videoReviewId");

ALTER TABLE "AthleteProfileVideoShowcase"
  ADD CONSTRAINT "AthleteProfileVideoShowcase_athleteProfileId_fkey"
  FOREIGN KEY ("athleteProfileId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AthleteProfileVideoShowcase"
  ADD CONSTRAINT "AthleteProfileVideoShowcase_videoReviewId_fkey"
  FOREIGN KEY ("videoReviewId") REFERENCES "VideoReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable AthleteAchievement
CREATE TABLE "AthleteAchievement" (
    "id" TEXT NOT NULL,
    "athleteProfileId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "occurrenceKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shareable" BOOLEAN NOT NULL DEFAULT true,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AthleteAchievement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AthleteAchievement_athleteProfileId_occurrenceKey_key" ON "AthleteAchievement"("athleteProfileId", "occurrenceKey");
CREATE INDEX "AthleteAchievement_athleteProfileId_earnedAt_idx" ON "AthleteAchievement"("athleteProfileId", "earnedAt");
CREATE INDEX "AthleteAchievement_key_idx" ON "AthleteAchievement"("key");

ALTER TABLE "AthleteAchievement"
  ADD CONSTRAINT "AthleteAchievement_athleteProfileId_fkey"
  FOREIGN KEY ("athleteProfileId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable PlayerOfTheWeek
CREATE TABLE "PlayerOfTheWeek" (
    "id" TEXT NOT NULL,
    "athleteProfileId" TEXT NOT NULL,
    "sport" TEXT,
    "featuredVideoReviewId" TEXT,
    "highlight" TEXT,
    "description" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerOfTheWeek_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlayerOfTheWeek_published_startDate_endDate_idx" ON "PlayerOfTheWeek"("published", "startDate", "endDate");
CREATE INDEX "PlayerOfTheWeek_athleteProfileId_idx" ON "PlayerOfTheWeek"("athleteProfileId");

ALTER TABLE "PlayerOfTheWeek"
  ADD CONSTRAINT "PlayerOfTheWeek_athleteProfileId_fkey"
  FOREIGN KEY ("athleteProfileId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlayerOfTheWeek"
  ADD CONSTRAINT "PlayerOfTheWeek_featuredVideoReviewId_fkey"
  FOREIGN KEY ("featuredVideoReviewId") REFERENCES "VideoReview"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PlayerOfTheWeek"
  ADD CONSTRAINT "PlayerOfTheWeek_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable Challenge
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sport" TEXT,
    "scoringType" "ChallengeScoringType" NOT NULL,
    "targetValue" INTEGER,
    "metricDefinitionId" TEXT,
    "workoutTitle" TEXT,
    "catalogDrillId" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "status" "ChallengeStatus" NOT NULL DEFAULT 'DRAFT',
    "rewardBadgeKey" TEXT NOT NULL DEFAULT 'CHALLENGE_COMPLETE',
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Challenge_status_startAt_endAt_idx" ON "Challenge"("status", "startAt", "endAt");
CREATE INDEX "Challenge_sport_status_idx" ON "Challenge"("sport", "status");

ALTER TABLE "Challenge"
  ADD CONSTRAINT "Challenge_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable ChallengeEntry
CREATE TABLE "ChallengeEntry" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "athleteProfileId" TEXT NOT NULL,
    "progressValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "winner" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChallengeEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ChallengeEntry_challengeId_athleteProfileId_key" ON "ChallengeEntry"("challengeId", "athleteProfileId");
CREATE INDEX "ChallengeEntry_challengeId_progressValue_idx" ON "ChallengeEntry"("challengeId", "progressValue");
CREATE INDEX "ChallengeEntry_athleteProfileId_idx" ON "ChallengeEntry"("athleteProfileId");

ALTER TABLE "ChallengeEntry"
  ADD CONSTRAINT "ChallengeEntry_challengeId_fkey"
  FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChallengeEntry"
  ADD CONSTRAINT "ChallengeEntry_athleteProfileId_fkey"
  FOREIGN KEY ("athleteProfileId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable HomepageWeek
CREATE TABLE "HomepageWeek" (
    "id" TEXT NOT NULL,
    "weekOf" TIMESTAMP(3) NOT NULL,
    "headline" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageWeek_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HomepageWeek_weekOf_key" ON "HomepageWeek"("weekOf");
CREATE INDEX "HomepageWeek_published_weekOf_idx" ON "HomepageWeek"("published", "weekOf");

ALTER TABLE "HomepageWeek"
  ADD CONSTRAINT "HomepageWeek_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable HomepageModule
CREATE TABLE "HomepageModule" (
    "id" TEXT NOT NULL,
    "weekId" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "kind" "HomepageModuleKind" NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "title" TEXT,
    "subtitle" TEXT,
    "body" TEXT,
    "playerOfTheWeekId" TEXT,
    "challengeId" TEXT,
    "metricDefinitionId" TEXT,
    "sport" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageModule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HomepageModule_weekId_slot_key" ON "HomepageModule"("weekId", "slot");
CREATE INDEX "HomepageModule_weekId_published_slot_idx" ON "HomepageModule"("weekId", "published", "slot");

ALTER TABLE "HomepageModule"
  ADD CONSTRAINT "HomepageModule_weekId_fkey"
  FOREIGN KEY ("weekId") REFERENCES "HomepageWeek"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HomepageModule"
  ADD CONSTRAINT "HomepageModule_playerOfTheWeekId_fkey"
  FOREIGN KEY ("playerOfTheWeekId") REFERENCES "PlayerOfTheWeek"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "HomepageModule"
  ADD CONSTRAINT "HomepageModule_challengeId_fkey"
  FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable CompetitionStat
CREATE TABLE "CompetitionStat" (
    "id" TEXT NOT NULL,
    "athleteProfileId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "season" TEXT,
    "statKey" TEXT NOT NULL,
    "statLabel" TEXT NOT NULL,
    "statValue" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompetitionStat_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CompetitionStat_athleteProfileId_season_idx" ON "CompetitionStat"("athleteProfileId", "season");

ALTER TABLE "CompetitionStat"
  ADD CONSTRAINT "CompetitionStat_athleteProfileId_fkey"
  FOREIGN KEY ("athleteProfileId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
