import { prisma } from "@/lib/db";

export const COURSE_ORIGIN = {
  COACH: "COACH",
  PLATFORM: "PLATFORM",
} as const;

export async function listPlatformCoursesForSports(options: {
  sports: string[];
  audience: "coaches" | "athletes";
}) {
  const sports = [...new Set(options.sports.filter(Boolean))];
  if (sports.length === 0) return [];

  return prisma.course.findMany({
    where: {
      origin: COURSE_ORIGIN.PLATFORM,
      published: true,
      sport: { in: sports },
      ...(options.audience === "coaches"
        ? { shareWithCoaches: true }
        : { shareWithAthletes: true }),
    },
    include: {
      _count: { select: { items: true } },
    },
    orderBy: [{ sport: "asc" }, { updatedAt: "desc" }],
  });
}

export async function getSharedPlatformCourse(options: {
  courseId: string;
  sports: string[];
  audience: "coaches" | "athletes";
}) {
  const sports = [...new Set(options.sports.filter(Boolean))];
  return prisma.course.findFirst({
    where: {
      id: options.courseId,
      origin: COURSE_ORIGIN.PLATFORM,
      published: true,
      ...(sports.length > 0 ? { sport: { in: sports } } : {}),
      ...(options.audience === "coaches"
        ? { shareWithCoaches: true }
        : { shareWithAthletes: true }),
    },
    include: {
      items: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
    },
  });
}

export async function copyPlatformCourseToCoach(options: {
  sourceCourseId: string;
  coachUserId: string;
  coachSports: string[];
}) {
  const source = await getSharedPlatformCourse({
    courseId: options.sourceCourseId,
    sports: [],
    audience: "coaches",
  });
  if (!source) {
    throw new Error("That course is not published to coaches for your sports.");
  }

  const existing = await prisma.course.findFirst({
    where: {
      coachId: options.coachUserId,
      sourceCourseId: source.id,
    },
  });
  if (existing) return existing;

  return prisma.course.create({
    data: {
      coachId: options.coachUserId,
      sport: source.sport,
      title: source.title,
      description: source.description,
      ageBand: source.ageBand,
      published: true,
      origin: COURSE_ORIGIN.COACH,
      sourceCourseId: source.id,
      items: {
        create: source.items.map((item, index) => ({
          type: item.type,
          title: item.title,
          body: item.body,
          focus: item.focus,
          coachingCue: item.coachingCue,
          equipment: item.equipment,
          durationMin: item.durationMin,
          ageBand: item.ageBand,
          videoUrl: item.videoUrl,
          videoStorageKey: item.videoStorageKey,
          sortOrder: index,
        })),
      },
    },
  });
}
