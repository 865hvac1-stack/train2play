-- Coach Profile + Find a Coach + approval (extends existing CoachAthleteConnection)

ALTER TABLE "CoachAthleteConnection"
  ADD COLUMN "expiredAt" TIMESTAMP(3),
  ADD COLUMN "athleteNote" TEXT,
  ADD COLUMN "requestedSpecialty" TEXT,
  ADD COLUMN "coachDeclineNote" TEXT;

CREATE TABLE "CoachProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "publicSlug" TEXT,
  "slugUpdatedAt" TIMESTAMP(3),
  "displayName" TEXT,
  "bio" TEXT,
  "avatarUrl" TEXT,
  "coverImageUrl" TEXT,
  "organizationName" TEXT,
  "locationLabel" TEXT,
  "locationCity" TEXT,
  "locationState" TEXT,
  "serviceArea" TEXT,
  "yearsCoaching" INTEGER,
  "experienceText" TEXT,
  "certifications" TEXT,
  "inPersonCoaching" BOOLEAN NOT NULL DEFAULT true,
  "remoteCoaching" BOOLEAN NOT NULL DEFAULT false,
  "acceptingAthletes" BOOLEAN NOT NULL DEFAULT false,
  "appearInFindACoach" BOOLEAN NOT NULL DEFAULT true,
  "maxActiveAthletes" INTEGER,
  "featuredVideoId" TEXT,
  "featuredVideoPublic" BOOLEAN NOT NULL DEFAULT false,
  "websiteUrl" TEXT,
  "websitePublic" BOOLEAN NOT NULL DEFAULT true,
  "instagramHandle" TEXT,
  "instagramUrl" TEXT,
  "instagramPublic" BOOLEAN NOT NULL DEFAULT true,
  "xHandle" TEXT,
  "xUrl" TEXT,
  "xPublic" BOOLEAN NOT NULL DEFAULT true,
  "tiktokHandle" TEXT,
  "tiktokUrl" TEXT,
  "tiktokPublic" BOOLEAN NOT NULL DEFAULT true,
  "youtubeHandle" TEXT,
  "youtubeUrl" TEXT,
  "youtubePublic" BOOLEAN NOT NULL DEFAULT true,
  "discoveryStatus" TEXT NOT NULL DEFAULT 'DRAFT',
  "submittedAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "reviewedByUserId" TEXT,
  "adminNote" TEXT,
  "declineReason" TEXT,
  "requestChangesNote" TEXT,
  "train2playApprovedAt" TIMESTAMP(3),
  "backgroundCheckStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
  "backgroundCheckProvider" TEXT,
  "backgroundCheckRequestedAt" TIMESTAMP(3),
  "backgroundCheckCompletedAt" TIMESTAMP(3),
  "backgroundCheckExpiresAt" TIMESTAMP(3),
  "backgroundCheckReference" TEXT,
  "backgroundCheckAdminNote" TEXT,
  "marketplaceJson" TEXT,
  "reviewsJson" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CoachProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CoachProfile_userId_key" ON "CoachProfile"("userId");
CREATE UNIQUE INDEX "CoachProfile_publicSlug_key" ON "CoachProfile"("publicSlug");
CREATE INDEX "CoachProfile_discoveryStatus_appearInFindACoach_acceptingAthletes_idx"
  ON "CoachProfile"("discoveryStatus", "appearInFindACoach", "acceptingAthletes");
CREATE INDEX "CoachProfile_locationState_idx" ON "CoachProfile"("locationState");
CREATE INDEX "CoachProfile_publicSlug_idx" ON "CoachProfile"("publicSlug");
CREATE INDEX "CoachProfile_reviewedByUserId_idx" ON "CoachProfile"("reviewedByUserId");

CREATE TABLE "CoachProfileSport" (
  "id" TEXT NOT NULL,
  "coachProfileId" TEXT NOT NULL,
  "sport" TEXT NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "positions" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "ageGroups" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CoachProfileSport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CoachProfileSport_coachProfileId_sport_key" ON "CoachProfileSport"("coachProfileId", "sport");
CREATE INDEX "CoachProfileSport_sport_idx" ON "CoachProfileSport"("sport");
CREATE INDEX "CoachProfileSport_coachProfileId_idx" ON "CoachProfileSport"("coachProfileId");
CREATE INDEX "CoachProfileSport_specialties_idx" ON "CoachProfileSport" USING GIN ("specialties");
CREATE INDEX "CoachProfileSport_positions_idx" ON "CoachProfileSport" USING GIN ("positions");
CREATE INDEX "CoachProfileSport_ageGroups_idx" ON "CoachProfileSport" USING GIN ("ageGroups");

CREATE INDEX "CoachAthleteConnection_source_requestedAt_idx"
  ON "CoachAthleteConnection"("source", "requestedAt");
CREATE UNIQUE INDEX "CoachAthleteConnection_active_request_idx"
  ON "CoachAthleteConnection"("coachUserId", "athleteProfileId")
  WHERE status IN ('PENDING', 'PENDING_GUARDIAN', 'PENDING_COACH');

CREATE TABLE "CoachProfileVideo" (
  "id" TEXT NOT NULL,
  "coachProfileId" TEXT NOT NULL,
  "trainingVideoId" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'TRAINING',
  "title" TEXT,
  "publicEligible" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CoachProfileVideo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CoachProfileVideo_coachProfileId_trainingVideoId_key" ON "CoachProfileVideo"("coachProfileId", "trainingVideoId");
CREATE INDEX "CoachProfileVideo_coachProfileId_publicEligible_sortOrder_idx"
  ON "CoachProfileVideo"("coachProfileId", "publicEligible", "sortOrder");

ALTER TABLE "CoachProfile"
  ADD CONSTRAINT "CoachProfile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CoachProfile"
  ADD CONSTRAINT "CoachProfile_featuredVideoId_fkey"
  FOREIGN KEY ("featuredVideoId") REFERENCES "TrainingVideo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CoachProfile"
  ADD CONSTRAINT "CoachProfile_reviewedByUserId_fkey"
  FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CoachProfileSport"
  ADD CONSTRAINT "CoachProfileSport_coachProfileId_fkey"
  FOREIGN KEY ("coachProfileId") REFERENCES "CoachProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CoachProfileVideo"
  ADD CONSTRAINT "CoachProfileVideo_coachProfileId_fkey"
  FOREIGN KEY ("coachProfileId") REFERENCES "CoachProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CoachProfileVideo"
  ADD CONSTRAINT "CoachProfileVideo_trainingVideoId_fkey"
  FOREIGN KEY ("trainingVideoId") REFERENCES "TrainingVideo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
