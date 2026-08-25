import { notFound, redirect } from "next/navigation";

import { AthleteWorkoutRunner } from "@/components/athlete-workout-runner";
import { requireAthleteContext } from "@/lib/athlete-dashboard";
import { prisma } from "@/lib/db";
import { assertAthleteOwnsAthleteId } from "@/lib/workout-session";

export default async function AthleteWorkoutSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const ctx = await requireAthleteContext();
  const { sessionId } = await params;

  if (!ctx.athleteId) {
    redirect("/athlete/setup-required");
  }

  const session = await prisma.workoutSession.findUnique({
    where: { id: sessionId },
    include: {
      results: true,
      workout: {
        include: {
          exercises: { orderBy: { sortOrder: "asc" } },
          trainingPlan: { select: { title: true, athleteId: true } },
        },
      },
    },
  });

  if (!session) notFound();

  const owns = await assertAthleteOwnsAthleteId(ctx.userId, session.athleteId);
  if (!owns) notFound();

  if (session.status === "COMPLETED") {
    redirect(`/athlete/workout/${session.id}/complete`);
  }

  return (
    <AthleteWorkoutRunner
      sessionId={session.id}
      workoutTitle={session.workout.title}
      programTitle={session.workout.trainingPlan.title}
      exercises={session.workout.exercises.map((e) => ({
        id: e.id,
        name: e.name,
        instructions: e.instructions,
        coachingCue: e.coachingCue,
        videoUrl: e.videoUrl,
        sets: e.sets,
        reps: e.reps,
        durationSec: e.durationSec,
        restSec: e.restSec,
        equipment: e.equipment,
        resultRequired: e.resultRequired,
        resultKind: e.resultKind,
        resultUnit: e.resultUnit,
        sortOrder: e.sortOrder,
      }))}
      results={session.results.map((r) => ({
        workoutExerciseId: r.workoutExerciseId,
        completed: r.completed,
        isPersonalRecord: r.isPersonalRecord,
        valuePrimary: r.valuePrimary,
        valueSecondary: r.valueSecondary,
      }))}
    />
  );
}
