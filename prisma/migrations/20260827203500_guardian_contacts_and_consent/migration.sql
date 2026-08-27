ALTER TABLE "AthleteProfile"
ADD COLUMN "publicVideoSharingEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "publicLeaderboardOptIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "privacySettingsUpdatedAt" TIMESTAMP(3);

CREATE TABLE "GuardianContact" (
    "id" TEXT NOT NULL,
    "athleteProfileId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GuardianContact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "athleteProfileId" TEXT NOT NULL,
    "grantedByUserId" TEXT,
    "consentType" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "documentVersion" TEXT NOT NULL,
    "guardianName" TEXT,
    "guardianEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GuardianContact_athleteProfileId_idx"
ON "GuardianContact"("athleteProfileId");
CREATE INDEX "GuardianContact_email_idx" ON "GuardianContact"("email");
CREATE INDEX "ConsentRecord_athleteProfileId_consentType_createdAt_idx"
ON "ConsentRecord"("athleteProfileId", "consentType", "createdAt");
CREATE INDEX "ConsentRecord_grantedByUserId_idx"
ON "ConsentRecord"("grantedByUserId");

ALTER TABLE "GuardianContact"
ADD CONSTRAINT "GuardianContact_athleteProfileId_fkey"
FOREIGN KEY ("athleteProfileId") REFERENCES "AthleteProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConsentRecord"
ADD CONSTRAINT "ConsentRecord_athleteProfileId_fkey"
FOREIGN KEY ("athleteProfileId") REFERENCES "AthleteProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConsentRecord"
ADD CONSTRAINT "ConsentRecord_grantedByUserId_fkey"
FOREIGN KEY ("grantedByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
