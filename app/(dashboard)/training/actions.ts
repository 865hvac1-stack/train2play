"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { trainingPlanSchema, workoutSchema } from "@/lib/training";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

export type TrainingActionState = {
  error?: string;
};

export async function createTrainingPlanAction(
  _prevState: TrainingActionState,
  formData: FormData,
): Promise<TrainingActionState> {
  const user = await requireUser();

  const parsed = trainingPlanSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    athleteId: formData.get("athleteId") || undefined,
    startDate: formData.get("startDate") || undefined,
    endDate: formData.get("endDate") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  if (parsed.data.athleteId) {
    const athlete = await prisma.athlete.findFirst({
      where: { id: parsed.data.athleteId, coachId: user.id },
    });
    if (!athlete) {
      return { error: "Selected athlete was not found" };
    }
  }

  const plan = await prisma.trainingPlan.create({
    data: {
      coachId: user.id,
      title: parsed.data.title.trim(),
      description: parsed.data.description?.trim() || null,
      athleteId: parsed.data.athleteId || null,
      startDate: parsed.data.startDate
        ? new Date(parsed.data.startDate)
        : null,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/training");
  redirect(`/training/${plan.id}`);
}

export async function createWorkoutAction(
  planId: string,
  _prevState: TrainingActionState,
  formData: FormData,
): Promise<TrainingActionState> {
  const user = await requireUser();

  const plan = await prisma.trainingPlan.findFirst({
    where: { id: planId, coachId: user.id },
  });

  if (!plan) {
    return { error: "Training plan not found" };
  }

  const parsed = workoutSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    scheduledDate: formData.get("scheduledDate") || undefined,
    durationMinutes: formData.get("durationMinutes") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const workoutCount = await prisma.workout.count({
    where: { trainingPlanId: planId },
  });

  await prisma.workout.create({
    data: {
      trainingPlanId: planId,
      title: parsed.data.title.trim(),
      description: parsed.data.description?.trim() || null,
      scheduledDate: parsed.data.scheduledDate
        ? new Date(parsed.data.scheduledDate)
        : null,
      durationMinutes: parsed.data.durationMinutes ?? null,
      sortOrder: workoutCount,
    },
  });

  revalidatePath(`/training/${planId}`);
  revalidatePath("/training");
  revalidatePath("/dashboard");
  redirect(`/training/${planId}`);
}

export async function toggleWorkoutCompleteAction(
  planId: string,
  workoutId: string,
  completed: boolean,
) {
  const user = await requireUser();

  const workout = await prisma.workout.findFirst({
    where: {
      id: workoutId,
      trainingPlan: { id: planId, coachId: user.id },
    },
  });

  if (!workout) {
    throw new Error("Workout not found");
  }

  await prisma.workout.update({
    where: { id: workoutId },
    data: {
      completed,
      completedAt: completed ? new Date() : null,
    },
  });

  revalidatePath(`/training/${planId}`);
  revalidatePath("/training");
  revalidatePath("/dashboard");
}

export async function updatePlanStatusAction(planId: string, status: string) {
  const user = await requireUser();

  const plan = await prisma.trainingPlan.findFirst({
    where: { id: planId, coachId: user.id },
  });

  if (!plan) {
    throw new Error("Training plan not found");
  }

  await prisma.trainingPlan.update({
    where: { id: planId },
    data: { status },
  });

  revalidatePath(`/training/${planId}`);
  revalidatePath("/training");
  revalidatePath("/dashboard");
}

export async function deleteTrainingPlanAction(planId: string) {
  const user = await requireUser();

  const plan = await prisma.trainingPlan.findFirst({
    where: { id: planId, coachId: user.id },
  });

  if (!plan) {
    throw new Error("Training plan not found");
  }

  await prisma.trainingPlan.delete({ where: { id: planId } });

  revalidatePath("/training");
  revalidatePath("/dashboard");
  redirect("/training");
}
