-- AlterTable VideoReview: profile library + showcase visibility + optional metric/achievement links
ALTER TABLE "VideoReview"
  ADD COLUMN "purpose" TEXT NOT NULL DEFAULT 'REVIEW',
  ADD COLUMN "showcaseVisibility" TEXT NOT NULL DEFAULT 'PRIVATE',
  ADD COLUMN "metricEntryId" TEXT,
  ADD COLUMN "achievementId" TEXT;

-- Existing featured/highlight clips stay eligible for the public profile.
UPDATE "VideoReview" AS vr
SET "showcaseVisibility" = 'PUBLIC_PROFILE'
WHERE EXISTS (
  SELECT 1 FROM "AthleteProfile" ap WHERE ap."featuredVideoReviewId" = vr."id"
)
OR EXISTS (
  SELECT 1 FROM "AthleteProfileVideoShowcase" s WHERE s."videoReviewId" = vr."id"
);

CREATE INDEX "VideoReview_purpose_idx" ON "VideoReview"("purpose");
CREATE INDEX "VideoReview_showcaseVisibility_idx" ON "VideoReview"("showcaseVisibility");

ALTER TABLE "VideoReview"
  ADD CONSTRAINT "VideoReview_metricEntryId_fkey"
  FOREIGN KEY ("metricEntryId") REFERENCES "MetricEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VideoReview"
  ADD CONSTRAINT "VideoReview_achievementId_fkey"
  FOREIGN KEY ("achievementId") REFERENCES "AthleteAchievement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable AthleteContentSubmission
CREATE TABLE "AthleteContentSubmission" (
  "id" TEXT NOT NULL,
  "athleteProfileId" TEXT NOT NULL,
  "videoReviewId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "note" TEXT,
  "featurePermission" BOOLEAN NOT NULL DEFAULT false,
  "socialMediaPermission" BOOLEAN NOT NULL DEFAULT false,
  "guardianApproved" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "metricEntryId" TEXT,
  "adminNote" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AthleteContentSubmission_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AthleteContentSubmission_status_createdAt_idx" ON "AthleteContentSubmission"("status", "createdAt");
CREATE INDEX "AthleteContentSubmission_athleteProfileId_idx" ON "AthleteContentSubmission"("athleteProfileId");
CREATE INDEX "AthleteContentSubmission_videoReviewId_idx" ON "AthleteContentSubmission"("videoReviewId");

ALTER TABLE "AthleteContentSubmission"
  ADD CONSTRAINT "AthleteContentSubmission_athleteProfileId_fkey"
  FOREIGN KEY ("athleteProfileId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AthleteContentSubmission"
  ADD CONSTRAINT "AthleteContentSubmission_videoReviewId_fkey"
  FOREIGN KEY ("videoReviewId") REFERENCES "VideoReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AthleteContentSubmission"
  ADD CONSTRAINT "AthleteContentSubmission_metricEntryId_fkey"
  FOREIGN KEY ("metricEntryId") REFERENCES "MetricEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AthleteContentSubmission"
  ADD CONSTRAINT "AthleteContentSubmission_reviewedByUserId_fkey"
  FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
