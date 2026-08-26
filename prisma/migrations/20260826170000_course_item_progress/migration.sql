CREATE TABLE "CourseItemProgress" (
    "id" TEXT NOT NULL,
    "athleteProfileId" TEXT NOT NULL,
    "courseItemId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseItemProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CourseItemProgress_athleteProfileId_courseItemId_key"
ON "CourseItemProgress"("athleteProfileId", "courseItemId");

CREATE INDEX "CourseItemProgress_athleteProfileId_completedAt_idx"
ON "CourseItemProgress"("athleteProfileId", "completedAt");

CREATE INDEX "CourseItemProgress_courseItemId_viewedAt_idx"
ON "CourseItemProgress"("courseItemId", "viewedAt");

ALTER TABLE "CourseItemProgress"
ADD CONSTRAINT "CourseItemProgress_athleteProfileId_fkey"
FOREIGN KEY ("athleteProfileId") REFERENCES "AthleteProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CourseItemProgress"
ADD CONSTRAINT "CourseItemProgress_courseItemId_fkey"
FOREIGN KEY ("courseItemId") REFERENCES "CourseItem"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
