"use server";

import { revalidatePath } from "next/cache";

import { progressMetricSchema } from "@/lib/progress";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

export type ProgressActionState = {
  error?: string;
  success?: boolean;
};

async function getOwnedAthlete(athleteId: string, coachId: string) {
  return prisma.athlete.findFirst({
    where: { id: athleteId, coachId },
  });
}

export async function createProgressMetricAction(
  athleteId: string,
  _prevState: ProgressActionState,
  formData: FormData,
): Promise<ProgressActionState> {
  const user = await requireUser();
  const athlete = await getOwnedAthlete(athleteId, user.id);

  if (!athlete) {
    return { error: "Athlete not found" };
  }

  const parsed = progressMetricSchema.safeParse({
    label: formData.get("label"),
    value: formData.get("value"),
    unit: formData.get("unit"),
    recordedAt: formData.get("recordedAt") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await prisma.progressMetric.create({
    data: {
      athleteId,
      label: parsed.data.label.trim(),
      value: parsed.data.value,
      unit: parsed.data.unit.trim(),
      recordedAt: parsed.data.recordedAt
        ? new Date(parsed.data.recordedAt)
        : new Date(),
      notes: parsed.data.notes?.trim() || null,
    },
  });

  revalidatePath(`/athletes/${athleteId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteProgressMetricAction(
  athleteId: string,
  metricId: string,
) {
  const user = await requireUser();

  const metric = await prisma.progressMetric.findFirst({
    where: {
      id: metricId,
      athlete: { id: athleteId, coachId: user.id },
    },
  });

  if (!metric) {
    throw new Error("Metric not found");
  }

  await prisma.progressMetric.delete({ where: { id: metricId } });

  revalidatePath(`/athletes/${athleteId}`);
  revalidatePath("/dashboard");
}
