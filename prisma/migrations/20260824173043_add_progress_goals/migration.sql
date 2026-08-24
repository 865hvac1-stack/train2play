-- CreateTable
CREATE TABLE "ProgressGoal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "athleteId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "targetValue" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'HIGHER',
    "dueDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProgressGoal_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ProgressGoal_athleteId_idx" ON "ProgressGoal"("athleteId");
