"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isValidInstructionVideoUrl } from "@/lib/media-url";
import { trainingPlanSchema, workoutSchema } from "@/lib/training";
import { requireAthleteAccess } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { isProductionRuntime } from "@/lib/env";
import { isObjectStorageConfigured, storeVideoFile } from "@/lib/storage";
import { requireUser } from "@/lib/session";

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

export type TrainingActionState = {
  error?: string;
};

async function resolveInstructionVideo(formData: FormData): Promise<
  | { ok: true; url: string | null; storageKey: string | null }
  | { ok: false; error: string }
> {
  const mode = String(formData.get("instructionVideoMode") ?? "").trim();
  const urlRaw = String(formData.get("instructionVideoUrl") ?? "").trim();
  const file = formData.get("instructionVideoFile");

  if (mode === "url" || (!mode && urlRaw)) {
    if (!urlRaw) {
      return { ok: true, url: null, storageKey: null };
    }
    if (!isValidInstructionVideoUrl(urlRaw)) {
      return {
        ok: false,
        error: "Use a YouTube, Vimeo, or direct MP4/MOV link",
      };
    }
    return { ok: true, url: urlRaw, storageKey: null };
  }

  if (!(file instanceof File) || file.size === 0) {
    return { ok: true, url: null, storageKey: null };
  }

  const nameLower = file.name.toLowerCase();
  const looksLikeVideoExt = /\.(mp4|mov|webm|m4v|mpeg|mpg|avi)$/i.test(nameLower);
  const hasVideoMime =
    file.type.startsWith("video/") ||
    file.type === "application/octet-stream" ||
    file.type === "";

  if (!file.type.startsWith("video/") && !(hasVideoMime && looksLikeVideoExt)) {
    return { ok: false, error: "File must be a video (mp4, mov, webm)" };
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "Video must be 100 MB or smaller" };
  }

  if (isProductionRuntime() && !isObjectStorageConfigured()) {
    return {
      ok: false,
      error:
        "Phone uploads need Cloudinary. Add CLOUDINARY_URL in Railway, or paste a direct MP4 URL instead.",
    };
  }

  try {
    const ext =
      file.name.split(".").pop()?.toLowerCase() ||
      (file.type === "video/quicktime" ? "mov" : "mp4");
    const filename = `${crypto.randomUUID()}.${ext}`;
    const contentType =
      file.type && file.type !== "application/octet-stream"
        ? file.type
        : ext === "mov"
          ? "video/quicktime"
          : ext === "webm"
            ? "video/webm"
            : "video/mp4";
    const buffer = Buffer.from(await file.arrayBuffer());
    const stored = await storeVideoFile(buffer, filename, contentType);
    return {
      ok: true,
      url: stored.videoUrl,
      storageKey: stored.storageKey,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not upload the workout video",
    };
  }
}

function revalidateTraining(planId: string, athleteId?: string | null) {
  revalidatePath(`/training/${planId}`);
  revalidatePath("/training");
  revalidatePath("/dashboard");
  if (athleteId) {
    revalidatePath(`/athletes/${athleteId}`);
  }
}

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
    try {
      await requireAthleteAccess(prisma, user.id, parsed.data.athleteId, "edit");
    } catch {
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

  const video = await resolveInstructionVideo(formData);
  if (!video.ok) {
    return { error: video.error };
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
      instructionVideoUrl: video.url,
      instructionVideoStorageKey: video.storageKey,
    },
  });

  revalidateTraining(planId, plan.athleteId);
  redirect(`/training/${planId}`);
}

export async function attachWorkoutInstructionVideoAction(
  planId: string,
  workoutId: string,
  _prevState: TrainingActionState,
  formData: FormData,
): Promise<TrainingActionState> {
  const user = await requireUser();

  const workout = await prisma.workout.findFirst({
    where: {
      id: workoutId,
      trainingPlan: { id: planId, coachId: user.id },
    },
    include: { trainingPlan: { select: { athleteId: true } } },
  });

  if (!workout) {
    return { error: "Workout not found" };
  }

  const video = await resolveInstructionVideo(formData);
  if (!video.ok) {
    return { error: video.error };
  }

  if (!video.url) {
    return { error: "Choose a video file or paste a URL" };
  }

  await prisma.workout.update({
    where: { id: workoutId },
    data: {
      instructionVideoUrl: video.url,
      instructionVideoStorageKey: video.storageKey,
    },
  });

  revalidateTraining(planId, workout.trainingPlan.athleteId);
  redirect(`/training/${planId}`);
}

export async function removeWorkoutInstructionVideoAction(
  planId: string,
  workoutId: string,
) {
  const user = await requireUser();

  const workout = await prisma.workout.findFirst({
    where: {
      id: workoutId,
      trainingPlan: { id: planId, coachId: user.id },
    },
    include: { trainingPlan: { select: { athleteId: true } } },
  });

  if (!workout) {
    throw new Error("Workout not found");
  }

  await prisma.workout.update({
    where: { id: workoutId },
    data: {
      instructionVideoUrl: null,
      instructionVideoStorageKey: null,
    },
  });

  revalidateTraining(planId, workout.trainingPlan.athleteId);
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

export async function duplicateTrainingPlanAction(
  planId: string,
  formData: FormData,
) {
  const user = await requireUser();

  const plan = await prisma.trainingPlan.findFirst({
    where: { id: planId, coachId: user.id },
    include: {
      workouts: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
    },
  });

  if (!plan) {
    throw new Error("Training plan not found");
  }

  const athleteId = (formData.get("athleteId") as string) || null;

  if (athleteId) {
    try {
      await requireAthleteAccess(prisma, user.id, athleteId, "edit");
    } catch {
      throw new Error("Athlete not found");
    }
  }

  const copy = await prisma.trainingPlan.create({
    data: {
      coachId: user.id,
      athleteId,
      title: `${plan.title} (Copy)`,
      description: plan.description,
      status: "ACTIVE",
      startDate: plan.startDate,
      endDate: plan.endDate,
      workouts: {
        create: plan.workouts.map((workout, index) => ({
          title: workout.title,
          description: workout.description,
          durationMinutes: workout.durationMinutes,
          sortOrder: index,
          instructionVideoUrl: workout.instructionVideoUrl,
          instructionVideoStorageKey: workout.instructionVideoStorageKey,
        })),
      },
    },
  });

  revalidatePath("/training");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  redirect(`/training/${copy.id}`);
}
