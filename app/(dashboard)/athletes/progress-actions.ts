"use server";

import { revalidatePath } from "next/cache";

import { progressMetricSchema } from "@/lib/progress";
import { requireAthleteAccess } from "@/lib/authz";
import { syncMetricEntryForProgressMetric } from "@/lib/metrics/sync";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

export type ProgressActionState = {
  error?: string;
  success?: boolean;
};

async function getAuthorizedAthlete(athleteId: string, userId: string) {
  await requireAthleteAccess(prisma, userId, athleteId, "edit");
  return prisma.athlete.findUnique({ where: { id: athleteId } });
}

export async function createProgressMetricAction(
  athleteId: string,
  _prevState: ProgressActionState,
  formData: FormData,
): Promise<ProgressActionState> {
  const user = await requireUser();
  const athlete = await getAuthorizedAthlete(athleteId, user.id);

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

  const recordedAt = parsed.data.recordedAt
    ? new Date(parsed.data.recordedAt)
    : new Date();

  const metric = await prisma.progressMetric.create({
    data: {
      athleteId,
      label: parsed.data.label.trim(),
      value: parsed.data.value,
      unit: parsed.data.unit.trim(),
      recordedAt,
      notes: parsed.data.notes?.trim() || null,
    },
  });

  await syncMetricEntryForProgressMetric(
    metric.id,
    athleteId,
    user.id,
    metric.label,
    athlete.sport,
    metric.unit,
    metric.value,
    metric.recordedAt,
    metric.notes,
  );

  revalidatePath(`/athletes/${athleteId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteProgressMetricAction(
  athleteId: string,
  metricId: string,
) {
  const user = await requireUser();
  await requireAthleteAccess(prisma, user.id, athleteId, "edit");

  const metric = await prisma.progressMetric.findFirst({
    where: {
      id: metricId,
      athleteId,
    },
  });

  if (!metric) {
    throw new Error("Metric not found");
  }

  await prisma.progressMetric.delete({ where: { id: metricId } });

  revalidatePath(`/athletes/${athleteId}`);
  revalidatePath("/dashboard");
}
