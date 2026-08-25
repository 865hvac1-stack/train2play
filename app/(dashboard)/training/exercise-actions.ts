"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireCoach } from "@/lib/session";
import { canEditAthlete } from "@/lib/authz";

export type ExerciseActionState = { error?: string };

const exerciseSchema = z.object({
  name: z.string().min(1, "Exercise name is required"),
  instructions: z.string().optional(),
  coachingCue: z.string().optional(),
  videoUrl: z.string().optional(),
  sets: z.coerce.number().int().positive().optional(),
  reps: z.coerce.number().int().positive().optional(),
  durationSec: z.coerce.number().int().positive().optional(),
  restSec: z.coerce.number().int().positive().optional(),
  equipment: z.string().optional(),
  resultRequired: z.coerce.boolean().optional(),
  resultKind: z
    .enum(["NONE", "NUMBER", "RATIO", "COUNT", "TIME", "WEIGHT"])
    .default("NONE"),
  resultUnit: z.string().optional(),
  metricDefinitionId: z.string().optional(),
});

export async function createWorkoutExerciseAction(
  planId: string,
  workoutId: string,
  _prev: ExerciseActionState,
  formData: FormData,
): Promise<ExerciseActionState> {
  const user = await requireCoach();

  const plan = await prisma.trainingPlan.findFirst({
    where: { id: planId, coachId: user.id },
  });
  if (!plan) return { error: "Plan not found" };

  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, trainingPlanId: planId },
  });
  if (!workout) return { error: "Workout not found" };

  const parsed = exerciseSchema.safeParse({
    name: formData.get("name"),
    instructions: formData.get("instructions") || undefined,
    coachingCue: formData.get("coachingCue") || undefined,
    videoUrl: formData.get("videoUrl") || undefined,
    sets: formData.get("sets") || undefined,
    reps: formData.get("reps") || undefined,
    durationSec: formData.get("durationSec") || undefined,
    restSec: formData.get("restSec") || undefined,
    equipment: formData.get("equipment") || undefined,
    resultRequired: formData.get("resultRequired") === "on",
    resultKind: formData.get("resultKind") || "NONE",
    resultUnit: formData.get("resultUnit") || undefined,
    metricDefinitionId: formData.get("metricDefinitionId") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const count = await prisma.workoutExercise.count({ where: { workoutId } });

  await prisma.workoutExercise.create({
    data: {
      workoutId,
      name: parsed.data.name.trim(),
      instructions: parsed.data.instructions?.trim() || null,
      coachingCue: parsed.data.coachingCue?.trim() || null,
      videoUrl: parsed.data.videoUrl?.trim() || null,
      sets: parsed.data.sets ?? null,
      reps: parsed.data.reps ?? null,
      durationSec: parsed.data.durationSec ?? null,
      restSec: parsed.data.restSec ?? null,
      equipment: parsed.data.equipment?.trim() || null,
      resultRequired: parsed.data.resultRequired ?? false,
      resultKind: parsed.data.resultRequired
        ? parsed.data.resultKind
        : "NONE",
      resultUnit: parsed.data.resultUnit?.trim() || null,
      metricDefinitionId: parsed.data.metricDefinitionId || null,
      sortOrder: count,
    },
  });

  revalidatePath(`/training/${planId}`);
  redirect(`/training/${planId}`);
}

export async function deleteWorkoutExerciseAction(
  planId: string,
  exerciseId: string,
) {
  const user = await requireCoach();
  const exercise = await prisma.workoutExercise.findFirst({
    where: {
      id: exerciseId,
      workout: { trainingPlan: { id: planId, coachId: user.id } },
    },
  });
  if (!exercise) throw new Error("Exercise not found");

  await prisma.workoutExercise.delete({ where: { id: exerciseId } });
  revalidatePath(`/training/${planId}`);
}

export async function assignPlanToAthleteAction(
  planId: string,
  formData: FormData,
) {
  const user = await requireCoach();
  const athleteId = String(formData.get("athleteId") ?? "").trim() || null;

  const plan = await prisma.trainingPlan.findFirst({
    where: { id: planId, coachId: user.id },
  });
  if (!plan) throw new Error("Plan not found");

  if (athleteId) {
    const allowed = await canEditAthlete(prisma, user.id, athleteId);
    if (!allowed) throw new Error("Not authorized for that athlete");
  }

  await prisma.trainingPlan.update({
    where: { id: planId },
    data: {
      athleteId,
      ...(athleteId && !plan.startDate ? { startDate: new Date() } : {}),
    },
  });

  // Reset prescription completion flags when reassigning so athlete starts fresh
  if (athleteId && athleteId !== plan.athleteId) {
    await prisma.workout.updateMany({
      where: { trainingPlanId: planId },
      data: { completed: false, completedAt: null },
    });
  }

  revalidatePath(`/training/${planId}`);
  revalidatePath("/training");
  if (athleteId) revalidatePath(`/athletes/${athleteId}`);
  redirect(`/training/${planId}`);
}
