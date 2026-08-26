import { listCatalogDrills } from "@/lib/catalog-drills";
import { prisma } from "@/lib/db";
import { ageBandFromAge, ageFromDateOfBirth } from "@/lib/drills";

const BASEBALL = "Baseball";

export async function getBaseballProgramHealth() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const athletes = await prisma.athleteProfile.findMany({
    where: {
      OR: [
        {
          sports: {
            some: {
              sport: { equals: BASEBALL, mode: "insensitive" },
            },
          },
        },
        {
          primarySport: { equals: BASEBALL, mode: "insensitive" },
        },
        {
          legacyAthlete: {
            is: {
              sport: { equals: BASEBALL, mode: "insensitive" },
            },
          },
        },
      ],
    },
    include: {
      sports: { orderBy: [{ isPrimary: "desc" }, { sport: "asc" }] },
      legacyAthlete: {
        select: {
          id: true,
          coachId: true,
          dateOfBirth: true,
        },
      },
      coachConnections: {
        where: { status: "APPROVED" },
        select: { coachUserId: true },
      },
      memberships: {
        where: {
          OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
        },
        select: { coachUserId: true },
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const athleteProfileIds = athletes.map((athlete) => athlete.id);
  const legacyAthleteIds = athletes.flatMap((athlete) =>
    athlete.legacyAthlete?.id ? [athlete.legacyAthlete.id] : [],
  );
  const connectedCoachIds = new Set(
    athletes.flatMap((athlete) => [
      ...(athlete.legacyAthlete?.coachId
        ? [athlete.legacyAthlete.coachId]
        : []),
      ...athlete.coachConnections.map((row) => row.coachUserId),
      ...athlete.memberships.flatMap((row) =>
        row.coachUserId ? [row.coachUserId] : [],
      ),
    ]),
  );

  const [courses, progress, workoutSessions, recentVideos, recentCourseVideos, drills] =
    await Promise.all([
      prisma.course.findMany({
        where: {
          origin: "PLATFORM",
          published: true,
          shareWithAthletes: true,
          sport: { equals: BASEBALL, mode: "insensitive" },
        },
        include: {
          items: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
      athleteProfileIds.length > 0
        ? prisma.courseItemProgress.findMany({
            where: {
              athleteProfileId: { in: athleteProfileIds },
              courseItem: {
                course: {
                  origin: "PLATFORM",
                  published: true,
                  shareWithAthletes: true,
                  sport: { equals: BASEBALL, mode: "insensitive" },
                },
              },
            },
            select: {
              athleteProfileId: true,
              courseItemId: true,
              viewedAt: true,
              completedAt: true,
            },
          })
        : Promise.resolve([]),
      legacyAthleteIds.length > 0
        ? prisma.workoutSession.findMany({
            where: {
              athleteId: { in: legacyAthleteIds },
              status: "COMPLETED",
              completedAt: { gte: thirtyDaysAgo },
            },
            select: { athleteId: true },
          })
        : Promise.resolve([]),
      connectedCoachIds.size > 0
        ? prisma.trainingVideo.findMany({
            where: {
              coachId: { in: [...connectedCoachIds] },
              createdAt: { gte: thirtyDaysAgo },
            },
            select: { coachId: true },
          })
        : Promise.resolve([]),
      connectedCoachIds.size > 0
        ? prisma.courseItem.findMany({
            where: {
              videoUrl: { not: null },
              createdAt: { gte: thirtyDaysAgo },
              course: {
                coachId: { in: [...connectedCoachIds] },
                sport: { equals: BASEBALL, mode: "insensitive" },
              },
            },
            select: { course: { select: { coachId: true } } },
          })
        : Promise.resolve([]),
      listCatalogDrills({ sport: BASEBALL }),
    ]);

  const itemToCourse = new Map<string, string>();
  const videoItemIds = new Set<string>();
  for (const course of courses) {
    for (const item of course.items) {
      itemToCourse.set(item.id, course.id);
      if (item.videoUrl) videoItemIds.add(item.id);
    }
  }

  const watchedAthleteIds = new Set(
    progress
      .filter(
        (row) => row.viewedAt && videoItemIds.has(row.courseItemId),
      )
      .map((row) => row.athleteProfileId),
  );
  const completedItems = new Set(
    progress
      .filter((row) => row.completedAt)
      .map((row) => `${row.athleteProfileId}:${row.courseItemId}`),
  );
  const completedCourseAthleteIds = new Set<string>();
  const completedCourseKeys = new Set<string>();

  for (const athleteId of athleteProfileIds) {
    for (const course of courses) {
      if (
        course.items.length > 0 &&
        course.items.every((item) =>
          completedItems.has(`${athleteId}:${item.id}`),
        )
      ) {
        completedCourseAthleteIds.add(athleteId);
        completedCourseKeys.add(`${athleteId}:${course.id}`);
      }
    }
  }

  const activeLegacyAthleteIds = new Set(
    workoutSessions.map((session) => session.athleteId),
  );
  const contributingCoachIds = new Set([
    ...recentVideos.map((video) => video.coachId),
    ...recentCourseVideos.map((item) => item.course.coachId),
  ]);
  const percent = (count: number, total: number) =>
    total > 0 ? Math.round((count / total) * 100) : 0;

  const courseHealth = courses.map((course) => {
    const courseItemIds = new Set(course.items.map((item) => item.id));
    const viewers = new Set(
      progress
        .filter(
          (row) =>
            row.viewedAt &&
            courseItemIds.has(row.courseItemId) &&
            videoItemIds.has(row.courseItemId),
        )
        .map((row) => row.athleteProfileId),
    );
    const completers = athleteProfileIds.filter((athleteId) =>
      completedCourseKeys.has(`${athleteId}:${course.id}`),
    );
    return {
      id: course.id,
      title: course.title,
      itemCount: course.items.length,
      videoCount: course.items.filter((item) => item.videoUrl).length,
      viewerCount: viewers.size,
      viewRate: percent(viewers.size, athletes.length),
      completionCount: completers.length,
      completionRate: percent(completers.length, athletes.length),
    };
  });

  return {
    generatedAt: new Date(),
    totals: {
      athletes: athletes.length,
      coaches: connectedCoachIds.size,
      contributingCoaches: contributingCoachIds.size,
      coachContributionRate: percent(
        contributingCoachIds.size,
        connectedCoachIds.size,
      ),
      videoViewers: watchedAthleteIds.size,
      videoViewRate: percent(watchedAthleteIds.size, athletes.length),
      courseCompleters: completedCourseAthleteIds.size,
      courseCompletionRate: percent(
        completedCourseAthleteIds.size,
        athletes.length,
      ),
      activeAthletes: activeLegacyAthleteIds.size,
      activeAthleteRate: percent(activeLegacyAthleteIds.size, athletes.length),
      completedWorkouts: workoutSessions.length,
      publishedCourses: courses.length,
      publishedVideos: videoItemIds.size,
      suggestedDrills: drills.length,
    },
    courseHealth,
    drills,
    athletes: athletes.map((athlete) => {
      const dateOfBirth =
        athlete.dateOfBirth ?? athlete.legacyAthlete?.dateOfBirth ?? null;
      const sports =
        athlete.sports.length > 0
          ? athlete.sports.map((sport) => ({
              id: sport.id,
              name: sport.sport,
              primary: sport.isPrimary,
            }))
          : [
              {
                id: `fallback-${athlete.id}`,
                name: athlete.primarySport ?? BASEBALL,
                primary: true,
              },
            ];
      return {
        id: athlete.id,
        firstName: athlete.firstName,
        lastName: athlete.lastName,
        ageBand: ageBandFromAge(ageFromDateOfBirth(dateOfBirth)).label,
        sports,
        coachCount: new Set([
          ...(athlete.legacyAthlete?.coachId
            ? [athlete.legacyAthlete.coachId]
            : []),
          ...athlete.coachConnections.map((row) => row.coachUserId),
          ...athlete.memberships.flatMap((row) =>
            row.coachUserId ? [row.coachUserId] : [],
          ),
        ]).size,
        watchedVideo: watchedAthleteIds.has(athlete.id),
        completedCourse: completedCourseAthleteIds.has(athlete.id),
        activeThisMonth: athlete.legacyAthlete?.id
          ? activeLegacyAthleteIds.has(athlete.legacyAthlete.id)
          : false,
      };
    }),
  };
}
