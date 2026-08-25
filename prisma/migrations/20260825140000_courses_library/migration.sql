-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "ageBand" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseItem" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'DRILL',
    "title" TEXT NOT NULL,
    "body" TEXT,
    "focus" TEXT,
    "coachingCue" TEXT,
    "equipment" TEXT,
    "durationMin" INTEGER,
    "ageBand" TEXT,
    "videoUrl" TEXT,
    "videoStorageKey" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Course_coachId_idx" ON "Course"("coachId");

-- CreateIndex
CREATE INDEX "Course_coachId_sport_idx" ON "Course"("coachId", "sport");

-- CreateIndex
CREATE INDEX "CourseItem_courseId_idx" ON "CourseItem"("courseId");

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseItem" ADD CONSTRAINT "CourseItem_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
