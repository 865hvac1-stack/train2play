-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Athlete" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coachId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" DATETIME,
    "sport" TEXT NOT NULL,
    "position" TEXT,
    "notes" TEXT,
    "rosterStatus" TEXT NOT NULL DEFAULT 'ROSTER',
    "throws" TEXT,
    "bats" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Athlete_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Athlete" ("coachId", "createdAt", "dateOfBirth", "firstName", "id", "lastName", "notes", "position", "sport", "updatedAt") SELECT "coachId", "createdAt", "dateOfBirth", "firstName", "id", "lastName", "notes", "position", "sport", "updatedAt" FROM "Athlete";
DROP TABLE "Athlete";
ALTER TABLE "new_Athlete" RENAME TO "Athlete";
CREATE INDEX "Athlete_coachId_idx" ON "Athlete"("coachId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
