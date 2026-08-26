-- AlterTable
ALTER TABLE "Course" ADD COLUMN "origin" TEXT NOT NULL DEFAULT 'COACH';
ALTER TABLE "Course" ADD COLUMN "shareWithCoaches" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Course" ADD COLUMN "shareWithAthletes" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Course" ADD COLUMN "sourceCourseId" TEXT;

-- CreateIndex
CREATE INDEX "Course_origin_sport_idx" ON "Course"("origin", "sport");
CREATE INDEX "Course_shareWithCoaches_sport_idx" ON "Course"("shareWithCoaches", "sport");
CREATE INDEX "Course_shareWithAthletes_sport_idx" ON "Course"("shareWithAthletes", "sport");
CREATE INDEX "Course_coachId_sourceCourseId_idx" ON "Course"("coachId", "sourceCourseId");
