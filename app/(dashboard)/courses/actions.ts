"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { listCatalogDrillsForSport } from "@/lib/catalog-drills";
import { courseItemSchema, courseSchema } from "@/lib/courses";
import { isValidInstructionVideoUrl } from "@/lib/media-url";
import { prisma } from "@/lib/db";
import { isProductionRuntime } from "@/lib/env";
import { isObjectStorageConfigured, storeVideoFile } from "@/lib/storage";
import { requireUser } from "@/lib/session";

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

export type CourseActionState = {
  error?: string;
};

async function resolveOptionalVideo(formData: FormData): Promise<
  | { ok: true; url: string | null; storageKey: string | null }
  | { ok: false; error: string }
> {
  const mode = String(formData.get("instructionVideoMode") ?? "url").trim();
  const urlRaw = String(
    formData.get("instructionVideoUrl") ?? formData.get("videoUrl") ?? "",
  ).trim();
  const file = formData.get("instructionVideoFile") ?? formData.get("videoFile");

  // Prefer explicit upload mode so an empty URL field never blocks a file.
  if (mode === "upload") {
    if (!(file instanceof File) || file.size === 0) {
      return { ok: true, url: null, storageKey: null };
    }
  } else if (mode === "url" || urlRaw) {
    if (!urlRaw) return { ok: true, url: null, storageKey: null };
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
        "Phone uploads need Cloudinary. Add CLOUDINARY_URL in Railway, or paste a link instead.",
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
    return { ok: true, url: stored.videoUrl, storageKey: stored.storageKey };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Could not upload the video",
    };
  }
}

export async function createCourseAction(
  _prev: CourseActionState,
  formData: FormData,
): Promise<CourseActionState> {
  const user = await requireUser();

  const parsed = courseSchema.safeParse({
    title: formData.get("title"),
    sport: formData.get("sport"),
    description: formData.get("description") || undefined,
    ageBand: formData.get("ageBand") || undefined,
    published: formData.get("published") === "on" || formData.get("published") === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const course = await prisma.course.create({
    data: {
      coachId: user.id,
      title: parsed.data.title.trim(),
      sport: parsed.data.sport.trim(),
      description: parsed.data.description?.trim() || null,
      ageBand: parsed.data.ageBand?.trim() || null,
      published: parsed.data.published ?? true,
    },
  });

  revalidatePath("/courses");
  redirect(`/courses/${course.id}`);
}

export async function updateCourseAction(
  courseId: string,
  _prev: CourseActionState,
  formData: FormData,
): Promise<CourseActionState> {
  const user = await requireUser();

  const existing = await prisma.course.findFirst({
    where: { id: courseId, coachId: user.id },
  });
  if (!existing) return { error: "Course not found" };

  const parsed = courseSchema.safeParse({
    title: formData.get("title"),
    sport: formData.get("sport"),
    description: formData.get("description") || undefined,
    ageBand: formData.get("ageBand") || undefined,
    published: formData.get("published") === "on" || formData.get("published") === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await prisma.course.update({
    where: { id: courseId },
    data: {
      title: parsed.data.title.trim(),
      sport: parsed.data.sport.trim(),
      description: parsed.data.description?.trim() || null,
      ageBand: parsed.data.ageBand?.trim() || null,
      published: parsed.data.published ?? true,
    },
  });

  revalidatePath("/courses");
  revalidatePath(`/courses/${courseId}`);
  redirect(`/courses/${courseId}`);
}

export async function deleteCourseAction(courseId: string) {
  const user = await requireUser();
  const existing = await prisma.course.findFirst({
    where: { id: courseId, coachId: user.id },
  });
  if (!existing) throw new Error("Course not found");

  await prisma.course.delete({ where: { id: courseId } });
  revalidatePath("/courses");
  redirect("/courses");
}

export async function createCourseItemAction(
  courseId: string,
  _prev: CourseActionState,
  formData: FormData,
): Promise<CourseActionState> {
  const user = await requireUser();

  const course = await prisma.course.findFirst({
    where: { id: courseId, coachId: user.id },
  });
  if (!course) return { error: "Course not found" };

  const parsed = courseItemSchema.safeParse({
    type: formData.get("type") || "DRILL",
    title: formData.get("title"),
    body: formData.get("body") || undefined,
    focus: formData.get("focus") || undefined,
    coachingCue: formData.get("coachingCue") || undefined,
    equipment: formData.get("equipment") || undefined,
    durationMin: formData.get("durationMin") || undefined,
    ageBand: formData.get("ageBand") || undefined,
    videoUrl: formData.get("instructionVideoUrl") || formData.get("videoUrl") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const video = await resolveOptionalVideo(formData);
  if (!video.ok) return { error: video.error };

  const count = await prisma.courseItem.count({ where: { courseId } });

  await prisma.courseItem.create({
    data: {
      courseId,
      type: parsed.data.type,
      title: parsed.data.title.trim(),
      body: parsed.data.body?.trim() || null,
      focus: parsed.data.focus?.trim() || null,
      coachingCue: parsed.data.coachingCue?.trim() || null,
      equipment: parsed.data.equipment?.trim() || null,
      durationMin: parsed.data.durationMin ?? null,
      ageBand: parsed.data.ageBand?.trim() || null,
      videoUrl: video.url ?? (parsed.data.videoUrl?.trim() || null),
      videoStorageKey: video.storageKey,
      sortOrder: count,
    },
  });

  revalidatePath(`/courses/${courseId}`);
  revalidatePath("/courses");
  redirect(`/courses/${courseId}`);
}

export async function updateCourseItemAction(
  courseId: string,
  itemId: string,
  _prev: CourseActionState,
  formData: FormData,
): Promise<CourseActionState> {
  const user = await requireUser();

  const item = await prisma.courseItem.findFirst({
    where: {
      id: itemId,
      course: { id: courseId, coachId: user.id },
    },
  });
  if (!item) return { error: "Item not found" };

  const parsed = courseItemSchema.safeParse({
    type: formData.get("type") || item.type,
    title: formData.get("title"),
    body: formData.get("body") || undefined,
    focus: formData.get("focus") || undefined,
    coachingCue: formData.get("coachingCue") || undefined,
    equipment: formData.get("equipment") || undefined,
    durationMin: formData.get("durationMin") || undefined,
    ageBand: formData.get("ageBand") || undefined,
    videoUrl: formData.get("instructionVideoUrl") || formData.get("videoUrl") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const video = await resolveOptionalVideo(formData);
  if (!video.ok) return { error: video.error };

  await prisma.courseItem.update({
    where: { id: itemId },
    data: {
      type: parsed.data.type,
      title: parsed.data.title.trim(),
      body: parsed.data.body?.trim() || null,
      focus: parsed.data.focus?.trim() || null,
      coachingCue: parsed.data.coachingCue?.trim() || null,
      equipment: parsed.data.equipment?.trim() || null,
      durationMin: parsed.data.durationMin ?? null,
      ageBand: parsed.data.ageBand?.trim() || null,
      ...(video.url
        ? {
            videoUrl: video.url,
            videoStorageKey: video.storageKey,
          }
        : parsed.data.videoUrl !== undefined
          ? {
              videoUrl: parsed.data.videoUrl?.trim() || null,
            }
          : {}),
    },
  });

  revalidatePath(`/courses/${courseId}`);
  redirect(`/courses/${courseId}`);
}

export async function deleteCourseItemAction(courseId: string, itemId: string) {
  const user = await requireUser();
  const item = await prisma.courseItem.findFirst({
    where: {
      id: itemId,
      course: { id: courseId, coachId: user.id },
    },
  });
  if (!item) throw new Error("Item not found");

  await prisma.courseItem.delete({ where: { id: itemId } });
  revalidatePath(`/courses/${courseId}`);
  revalidatePath("/courses");
}

export async function importStarterDrillsAction(courseId: string) {
  const user = await requireUser();
  const course = await prisma.course.findFirst({
    where: { id: courseId, coachId: user.id },
  });
  if (!course) throw new Error("Course not found");

  const catalog = await listCatalogDrillsForSport(course.sport);
  if (catalog.length === 0) {
    throw new Error("No starter drills for this sport yet");
  }

  const existingCount = await prisma.courseItem.count({ where: { courseId } });

  await prisma.courseItem.createMany({
    data: catalog.map((row, index) => ({
      courseId,
      type: "DRILL",
      title: row.drill.title,
      body: row.drill.howTo,
      focus: row.drill.focus,
      coachingCue: row.drill.coachingCue,
      equipment: row.drill.equipment,
      durationMin: row.drill.durationMin,
      ageBand: row.ageBandId,
      sortOrder: existingCount + index,
    })),
  });

  revalidatePath(`/courses/${courseId}`);
  revalidatePath("/courses");
  redirect(`/courses/${courseId}`);
}
