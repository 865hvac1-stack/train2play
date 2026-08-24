"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { annotationSchema, videoUrlSchema } from "@/lib/videos";
import { prisma } from "@/lib/db";
import { storeVideoFile } from "@/lib/storage";
import { requireUser } from "@/lib/session";

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

export type VideoActionState = {
  error?: string;
};

export async function createVideoFromUrlAction(
  _prevState: VideoActionState,
  formData: FormData,
): Promise<VideoActionState> {
  const user = await requireUser();

  const parsed = videoUrlSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    athleteId: formData.get("athleteId") || undefined,
    videoUrl: formData.get("videoUrl"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  if (parsed.data.athleteId) {
    const athlete = await prisma.athlete.findFirst({
      where: { id: parsed.data.athleteId, coachId: user.id },
    });
    if (!athlete) {
      return { error: "Athlete not found" };
    }
  }

  const video = await prisma.trainingVideo.create({
    data: {
      coachId: user.id,
      athleteId: parsed.data.athleteId || null,
      title: parsed.data.title.trim(),
      description: parsed.data.description?.trim() || null,
      sourceType: "URL",
      videoUrl: parsed.data.videoUrl.trim(),
    },
  });

  revalidatePath("/videos");
  revalidatePath("/dashboard");
  redirect(`/videos/${video.id}`);
}

export async function createVideoFromUploadAction(
  _prevState: VideoActionState,
  formData: FormData,
): Promise<VideoActionState> {
  const user = await requireUser();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const athleteId = String(formData.get("athleteId") ?? "") || null;
  const file = formData.get("file");

  if (!title) {
    return { error: "Title is required" };
  }

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a video file to upload" };
  }

  if (!file.type.startsWith("video/")) {
    return { error: "File must be a video (mp4, webm, mov)" };
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: "Video must be 100 MB or smaller" };
  }

  if (athleteId) {
    const athlete = await prisma.athlete.findFirst({
      where: { id: athleteId, coachId: user.id },
    });
    if (!athlete) {
      return { error: "Athlete not found" };
    }
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
  const filename = `${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const stored = await storeVideoFile(buffer, filename, file.type || "video/mp4");

  const video = await prisma.trainingVideo.create({
    data: {
      coachId: user.id,
      athleteId,
      title,
      description: description || null,
      sourceType: "UPLOAD",
      videoUrl: stored.videoUrl,
    },
  });

  revalidatePath("/videos");
  redirect(`/videos/${video.id}`);
}

export async function saveVideoAnnotationAction(
  videoId: string,
  input: {
    timestampMs: number;
    label?: string;
    note?: string;
    strokes: string;
  },
): Promise<{ error?: string }> {
  const user = await requireUser();

  const video = await prisma.trainingVideo.findFirst({
    where: { id: videoId, coachId: user.id },
  });

  if (!video) {
    return { error: "Video not found" };
  }

  const parsed = annotationSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid annotation" };
  }

  await prisma.videoAnnotation.create({
    data: {
      videoId,
      timestampMs: parsed.data.timestampMs,
      label: parsed.data.label?.trim() || null,
      note: parsed.data.note?.trim() || null,
      strokes: parsed.data.strokes,
    },
  });

  revalidatePath(`/videos/${videoId}`);
  return {};
}

export async function deleteVideoAnnotationAction(
  videoId: string,
  annotationId: string,
) {
  const user = await requireUser();

  const annotation = await prisma.videoAnnotation.findFirst({
    where: {
      id: annotationId,
      videoId,
      video: { coachId: user.id },
    },
  });

  if (!annotation) {
    throw new Error("Annotation not found");
  }

  await prisma.videoAnnotation.delete({ where: { id: annotationId } });
  revalidatePath(`/videos/${videoId}`);
}

export async function deleteTrainingVideoAction(videoId: string) {
  const user = await requireUser();

  const video = await prisma.trainingVideo.findFirst({
    where: { id: videoId, coachId: user.id },
  });

  if (!video) {
    throw new Error("Video not found");
  }

  await prisma.trainingVideo.delete({ where: { id: videoId } });

  revalidatePath("/videos");
  redirect("/videos");
}
