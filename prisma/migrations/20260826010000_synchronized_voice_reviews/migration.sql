-- CreateTable
CREATE TABLE "VoiceReview" (
    "id" TEXT NOT NULL,
    "videoReviewId" TEXT NOT NULL,
    "coachUserId" TEXT NOT NULL,
    "audioStorageKey" TEXT NOT NULL,
    "storageProvider" TEXT NOT NULL,
    "audioMimeType" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "timelineJson" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "transcriptText" TEXT,
    "transcriptStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoiceReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VoiceReview_videoReviewId_key" ON "VoiceReview"("videoReviewId");
CREATE INDEX "VoiceReview_coachUserId_idx" ON "VoiceReview"("coachUserId");
CREATE INDEX "VoiceReview_status_idx" ON "VoiceReview"("status");

-- AddForeignKey
ALTER TABLE "VoiceReview" ADD CONSTRAINT "VoiceReview_videoReviewId_fkey" FOREIGN KEY ("videoReviewId") REFERENCES "VideoReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VoiceReview" ADD CONSTRAINT "VoiceReview_coachUserId_fkey" FOREIGN KEY ("coachUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
