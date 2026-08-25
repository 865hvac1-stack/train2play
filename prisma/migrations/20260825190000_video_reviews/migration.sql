-- AlterTable
ALTER TABLE "TrainingVideo" ADD COLUMN IF NOT EXISTS "storageKey" TEXT;

-- AlterTable TrainingPlan relation handled via new tables

-- CreateTable
CREATE TABLE "VideoReview" (
    "id" TEXT NOT NULL,
    "trainingVideoId" TEXT NOT NULL,
    "athleteProfileId" TEXT NOT NULL,
    "coachUserId" TEXT NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "athleteNote" TEXT,
    "coachFeedback" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AWAITING_REVIEW',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "aiObservationsJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoReviewTrainingLink" (
    "id" TEXT NOT NULL,
    "videoReviewId" TEXT NOT NULL,
    "trainingPlanId" TEXT NOT NULL,
    "assignmentKind" TEXT NOT NULL DEFAULT 'DRILL',
    "coachNote" TEXT,
    "recommendationSource" TEXT NOT NULL DEFAULT 'COACH',
    "assignedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoReviewTrainingLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "href" TEXT,
    "entityId" TEXT,
    "entityType" TEXT,
    "readAt" TIMESTAMP(3),
    "emailSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideoReview_coachUserId_status_idx" ON "VideoReview"("coachUserId", "status");
CREATE INDEX "VideoReview_athleteProfileId_status_idx" ON "VideoReview"("athleteProfileId", "status");
CREATE INDEX "VideoReview_trainingVideoId_idx" ON "VideoReview"("trainingVideoId");
CREATE INDEX "VideoReview_submittedAt_idx" ON "VideoReview"("submittedAt");
CREATE INDEX "VideoReviewTrainingLink_videoReviewId_idx" ON "VideoReviewTrainingLink"("videoReviewId");
CREATE INDEX "VideoReviewTrainingLink_trainingPlanId_idx" ON "VideoReviewTrainingLink"("trainingPlanId");
CREATE INDEX "AppNotification_userId_readAt_idx" ON "AppNotification"("userId", "readAt");
CREATE INDEX "AppNotification_userId_createdAt_idx" ON "AppNotification"("userId", "createdAt");
CREATE INDEX "AppNotification_type_idx" ON "AppNotification"("type");

-- AddForeignKey
ALTER TABLE "VideoReview" ADD CONSTRAINT "VideoReview_trainingVideoId_fkey" FOREIGN KEY ("trainingVideoId") REFERENCES "TrainingVideo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VideoReview" ADD CONSTRAINT "VideoReview_athleteProfileId_fkey" FOREIGN KEY ("athleteProfileId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VideoReview" ADD CONSTRAINT "VideoReview_coachUserId_fkey" FOREIGN KEY ("coachUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VideoReview" ADD CONSTRAINT "VideoReview_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VideoReviewTrainingLink" ADD CONSTRAINT "VideoReviewTrainingLink_videoReviewId_fkey" FOREIGN KEY ("videoReviewId") REFERENCES "VideoReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VideoReviewTrainingLink" ADD CONSTRAINT "VideoReviewTrainingLink_trainingPlanId_fkey" FOREIGN KEY ("trainingPlanId") REFERENCES "TrainingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VideoReviewTrainingLink" ADD CONSTRAINT "VideoReviewTrainingLink_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppNotification" ADD CONSTRAINT "AppNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
