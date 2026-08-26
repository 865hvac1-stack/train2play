"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { courseSchema } from "@/lib/courses";
import { prisma } from "@/lib/db";
import { isPlatformAdmin } from "@/lib/roles";
import { requireCoach, requirePlatformAdmin } from "@/lib/session";
import {
  COURSE_ORIGIN,
  copyPlatformCourseToCoach,
} from "@/lib/sport-library";

export type LibraryActionState = {
  error?: string;
};

export async function createLibraryCourseAction(
  _prev: LibraryActionState,
  formData: FormData,
): Promise<LibraryActionState> {
  const user = await requirePlatformAdmin();
  const parsed = courseSchema.safeParse({
    title: formData.get("title"),
    sport: formData.get("sport"),
    description: formData.get("description") || undefined,
    ageBand: formData.get("ageBand") || undefined,
    published: true,
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
      published: true,
      origin: COURSE_ORIGIN.PLATFORM,
      shareWithCoaches: formData.get("shareWithCoaches") === "on",
      shareWithAthletes: formData.get("shareWithAthletes") === "on",
    },
  });

  revalidatePath("/library");
  revalidatePath("/courses");
  redirect(`/courses/${course.id}`);
}

export async function updateLibrarySharingAction(
  courseId: string,
  _prev: LibraryActionState,
  formData: FormData,
): Promise<LibraryActionState> {
  const user = await requirePlatformAdmin();
  const course = await prisma.course.findFirst({
    where: { id: courseId, origin: COURSE_ORIGIN.PLATFORM },
  });
  if (!course) return { error: "Library course not found" };
  if (course.coachId !== user.id && !isPlatformAdmin(user.role)) {
    return { error: "Library course not found" };
  }

  await prisma.course.update({
    where: { id: courseId },
    data: {
      shareWithCoaches: formData.get("shareWithCoaches") === "on",
      shareWithAthletes: formData.get("shareWithAthletes") === "on",
      published: formData.get("published") === "on" || formData.get("published") === "true" || course.published,
    },
  });

  revalidatePath("/library");
  revalidatePath("/courses");
  revalidatePath(`/courses/${courseId}`);
  return {};
}

export async function addLibraryCourseToMyLibraryAction(courseId: string) {
  const user = await requireCoach();
  const copy = await copyPlatformCourseToCoach({
    sourceCourseId: courseId,
    coachUserId: user.id,
    coachSports: [],
  });
  revalidatePath("/courses");
  revalidatePath("/library");
  redirect(`/courses/${copy.id}`);
}
