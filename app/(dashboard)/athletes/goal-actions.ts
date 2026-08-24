"use server";

import { revalidatePath } from "next/cache";

import { progressGoalSchema } from "@/lib/goals";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

export type GoalActionState = {
  error?: string;
  success?: boolean;
};

async function getOwnedAthlete(athleteId: string, coachId: string) {
  return prisma.athlete.findFirst({
    where: { id: athleteId, coachId },
  });
}

export async function createProgressGoalAction(
  athleteId: string,
  _prevState: GoalActionState,
  formData: FormData,
): Promise<GoalActionState> {
  const user = await requireUser();
  const athlete = await getOwnedAthlete(athleteId, user.id);

  if (!athlete) {
    return { error: "Athlete not found" };
  }

  const parsed = progressGoalSchema.safeParse({
    label: formData.get("label"),
    targetValue: formData.get("targetValue"),
    unit: formData.get("unit"),
    direction: formData.get("direction"),
    dueDate: formData.get("dueDate") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await prisma.progressGoal.create({
    data: {
      athleteId,
      label: parsed.data.label.trim(),
      targetValue: parsed.data.targetValue,
      unit: parsed.data.unit.trim(),
      direction: parsed.data.direction,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
    },
  });

  revalidatePath(`/athletes/${athleteId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteProgressGoalAction(
  athleteId: string,
  goalId: string,
) {
  const user = await requireUser();

  const goal = await prisma.progressGoal.findFirst({
    where: {
      id: goalId,
      athlete: { id: athleteId, coachId: user.id },
    },
  });

  if (!goal) {
    throw new Error("Goal not found");
  }

  await prisma.progressGoal.delete({ where: { id: goalId } });

  revalidatePath(`/athletes/${athleteId}`);
  revalidatePath("/dashboard");
}
