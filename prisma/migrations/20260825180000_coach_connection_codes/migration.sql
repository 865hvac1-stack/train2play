-- AlterTable
ALTER TABLE "User" ADD COLUMN "connectionCode" TEXT;
ALTER TABLE "User" ADD COLUMN "connectionCodeCreatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CoachAthleteConnection" (
    "id" TEXT NOT NULL,
    "coachUserId" TEXT NOT NULL,
    "athleteProfileId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "source" TEXT NOT NULL DEFAULT 'COACH_CODE',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "guardianApprovalRequired" BOOLEAN NOT NULL DEFAULT false,
    "guardianApprovedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachAthleteConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_connectionCode_key" ON "User"("connectionCode");
CREATE INDEX "CoachAthleteConnection_coachUserId_status_idx" ON "CoachAthleteConnection"("coachUserId", "status");
CREATE INDEX "CoachAthleteConnection_athleteProfileId_status_idx" ON "CoachAthleteConnection"("athleteProfileId", "status");
CREATE INDEX "CoachAthleteConnection_coachUserId_athleteProfileId_idx" ON "CoachAthleteConnection"("coachUserId", "athleteProfileId");

-- AddForeignKey
ALTER TABLE "CoachAthleteConnection" ADD CONSTRAINT "CoachAthleteConnection_coachUserId_fkey" FOREIGN KEY ("coachUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CoachAthleteConnection" ADD CONSTRAINT "CoachAthleteConnection_athleteProfileId_fkey" FOREIGN KEY ("athleteProfileId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
