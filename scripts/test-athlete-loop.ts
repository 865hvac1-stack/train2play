/**
 * Local E2E of core athlete loop (DB-level, no browser).
 * Run: npx tsx scripts/test-athlete-loop.ts
 */
import "dotenv/config";
import bcrypt from "bcryptjs";

import { createPrismaClient } from "../lib/db";
import {
  completeExerciseInSession,
  finishWorkoutSession,
  startOrResumeWorkoutSession,
} from "../lib/workout-session";

const prisma = createPrismaClient();

async function main() {
  const athleteUser = await prisma.user.findUnique({
    where: { email: "athlete@example.com" },
  });
  if (!athleteUser) throw new Error("Demo athlete user missing — run seed");

  const ok = await bcrypt.compare("password123", athleteUser.passwordHash);
  if (!ok) throw new Error("Demo athlete password mismatch");

  const profile = await prisma.athleteProfile.findUnique({
    where: { userId: athleteUser.id },
  });
  if (!profile?.legacyAthleteId) throw new Error("Athlete profile not linked");

  const plan = await prisma.trainingPlan.findFirst({
    where: {
      athleteId: profile.legacyAthleteId,
      status: "ACTIVE",
      title: { contains: "4-Week Baseball" },
    },
    include: {
      workouts: {
        orderBy: { sortOrder: "asc" },
        include: { exercises: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });
  if (!plan) throw new Error("Sample program missing");

  const workout =
    plan.workouts.find((w) => !w.completed) ?? plan.workouts[0];
  if (!workout) throw new Error("No workout");

  // Reset any prior test session on this workout
  await prisma.workoutSession.deleteMany({
    where: { workoutId: workout.id, athleteId: profile.legacyAthleteId },
  });
  await prisma.workout.update({
    where: { id: workout.id },
    data: { completed: false, completedAt: null },
  });

  const { session } = await startOrResumeWorkoutSession({
    athleteUserId: athleteUser.id,
    athleteId: profile.legacyAthleteId,
    workoutId: workout.id,
  });

  console.log("Started session", session.id, "workout", workout.title);

  for (const ex of workout.exercises) {
    const valuePrimary =
      ex.resultKind === "NUMBER"
        ? 74
        : ex.resultKind === "TIME"
          ? 1.72
          : null;
    const result = await completeExerciseInSession({
      athleteUserId: athleteUser.id,
      sessionId: session.id,
      workoutExerciseId: ex.id,
      resultKind: (ex.resultKind as "NONE" | "NUMBER" | "TIME") || "NONE",
      valuePrimary,
      unit: ex.resultUnit,
    });
    console.log(
      "  completed",
      ex.name,
      result.isPersonalRecord ? "PR!" : "",
      valuePrimary ?? "",
    );
  }

  const finished = await finishWorkoutSession({
    athleteUserId: athleteUser.id,
    sessionId: session.id,
  });

  console.log(
    "Finished",
    finished.status,
    finished.durationMinutes,
    "min",
    finished.results.filter((r) => r.isPersonalRecord).length,
    "PRs",
  );

  const coachView = await prisma.workoutSession.findFirst({
    where: { id: session.id },
    include: {
      results: true,
      workout: true,
      athlete: { select: { firstName: true, coachId: true } },
    },
  });

  const coach = await prisma.user.findUnique({
    where: { email: "coach@example.com" },
  });
  if (coachView?.athlete.coachId !== coach?.id) {
    throw new Error("Coach linkage broken");
  }

  console.log("Coach can see completion for", coachView?.athlete.firstName);
  console.log("CORE LOOP OK");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
