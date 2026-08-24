-- CreateTable
CREATE TABLE "TrainingVideo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coachId" TEXT NOT NULL,
    "athleteId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sourceType" TEXT NOT NULL DEFAULT 'URL',
    "videoUrl" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TrainingVideo_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TrainingVideo_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VideoAnnotation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "videoId" TEXT NOT NULL,
    "timestampMs" INTEGER NOT NULL,
    "label" TEXT,
    "note" TEXT,
    "strokes" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VideoAnnotation_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "TrainingVideo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TrainingVideo_coachId_idx" ON "TrainingVideo"("coachId");

-- CreateIndex
CREATE INDEX "TrainingVideo_athleteId_idx" ON "TrainingVideo"("athleteId");

-- CreateIndex
CREATE INDEX "VideoAnnotation_videoId_idx" ON "VideoAnnotation"("videoId");

-- CreateIndex
CREATE INDEX "VideoAnnotation_videoId_timestampMs_idx" ON "VideoAnnotation"("videoId", "timestampMs");
