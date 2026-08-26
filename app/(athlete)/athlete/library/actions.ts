"use server";

import { revalidatePath } from "next/cache";

import { requireAthleteContext } from "@/lib/athlete-dashboard";
import { prisma } from "@/lib/db";
import { getSharedPlatformCourse } from "@/lib/sport-library";

async function requireAccessibleItem(itemId: string) {
  const ctx = await requireAthleteContext();
  const item = await prisma.courseItem.findUnique({
    where: { id: itemId },
    select: { id: true, courseId: true, videoUrl: true },
  });
  if (!item) throw new Error("Course item not found");

  const course = await getSharedPlatformCourse({
    courseId: item.courseId,
    sports: ctx.sports,
    audience: "athletes",
  });
  if (!course || !course.items.some((row) => row.id === item.id)) {
    throw new Error("Course item not found");
  }

  return { ctx, item };
}

export async function markCourseItemViewedAction(itemId: string) {
  const { ctx, item } = await requireAccessibleItem(itemId);
  if (!item.videoUrl) return;
  const now = new Date();

  await prisma.courseItemProgress.upsert({
    where: {
      athleteProfileId_courseItemId: {
        athleteProfileId: ctx.profileId,
        courseItemId: item.id,
      },
    },
    create: {
      athleteProfileId: ctx.profileId,
      courseItemId: item.id,
      viewedAt: now,
      viewCount: 1,
    },
    update: {
      viewedAt: now,
      viewCount: { increment: 1 },
    },
  });

  revalidatePath("/trainer");
}

export async function setCourseItemCompletedAction(
  itemId: string,
  completed: boolean,
) {
  const { ctx, item } = await requireAccessibleItem(itemId);
  const now = new Date();

  await prisma.courseItemProgress.upsert({
    where: {
      athleteProfileId_courseItemId: {
        athleteProfileId: ctx.profileId,
        courseItemId: item.id,
      },
    },
    create: {
      athleteProfileId: ctx.profileId,
      courseItemId: item.id,
      completedAt: completed ? now : null,
      viewedAt: completed && item.videoUrl ? now : null,
      viewCount: completed && item.videoUrl ? 1 : 0,
    },
    update: {
      completedAt: completed ? now : null,
      ...(completed && item.videoUrl ? { viewedAt: now } : {}),
    },
  });

  revalidatePath(`/athlete/library/${item.courseId}`);
  revalidatePath("/trainer");
}
