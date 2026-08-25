import { prisma } from "@/lib/db";
import { recordPerformanceMetric, type ResultKind } from "@/lib/personal-records";

export async function assertAthleteOwnsAthleteId(
  athleteUserId: string,
  athleteId: string,
) {
  const profile = await prisma.athleteProfile.findUnique({
    where: { userId: athleteUserId },
    select: { legacyAthleteId: true, id: true },
  });
  if (!profile?.legacyAthleteId || profile.legacyAthleteId !== athleteId) {
    return null;
  }
  return profile;
}

export async function startOrResumeWorkoutSession(options: {
  athleteUserId: string;
  athleteId: string;
  workoutId: string;
}) {
  const profile = await assertAthleteOwnsAthleteId(
    options.athleteUserId,
    options.athleteId,
  );
  if (!profile) {
    throw new Error("Not authorized");
  }

  const workout = await prisma.workout.findFirst({
    where: {
      id: options.workoutId,
      trainingPlan: { athleteId: options.athleteId, status: "ACTIVE" },
    },
    include: {
      exercises: { orderBy: { sortOrder: "asc" } },
      trainingPlan: { select: { id: true, title: true } },
    },
  });

  if (!workout) {
    throw new Error("Workout not found or not assigned to you");
  }

  const existing = await prisma.workoutSession.findFirst({
    where: {
      workoutId: workout.id,
      athleteId: options.athleteId,
      status: { in: ["IN_PROGRESS", "COMPLETED"] },
    },
    orderBy: { startedAt: "desc" },
    include: {
      results: true,
    },
  });

  if (existing?.status === "COMPLETED") {
    return { session: existing, workout, alreadyComplete: true as const };
  }

  if (existing?.status === "IN_PROGRESS") {
    return { session: existing, workout, alreadyComplete: false as const };
  }

  const session = await prisma.workoutSession.create({
    data: {
      workoutId: workout.id,
      athleteId: options.athleteId,
      athleteUserId: options.athleteUserId,
      status: "IN_PROGRESS",
    },
    include: { results: true },
  });

  return { session, workout, alreadyComplete: false as const };
}

export async function completeExerciseInSession(options: {
  athleteUserId: string;
  sessionId: string;
  workoutExerciseId: string;
  resultKind: ResultKind;
  valuePrimary?: number | null;
  valueSecondary?: number | null;
  valueText?: string | null;
  unit?: string | null;
  notes?: string | null;
}) {
  const session = await prisma.workoutSession.findUnique({
    where: { id: options.sessionId },
    include: {
      workout: {
        include: {
          exercises: { orderBy: { sortOrder: "asc" } },
          trainingPlan: { select: { athleteId: true } },
        },
      },
    },
  });

  if (!session || session.status === "COMPLETED") {
    throw new Error("Session not available");
  }

  const profile = await assertAthleteOwnsAthleteId(
    options.athleteUserId,
    session.athleteId,
  );
  if (!profile) {
    throw new Error("Not authorized");
  }

  const exercise = session.workout.exercises.find(
    (e) => e.id === options.workoutExerciseId,
  );
  if (!exercise) {
    throw new Error("Exercise not in this workout");
  }

  if (exercise.resultRequired) {
    if (
      (exercise.resultKind === "NUMBER" ||
        exercise.resultKind === "TIME" ||
        exercise.resultKind === "WEIGHT" ||
        exercise.resultKind === "COUNT") &&
      (options.valuePrimary == null || Number.isNaN(options.valuePrimary))
    ) {
      throw new Error("Enter a result value to complete this exercise");
    }
    if (
      exercise.resultKind === "RATIO" &&
      (options.valuePrimary == null ||
        options.valueSecondary == null ||
        Number.isNaN(options.valuePrimary) ||
        Number.isNaN(options.valueSecondary))
    ) {
      throw new Error("Enter makes and attempts");
    }
  }

  let metricEntryId: string | null = null;
  let isPersonalRecord = false;

  if (
    exercise.metricDefinitionId &&
    options.valuePrimary != null &&
    !Number.isNaN(options.valuePrimary)
  ) {
    const recorded = await recordPerformanceMetric({
      athleteId: session.athleteId,
      athleteProfileId: profile.id,
      metricDefinitionId: exercise.metricDefinitionId,
      value: options.valuePrimary,
      enteredByUserId: options.athleteUserId,
      notes: options.notes,
    });
    metricEntryId = recorded.metricEntryId;
    isPersonalRecord = recorded.isPersonalRecord;
  }

  const result = await prisma.exerciseResult.upsert({
    where: {
      sessionId_workoutExerciseId: {
        sessionId: session.id,
        workoutExerciseId: exercise.id,
      },
    },
    create: {
      sessionId: session.id,
      workoutExerciseId: exercise.id,
      completed: true,
      completedAt: new Date(),
      resultKind: options.resultKind || exercise.resultKind,
      valuePrimary: options.valuePrimary ?? null,
      valueSecondary: options.valueSecondary ?? null,
      valueText: options.valueText ?? null,
      unit: options.unit ?? exercise.resultUnit,
      notes: options.notes ?? null,
      metricEntryId,
      isPersonalRecord,
    },
    update: {
      completed: true,
      completedAt: new Date(),
      resultKind: options.resultKind || exercise.resultKind,
      valuePrimary: options.valuePrimary ?? null,
      valueSecondary: options.valueSecondary ?? null,
      valueText: options.valueText ?? null,
      unit: options.unit ?? exercise.resultUnit,
      notes: options.notes ?? null,
      metricEntryId,
      isPersonalRecord,
    },
  });

  return { result, isPersonalRecord, exercise, session };
}

export async function finishWorkoutSession(options: {
  athleteUserId: string;
  sessionId: string;
}) {
  const session = await prisma.workoutSession.findUnique({
    where: { id: options.sessionId },
    include: {
      results: true,
      workout: {
        include: { exercises: true },
      },
    },
  });

  if (!session) throw new Error("Session not found");

  const profile = await assertAthleteOwnsAthleteId(
    options.athleteUserId,
    session.athleteId,
  );
  if (!profile) throw new Error("Not authorized");

  const required = session.workout.exercises;
  const completedIds = new Set(
    session.results.filter((r) => r.completed).map((r) => r.workoutExerciseId),
  );

  // If no exercises defined, allow finishing the workout as a whole
  if (required.length > 0) {
    const missing = required.filter((e) => !completedIds.has(e.id));
    if (missing.length > 0) {
      throw new Error("Complete all exercises before finishing");
    }
  }

  const durationMinutes = Math.max(
    1,
    Math.round((Date.now() - session.startedAt.getTime()) / 60000),
  );

  const updated = await prisma.workoutSession.update({
    where: { id: session.id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      durationMinutes,
    },
    include: {
      results: { include: { workoutExercise: true } },
      workout: { include: { trainingPlan: true, exercises: true } },
    },
  });

  // Keep legacy Workout.completed in sync for coach list views (1:1 assigned plans)
  await prisma.workout.update({
    where: { id: session.workoutId },
    data: { completed: true, completedAt: new Date() },
  });

  return updated;
}
