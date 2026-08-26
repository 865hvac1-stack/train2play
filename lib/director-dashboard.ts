import { listCatalogDrills } from "@/lib/catalog-drills";
import { prisma } from "@/lib/db";
import { ageBandFromAge, ageFromDateOfBirth } from "@/lib/drills";

export async function getSportProgramHealth(sport: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const athletes = await prisma.athleteProfile.findMany({
    where: {
      OR: [
        {
          sports: {
            some: {
              sport: { equals: sport, mode: "insensitive" },
            },
          },
        },
        {
          primarySport: { equals: sport, mode: "insensitive" },
        },
        {
          legacyAthlete: {
            is: {
              sport: { equals: sport, mode: "insensitive" },
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
  const relatedUserIds = new Set(
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
  const coachUsers =
    relatedUserIds.size > 0
      ? await prisma.user.findMany({
          where: {
            id: { in: [...relatedUserIds] },
            role: { in: ["COACH", "STAFF", "ORG_ADMIN"] },
          },
          select: { id: true, name: true },
        })
      : [];
  const connectedCoachIds = new Set(coachUsers.map((coach) => coach.id));

  const [
    courses,
    progress,
    workoutSessions,
    recentVideos,
    recentCourseVideos,
    recentTrainingPlans,
    allTrainingPlans,
    waitingVideoReviews,
    drills,
  ] =
    await Promise.all([
      prisma.course.findMany({
        where: {
          origin: "PLATFORM",
          published: true,
          shareWithAthletes: true,
          sport: { equals: sport, mode: "insensitive" },
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
                  sport: { equals: sport, mode: "insensitive" },
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
            select: { athleteId: true, completedAt: true },
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
                sport: { equals: sport, mode: "insensitive" },
              },
            },
            select: { course: { select: { coachId: true } } },
          })
        : Promise.resolve([]),
      connectedCoachIds.size > 0
        ? prisma.trainingPlan.findMany({
            where: {
              coachId: { in: [...connectedCoachIds] },
              createdAt: { gte: thirtyDaysAgo },
            },
            select: { coachId: true },
            distinct: ["coachId"],
          })
        : Promise.resolve([]),
      connectedCoachIds.size > 0
        ? prisma.trainingPlan.findMany({
            where: { coachId: { in: [...connectedCoachIds] } },
            select: { coachId: true, createdAt: true },
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve([]),
      prisma.videoReview.findMany({
        where: {
          sport: { equals: sport, mode: "insensitive" },
          status: "AWAITING_REVIEW",
        },
        select: {
          id: true,
          title: true,
          category: true,
          submittedAt: true,
          athleteProfile: {
            select: { firstName: true, lastName: true },
          },
          coachUser: { select: { name: true } },
        },
        orderBy: { submittedAt: "asc" },
      }),
      listCatalogDrills({ sport }),
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
  const incompleteCourseAthleteIds = new Set<string>();
  const startedCourseAthleteIds = new Set(
    progress.map((row) => row.athleteProfileId),
  );

  for (const athleteId of athleteProfileIds) {
    for (const course of courses) {
      const started = course.items.some((item) =>
        progress.some(
          (row) =>
            row.athleteProfileId === athleteId &&
            row.courseItemId === item.id &&
            (row.viewedAt || row.completedAt),
        ),
      );
      const completed =
        course.items.length > 0 &&
        course.items.every((item) =>
          completedItems.has(`${athleteId}:${item.id}`),
        );
      if (completed) {
        completedCourseAthleteIds.add(athleteId);
        completedCourseKeys.add(`${athleteId}:${course.id}`);
      } else if (started) {
        incompleteCourseAthleteIds.add(athleteId);
      }
    }
  }

  const activeLegacyAthleteIds = new Set(
    workoutSessions.map((session) => session.athleteId),
  );
  const recentlyTrainingLegacyAthleteIds = new Set(
    workoutSessions
      .filter(
        (session) =>
          session.completedAt && session.completedAt >= fourteenDaysAgo,
      )
      .map((session) => session.athleteId),
  );
  const contributingCoachIds = new Set([
    ...recentVideos.map((video) => video.coachId),
    ...recentCourseVideos.map((item) => item.course.coachId),
  ]);
  const percent = (count: number, total: number) =>
    total > 0 ? Math.round((count / total) * 100) : 0;
  const recentlyAssigningCoachIds = new Set(
    recentTrainingPlans.map((plan) => plan.coachId),
  );
  const lastAssignmentByCoach = new Map<string, Date>();
  for (const plan of allTrainingPlans) {
    if (!lastAssignmentByCoach.has(plan.coachId)) {
      lastAssignmentByCoach.set(plan.coachId, plan.createdAt);
    }
  }
  const inactiveCoaches = coachUsers
    .filter((coach) => !recentlyAssigningCoachIds.has(coach.id))
    .map((coach) => ({
      id: coach.id,
      name: coach.name,
      lastAssignedAt: lastAssignmentByCoach.get(coach.id) ?? null,
    }));

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

  const athleteRows = athletes.map((athlete) => {
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
              name: athlete.primarySport ?? sport,
              primary: true,
            },
          ];
    const coachCount = new Set(
      [
        ...(athlete.legacyAthlete?.coachId
          ? [athlete.legacyAthlete.coachId]
          : []),
        ...athlete.coachConnections.map((row) => row.coachUserId),
        ...athlete.memberships.flatMap((row) =>
          row.coachUserId ? [row.coachUserId] : [],
        ),
      ].filter((coachId) => connectedCoachIds.has(coachId)),
    ).size;
    const needsTraining =
      athlete.createdAt <= fourteenDaysAgo &&
      (!athlete.legacyAthlete?.id ||
        !recentlyTrainingLegacyAthleteIds.has(athlete.legacyAthlete.id));
    return {
      id: athlete.id,
      firstName: athlete.firstName,
      lastName: athlete.lastName,
      ageBand: ageBandFromAge(ageFromDateOfBirth(dateOfBirth)).label,
      sports,
      coachCount,
      needsTraining,
      watchedVideo: watchedAthleteIds.has(athlete.id),
      startedCourse: startedCourseAthleteIds.has(athlete.id),
      incompleteCourse: incompleteCourseAthleteIds.has(athlete.id),
      completedCourse: completedCourseAthleteIds.has(athlete.id),
      activeThisMonth: athlete.legacyAthlete?.id
        ? activeLegacyAthleteIds.has(athlete.legacyAthlete.id)
        : false,
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
    attention: {
      athletesNotTraining: athleteRows.filter((athlete) => athlete.needsTraining)
        .length,
      athletesWithoutCoaches: athleteRows.filter(
        (athlete) => athlete.coachCount === 0,
      ).length,
      waitingVideoReviews: waitingVideoReviews.length,
      inactiveCoaches: inactiveCoaches.length,
      incompleteCourses: incompleteCourseAthleteIds.size,
    },
    waitingVideoReviews,
    inactiveCoaches,
    courseHealth,
    drills,
    athletes: athleteRows,
  };
}
