"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { listCatalogDrillsForSport } from "@/lib/catalog-drills";
import { courseItemSchema, courseSchema } from "@/lib/courses";
import { prisma } from "@/lib/db";
import { resolveOptionalInstructionVideo } from "@/lib/instruction-video-upload";
import { isLibraryEditor } from "@/lib/roles";
import { requireCoach } from "@/lib/session";

export type CourseActionState = {
  error?: string;
};

async function findEditableCourse(
  courseId: string,
  user: { id: string; role?: string | null },
) {
  return prisma.course.findFirst({
    where: {
      id: courseId,
      OR: [
        { coachId: user.id },
        ...(isLibraryEditor(user.role) ? [{ origin: "PLATFORM" }] : []),
      ],
    },
  });
}

export async function createCourseAction(
  _prev: CourseActionState,
  formData: FormData,
): Promise<CourseActionState> {
  const user = await requireCoach();

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
  const user = await requireCoach();

  const existing = await findEditableCourse(courseId, user);
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
  revalidatePath("/trainer");
  redirect(`/courses/${courseId}`);
}

export async function deleteCourseAction(courseId: string) {
  const user = await requireCoach();
  const existing = await findEditableCourse(courseId, user);
  if (!existing) throw new Error("Course not found");

  await prisma.course.delete({ where: { id: courseId } });
  revalidatePath("/courses");
  revalidatePath("/library");
  revalidatePath("/trainer");
  redirect(existing.origin === "PLATFORM" ? "/library" : "/courses");
}

export async function createCourseItemAction(
  courseId: string,
  _prev: CourseActionState,
  formData: FormData,
): Promise<CourseActionState> {
  const user = await requireCoach();

  const course = await findEditableCourse(courseId, user);
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

  const video = await resolveOptionalInstructionVideo(formData, {
    surface: "course-drill-create",
    userId: user.id,
  });
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
  revalidatePath("/trainer");
  redirect(`/courses/${courseId}`);
}

export async function updateCourseItemAction(
  courseId: string,
  itemId: string,
  _prev: CourseActionState,
  formData: FormData,
): Promise<CourseActionState> {
  const user = await requireCoach();

  const course = await findEditableCourse(courseId, user);
  if (!course) return { error: "Course not found" };
  const item = await prisma.courseItem.findFirst({
    where: { id: itemId, courseId },
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

  const video = await resolveOptionalInstructionVideo(formData, {
    surface: "course-drill-update",
    userId: user.id,
  });
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
  revalidatePath("/trainer");
  redirect(`/courses/${courseId}`);
}

export async function deleteCourseItemAction(courseId: string, itemId: string) {
  const user = await requireCoach();
  const course = await findEditableCourse(courseId, user);
  if (!course) throw new Error("Course not found");
  const item = await prisma.courseItem.findFirst({
    where: { id: itemId, courseId },
  });
  if (!item) throw new Error("Item not found");

  await prisma.courseItem.delete({ where: { id: itemId } });
  revalidatePath(`/courses/${courseId}`);
  revalidatePath("/courses");
  revalidatePath("/trainer");
}

export async function importStarterDrillsAction(courseId: string) {
  const user = await requireCoach();
  const course = await findEditableCourse(courseId, user);
  if (!course) throw new Error("Course not found");

  const catalog = await listCatalogDrillsForSport(course.sport);
  if (catalog.length === 0) {
    throw new Error("No published suggested drills for this sport yet");
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
      videoUrl: row.drill.videoUrl,
      sortOrder: existingCount + index,
    })),
  });

  revalidatePath(`/courses/${courseId}`);
  revalidatePath("/courses");
  revalidatePath("/trainer");
  redirect(`/courses/${courseId}`);
}
