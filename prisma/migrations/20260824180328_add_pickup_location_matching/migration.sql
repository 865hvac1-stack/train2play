-- CreateTable
CREATE TABLE "PickupInterest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "interestedCoachId" TEXT NOT NULL,
    "pickupAthleteId" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PickupInterest_interestedCoachId_fkey" FOREIGN KEY ("interestedCoachId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PickupInterest_pickupAthleteId_fkey" FOREIGN KEY ("pickupAthleteId") REFERENCES "Athlete" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
    "zipCode" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "pickupType" TEXT,
    "availabilityNotes" TEXT,
    "listedForPickup" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Athlete_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Athlete" ("bats", "coachId", "createdAt", "dateOfBirth", "firstName", "id", "lastName", "notes", "position", "rosterStatus", "sport", "throws", "updatedAt") SELECT "bats", "coachId", "createdAt", "dateOfBirth", "firstName", "id", "lastName", "notes", "position", "rosterStatus", "sport", "throws", "updatedAt" FROM "Athlete";
DROP TABLE "Athlete";
ALTER TABLE "new_Athlete" RENAME TO "Athlete";
CREATE INDEX "Athlete_coachId_idx" ON "Athlete"("coachId");
CREATE INDEX "Athlete_rosterStatus_listedForPickup_idx" ON "Athlete"("rosterStatus", "listedForPickup");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'COACH',
    "zipCode" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "searchRadiusMiles" INTEGER NOT NULL DEFAULT 25,
    "pickupAlertsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lookingForSport" TEXT,
    "lookingForPositions" TEXT,
    "minThrowingVelo" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "id", "name", "passwordHash", "role", "updatedAt") SELECT "createdAt", "email", "id", "name", "passwordHash", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "PickupInterest_pickupAthleteId_idx" ON "PickupInterest"("pickupAthleteId");

-- CreateIndex
CREATE UNIQUE INDEX "PickupInterest_interestedCoachId_pickupAthleteId_key" ON "PickupInterest"("interestedCoachId", "pickupAthleteId");
