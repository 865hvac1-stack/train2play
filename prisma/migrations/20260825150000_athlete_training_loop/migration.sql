-- CreateTable
CREATE TABLE "WorkoutExercise" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "instructions" TEXT,
    "coachingCue" TEXT,
    "videoUrl" TEXT,
    "sets" INTEGER,
    "reps" INTEGER,
    "durationSec" INTEGER,
    "restSec" INTEGER,
    "equipment" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "resultRequired" BOOLEAN NOT NULL DEFAULT false,
    "resultKind" TEXT NOT NULL DEFAULT 'NONE',
    "resultUnit" TEXT,
    "metricDefinitionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutSession" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "athleteUserId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseResult" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "workoutExerciseId" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT true,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resultKind" TEXT NOT NULL DEFAULT 'NONE',
    "valuePrimary" DOUBLE PRECISION,
    "valueSecondary" DOUBLE PRECISION,
    "valueText" TEXT,
    "unit" TEXT,
    "notes" TEXT,
    "metricEntryId" TEXT,
    "isPersonalRecord" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExerciseResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthleteInvite" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "invitedByUserId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AthleteInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkoutExercise_workoutId_idx" ON "WorkoutExercise"("workoutId");
CREATE INDEX "WorkoutExercise_metricDefinitionId_idx" ON "WorkoutExercise"("metricDefinitionId");
CREATE INDEX "WorkoutSession_workoutId_idx" ON "WorkoutSession"("workoutId");
CREATE INDEX "WorkoutSession_athleteId_idx" ON "WorkoutSession"("athleteId");
CREATE INDEX "WorkoutSession_athleteUserId_idx" ON "WorkoutSession"("athleteUserId");
CREATE INDEX "WorkoutSession_status_idx" ON "WorkoutSession"("status");
CREATE UNIQUE INDEX "ExerciseResult_metricEntryId_key" ON "ExerciseResult"("metricEntryId");
CREATE UNIQUE INDEX "ExerciseResult_sessionId_workoutExerciseId_key" ON "ExerciseResult"("sessionId", "workoutExerciseId");
CREATE INDEX "ExerciseResult_sessionId_idx" ON "ExerciseResult"("sessionId");
CREATE INDEX "ExerciseResult_workoutExerciseId_idx" ON "ExerciseResult"("workoutExerciseId");
CREATE UNIQUE INDEX "AthleteInvite_tokenHash_key" ON "AthleteInvite"("tokenHash");
CREATE INDEX "AthleteInvite_athleteId_idx" ON "AthleteInvite"("athleteId");
CREATE INDEX "AthleteInvite_email_idx" ON "AthleteInvite"("email");
CREATE INDEX "AthleteInvite_invitedByUserId_idx" ON "AthleteInvite"("invitedByUserId");

-- AddForeignKey
ALTER TABLE "WorkoutExercise" ADD CONSTRAINT "WorkoutExercise_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkoutExercise" ADD CONSTRAINT "WorkoutExercise_metricDefinitionId_fkey" FOREIGN KEY ("metricDefinitionId") REFERENCES "MetricDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_athleteUserId_fkey" FOREIGN KEY ("athleteUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExerciseResult" ADD CONSTRAINT "ExerciseResult_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WorkoutSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExerciseResult" ADD CONSTRAINT "ExerciseResult_workoutExerciseId_fkey" FOREIGN KEY ("workoutExerciseId") REFERENCES "WorkoutExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExerciseResult" ADD CONSTRAINT "ExerciseResult_metricEntryId_fkey" FOREIGN KEY ("metricEntryId") REFERENCES "MetricEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AthleteInvite" ADD CONSTRAINT "AthleteInvite_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AthleteInvite" ADD CONSTRAINT "AthleteInvite_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
