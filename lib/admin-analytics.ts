import { prisma } from "@/lib/db";

export const ADMIN_RANGES = ["7d", "30d", "90d", "year", "all"] as const;
export type AdminRange = (typeof ADMIN_RANGES)[number];

export function normalizeAdminRange(value?: string): AdminRange {
  return ADMIN_RANGES.includes(value as AdminRange)
    ? (value as AdminRange)
    : "30d";
}

export function rangeStart(range: AdminRange, now = new Date()) {
  if (range === "all") return null;
  const start = new Date(now);
  if (range === "year") {
    start.setUTCMonth(0, 1);
    start.setUTCHours(0, 0, 0, 0);
    return start;
  }
  start.setUTCDate(
    start.getUTCDate() - (range === "7d" ? 7 : range === "90d" ? 90 : 30),
  );
  return start;
}

function dateWhere(start: Date | null, field = "createdAt") {
  return start ? { [field]: { gte: start } } : {};
}

function percent(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

export type AdminActivityType =
  | "ATHLETES"
  | "COACHES"
  | "DIRECTORS"
  | "TRAINING"
  | "VIDEOS"
  | "PROGRESS"
  | "ORGANIZATIONS";

export type AdminActivityItem = {
  id: string;
  type: AdminActivityType;
  title: string;
  detail: string;
  at: Date;
  href: string;
};

function athleteMeaningfulActivityWhere(start: Date) {
  return {
    OR: [
      {
        legacyAthlete: {
          is: {
            workoutSessions: {
              some: { status: "COMPLETED", completedAt: { gte: start } },
            },
          },
        },
      },
      { metricEntries: { some: { recordedAt: { gte: start } } } },
      { courseItemProgress: { some: { updatedAt: { gte: start } } } },
      { videoReviews: { some: { submittedAt: { gte: start } } } },
    ],
  };
}

export async function getPlatformCommandCenter(range: AdminRange) {
  const now = new Date();
  const start = rangeStart(range, now);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 3600000);

  const [
    totalAthletes,
    athletesThisMonth,
    totalCoaches,
    coachesThisMonth,
    totalDirectors,
    directorsThisMonth,
    totalOrganizations,
    organizationsThisMonth,
    activeAthletes,
    workoutsCompleted,
    videosUploaded,
    videosReviewed,
    personalRecords,
    registered,
    connected,
    assigned,
    firstWorkout,
    progressRecorded,
    pendingReviews,
    organizations,
    platformSports,
  ] = await Promise.all([
    prisma.athleteProfile.count(),
    prisma.athleteProfile.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.user.count({
      where: { role: { in: ["COACH", "STAFF", "ORG_ADMIN"] }, isActive: true },
    }),
    prisma.user.count({
      where: {
        role: { in: ["COACH", "STAFF", "ORG_ADMIN"] },
        isActive: true,
        createdAt: { gte: monthStart },
      },
    }),
    prisma.user.count({ where: { role: "TRAINER", isActive: true } }),
    prisma.user.count({
      where: {
        role: "TRAINER",
        isActive: true,
        createdAt: { gte: monthStart },
      },
    }),
    prisma.organization.count({ where: { isActive: true } }),
    prisma.organization.count({
      where: { isActive: true, createdAt: { gte: monthStart } },
    }),
    prisma.athleteProfile.count({
      where: athleteMeaningfulActivityWhere(thirtyDaysAgo),
    }),
    prisma.workoutSession.count({
      where: {
        status: "COMPLETED",
        ...(start ? { completedAt: { gte: start } } : {}),
      },
    }),
    prisma.trainingVideo.count({ where: dateWhere(start) }),
    prisma.videoReview.count({
      where: {
        status: "REVIEWED",
        ...(start ? { reviewedAt: { gte: start } } : {}),
      },
    }),
    prisma.exerciseResult.count({
      where: {
        isPersonalRecord: true,
        ...(start ? { completedAt: { gte: start } } : {}),
      },
    }),
    prisma.athleteProfile.count(),
    prisma.athleteProfile.count({
      where: {
        OR: [
          { coachConnections: { some: { status: "APPROVED" } } },
          { memberships: { some: { coachUserId: { not: null } } } },
          { legacyAthlete: { is: { coachId: { not: "" } } } },
        ],
      },
    }),
    prisma.athleteProfile.count({
      where: {
        legacyAthlete: {
          is: { trainingPlans: { some: { status: "ACTIVE" } } },
        },
      },
    }),
    prisma.athleteProfile.count({
      where: {
        legacyAthlete: {
          is: {
            workoutSessions: {
              some: { status: "COMPLETED", completedAt: { not: null } },
            },
          },
        },
      },
    }),
    prisma.athleteProfile.count({
      where: {
        OR: [
          { metricEntries: { some: {} } },
          {
            legacyAthlete: {
              is: { progressMetrics: { some: {} } },
            },
          },
        ],
      },
    }),
    prisma.videoReview.count({
      where: {
        status: { in: ["AWAITING_REVIEW", "IN_REVIEW"] },
        submittedAt: { lte: fortyEightHoursAgo },
      },
    }),
    prisma.organization.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        athleteMemberships: {
          where: { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
          select: {
            athleteProfileId: true,
            coachUserId: true,
            athleteProfile: {
              select: {
                legacyAthlete: {
                  select: {
                    workoutSessions: {
                      where: {
                        status: "COMPLETED",
                        completedAt: { gte: thirtyDaysAgo },
                      },
                      select: { id: true },
                    },
                  },
                },
              },
            },
          },
        },
        memberships: {
          where: { user: { isActive: true } },
          select: { userId: true, user: { select: { role: true } } },
        },
        teams: { select: { sport: true } },
      },
      take: 8,
      orderBy: { name: "asc" },
    }),
    prisma.platformSport.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  const [unconnected, noTraining, newNotActivated, inactiveCoaches] =
    await Promise.all([
      prisma.athleteProfile.count({
        where: {
          AND: [
            { NOT: { coachConnections: { some: { status: "APPROVED" } } } },
            { NOT: { memberships: { some: { coachUserId: { not: null } } } } },
            { legacyAthlete: { is: null } },
          ],
        },
      }),
      prisma.athleteProfile.count({
        where: {
          AND: [
            {
              OR: [
                { coachConnections: { some: { status: "APPROVED" } } },
                { memberships: { some: { coachUserId: { not: null } } } },
                { legacyAthlete: { isNot: null } },
              ],
            },
            {
              OR: [
                { legacyAthlete: { is: null } },
                {
                  legacyAthlete: {
                    is: { trainingPlans: { none: { status: "ACTIVE" } } },
                  },
                },
              ],
            },
          ],
        },
      }),
      prisma.athleteProfile.count({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          OR: [
            { legacyAthlete: { is: null } },
            {
              legacyAthlete: {
                is: {
                  workoutSessions: { none: { status: "COMPLETED" } },
                },
              },
            },
          ],
        },
      }),
      prisma.user.count({
        where: {
          role: { in: ["COACH", "STAFF", "ORG_ADMIN"] },
          isActive: true,
          athletes: { some: {} },
          trainingPlans: { none: { createdAt: { gte: thirtyDaysAgo } } },
        },
      }),
    ]);

  const journey = [
    { key: "registered", label: "Registered", count: registered },
    { key: "connected", label: "Connected to coach", count: connected },
    { key: "assigned", label: "Training assigned", count: assigned },
    { key: "first-workout", label: "First workout completed", count: firstWorkout },
    { key: "active", label: "Active this month", count: activeAthletes },
    { key: "progress", label: "Progress recorded", count: progressRecorded },
  ].map((stage) => ({
    ...stage,
    percent: percent(stage.count, registered),
    href: `/admin/users?role=ATHLETE&journey=${stage.key}`,
  }));

  const conversions = journey.slice(1).map((stage, index) => {
    const previous = journey[index]!;
    return {
      from: previous.label,
      to: stage.label,
      rate: percent(stage.count, previous.count),
      drop: Math.max(0, previous.count - stage.count),
    };
  });

  const activity = await getAdminActivity({ limit: 18 });
  const sportHealth = await Promise.all(
    platformSports.map(async (sport) => {
      const [athletes, active, coaches, directors, orgs, workouts, videos, prs] =
        await Promise.all([
          countAthletesForSport(sport.name),
          countAthletesForSport(sport.name, thirtyDaysAgo),
          countCoachesForSport(sport.name),
          prisma.directorSportAssignment.count({
            where: { sportId: sport.id, isActive: true },
          }),
          countOrganizationsForSport(sport.name),
          prisma.workoutSession.count({
            where: {
              status: "COMPLETED",
              completedAt: { gte: thirtyDaysAgo },
              athlete: { sport: { equals: sport.name, mode: "insensitive" } },
            },
          }),
          prisma.videoReview.count({
            where: {
              sport: { equals: sport.name, mode: "insensitive" },
              submittedAt: { gte: thirtyDaysAgo },
            },
          }),
          prisma.exerciseResult.count({
            where: {
              isPersonalRecord: true,
              completedAt: { gte: thirtyDaysAgo },
              session: {
                athlete: {
                  sport: { equals: sport.name, mode: "insensitive" },
                },
              },
            },
          }),
        ]);
      return {
        id: sport.id,
        name: sport.name,
        athletes,
        active,
        activeRate: percent(active, athletes),
        coaches,
        directors,
        organizations: orgs,
        workouts,
        videos,
        personalRecords: prs,
      };
    }),
  );

  return {
    range,
    generatedAt: now,
    metrics: {
      totalAthletes,
      athletesThisMonth,
      totalCoaches,
      coachesThisMonth,
      totalDirectors,
      directorsThisMonth,
      totalOrganizations,
      organizationsThisMonth,
      activeAthletes,
      activeAthleteRate: percent(activeAthletes, totalAthletes),
      workoutsCompleted,
      videosUploaded,
      videosReviewed,
      personalRecords,
    },
    journey,
    conversions,
    attention: [
      {
        key: "unconnected",
        title: "Unconnected athletes",
        count: unconnected,
        detail: "Registered player profiles without a coach connection.",
        href: "/admin/users?role=ATHLETE&attention=unconnected",
      },
      {
        key: "no-training",
        title: "No training assigned",
        count: noTraining,
        detail: "Connected athletes without an active training plan.",
        href: "/admin/users?role=ATHLETE&attention=no-training",
      },
      {
        key: "inactive-coaches",
        title: "Inactive coaches",
        count: inactiveCoaches,
        detail: "Coaches with athletes and no new plan in 30 days.",
        href: "/admin/users?role=COACH&attention=inactive",
      },
      {
        key: "reviews",
        title: "Video reviews waiting",
        count: pendingReviews,
        detail: "Reviews waiting more than 48 hours.",
        href: "/admin/activity?type=VIDEOS&attention=waiting",
      },
      {
        key: "not-activated",
        title: "New athletes not activated",
        count: newNotActivated,
        detail: "New profiles without a completed first workout.",
        href: "/admin/users?role=ATHLETE&attention=not-activated",
      },
    ].filter((item) => item.count > 0),
    activity,
    organizations: organizations
      .map((organization) => {
        const athleteIds = new Set(
          organization.athleteMemberships.map((row) => row.athleteProfileId),
        );
        const coachIds = new Set(
          organization.athleteMemberships.flatMap((row) =>
            row.coachUserId ? [row.coachUserId] : [],
          ),
        );
        const directors = organization.memberships.filter(
          (row) => row.user.role === "TRAINER",
        ).length;
        const workouts = organization.athleteMemberships.reduce(
          (sum, row) =>
            sum + (row.athleteProfile.legacyAthlete?.workoutSessions.length ?? 0),
          0,
        );
        return {
          id: organization.id,
          name: organization.name,
          athletes: athleteIds.size,
          coaches: coachIds.size,
          directors,
          sports: [...new Set(organization.teams.map((team) => team.sport))],
          workouts,
        };
      })
      .sort((a, b) => b.workouts - a.workouts),
    sports: sportHealth,
    health: {
      training: {
        assignedPlans: assigned,
        completedWorkouts: workoutsCompleted,
        activeAthletes,
        noActivePlan: noTraining,
      },
      videos: {
        uploaded: videosUploaded,
        reviewed: videosReviewed,
        pendingOver48Hours: pendingReviews,
      },
    },
  };
}

export async function getPlatformGrowth(days: 30 | 90 | 365) {
  const start = new Date(Date.now() - days * 86400000);
  const bucket = days <= 90 ? "day" : "month";
  type Row = { bucket: Date; kind: string; count: bigint };
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `
      SELECT date_trunc($1, "createdAt") AS bucket, 'Athletes' AS kind, COUNT(*) AS count
      FROM "AthleteProfile" WHERE "createdAt" >= $2 GROUP BY 1
      UNION ALL
      SELECT date_trunc($1, "createdAt"), 'Coaches', COUNT(*)
      FROM "User" WHERE "createdAt" >= $2 AND role IN ('COACH','STAFF','ORG_ADMIN') GROUP BY 1
      UNION ALL
      SELECT date_trunc($1, "createdAt"), 'Directors', COUNT(*)
      FROM "User" WHERE "createdAt" >= $2 AND role = 'TRAINER' GROUP BY 1
      UNION ALL
      SELECT date_trunc($1, "createdAt"), 'Organizations', COUNT(*)
      FROM "Organization" WHERE "createdAt" >= $2 GROUP BY 1
      ORDER BY 1 ASC
    `,
    bucket,
    start,
  );

  const points = new Map<
    string,
    { date: string; athletes: number; coaches: number; directors: number; organizations: number }
  >();
  for (const row of rows) {
    const key = row.bucket.toISOString().slice(0, bucket === "day" ? 10 : 7);
    const point = points.get(key) ?? {
      date: key,
      athletes: 0,
      coaches: 0,
      directors: 0,
      organizations: 0,
    };
    const field = row.kind.toLowerCase() as
      | "athletes"
      | "coaches"
      | "directors"
      | "organizations";
    point[field] = Number(row.count);
    points.set(key, point);
  }
  return [...points.values()];
}

export async function getAdminActivity(options: {
  type?: string;
  limit?: number;
}) {
  const limit = Math.min(options.limit ?? 50, 100);
  const [users, sessions, reviews, plans, metrics, orgs, connections] =
    await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        select: { id: true, name: true, role: true, createdAt: true },
      }),
      prisma.workoutSession.findMany({
        where: { status: "COMPLETED", completedAt: { not: null } },
        orderBy: { completedAt: "desc" },
        take: limit,
        select: {
          id: true,
          completedAt: true,
          athlete: { select: { firstName: true, lastName: true } },
          workout: { select: { title: true } },
        },
      }),
      prisma.videoReview.findMany({
        where: { status: "REVIEWED", reviewedAt: { not: null } },
        orderBy: { reviewedAt: "desc" },
        take: limit,
        select: {
          id: true,
          reviewedAt: true,
          title: true,
          athleteProfile: { select: { firstName: true, lastName: true } },
          coachUser: { select: { name: true } },
        },
      }),
      prisma.trainingPlan.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          title: true,
          createdAt: true,
          coach: { select: { name: true } },
          athlete: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.metricEntry.findMany({
        orderBy: { recordedAt: "desc" },
        take: limit,
        select: {
          id: true,
          recordedAt: true,
          value: true,
          metricDefinition: { select: { name: true, unit: true } },
          athleteProfile: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.organization.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        select: { id: true, name: true, createdAt: true },
      }),
      prisma.coachAthleteConnection.findMany({
        where: { status: "APPROVED", approvedAt: { not: null } },
        orderBy: { approvedAt: "desc" },
        take: limit,
        select: {
          id: true,
          approvedAt: true,
          coachUser: { select: { name: true } },
          athleteProfile: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);

  const activity: AdminActivityItem[] = [
    ...users.map((user) => ({
      id: `user-${user.id}`,
      type:
        user.role === "ATHLETE"
          ? ("ATHLETES" as const)
          : user.role === "TRAINER"
            ? ("DIRECTORS" as const)
            : ("COACHES" as const),
      title: `New ${user.role.toLowerCase().replaceAll("_", " ")} registered`,
      detail: user.name,
      at: user.createdAt,
      href: `/admin/users/${user.id}`,
    })),
    ...sessions.map((session) => ({
      id: `session-${session.id}`,
      type: "TRAINING" as const,
      title: "Workout completed",
      detail: `${session.athlete.firstName} ${session.athlete.lastName} · ${session.workout.title}`,
      at: session.completedAt!,
      href: "/admin/activity?type=TRAINING",
    })),
    ...reviews.map((review) => ({
      id: `review-${review.id}`,
      type: "VIDEOS" as const,
      title: "Video review completed",
      detail: `${review.coachUser.name} reviewed ${review.athleteProfile.firstName} ${review.athleteProfile.lastName} · ${review.title}`,
      at: review.reviewedAt!,
      href: `/videos/reviews/${review.id}`,
    })),
    ...plans.map((plan) => ({
      id: `plan-${plan.id}`,
      type: "TRAINING" as const,
      title: "Training plan assigned",
      detail: `${plan.coach.name} · ${plan.athlete ? `${plan.athlete.firstName} ${plan.athlete.lastName}` : "team plan"} · ${plan.title}`,
      at: plan.createdAt,
      href: `/training/${plan.id}`,
    })),
    ...metrics.map((metric) => ({
      id: `metric-${metric.id}`,
      type: "PROGRESS" as const,
      title: "Progress recorded",
      detail: `${metric.athleteProfile.firstName} ${metric.athleteProfile.lastName} · ${metric.metricDefinition.name}: ${metric.value} ${metric.metricDefinition.unit}`,
      at: metric.recordedAt,
      href: `/admin/users?role=ATHLETE&search=${encodeURIComponent(metric.athleteProfile.lastName)}`,
    })),
    ...orgs.map((org) => ({
      id: `org-${org.id}`,
      type: "ORGANIZATIONS" as const,
      title: "Organization joined",
      detail: org.name,
      at: org.createdAt,
      href: `/admin/organizations/${org.id}`,
    })),
    ...connections.map((connection) => ({
      id: `connection-${connection.id}`,
      type: "ATHLETES" as const,
      title: "Athlete connected to coach",
      detail: `${connection.athleteProfile.firstName} ${connection.athleteProfile.lastName} · ${connection.coachUser.name}`,
      at: connection.approvedAt!,
      href: "/admin/users?role=ATHLETE&journey=connected",
    })),
  ];

  return activity
    .filter((item) => !options.type || options.type === "ALL" || item.type === options.type)
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, limit);
}

export async function countAthletesForSport(sport: string, activeSince?: Date) {
  return prisma.athleteProfile.count({
    where: {
      AND: [
        {
          OR: [
            {
              sports: {
                some: { sport: { equals: sport, mode: "insensitive" } },
              },
            },
            { primarySport: { equals: sport, mode: "insensitive" } },
            {
              legacyAthlete: {
                is: { sport: { equals: sport, mode: "insensitive" } },
              },
            },
          ],
        },
        ...(activeSince ? [athleteMeaningfulActivityWhere(activeSince)] : []),
      ],
    },
  });
}

export async function countCoachesForSport(sport: string) {
  const rows = await prisma.athleteProfile.findMany({
    where: {
      OR: [
        { sports: { some: { sport: { equals: sport, mode: "insensitive" } } } },
        { primarySport: { equals: sport, mode: "insensitive" } },
        {
          legacyAthlete: {
            is: { sport: { equals: sport, mode: "insensitive" } },
          },
        },
      ],
    },
    select: {
      legacyAthlete: { select: { coachId: true } },
      coachConnections: {
        where: { status: "APPROVED" },
        select: { coachUserId: true },
      },
      memberships: { select: { coachUserId: true } },
    },
  });
  return new Set(
    rows.flatMap((row) => [
      ...(row.legacyAthlete?.coachId ? [row.legacyAthlete.coachId] : []),
      ...row.coachConnections.map((connection) => connection.coachUserId),
      ...row.memberships.flatMap((membership) =>
        membership.coachUserId ? [membership.coachUserId] : [],
      ),
    ]),
  ).size;
}

export async function countOrganizationsForSport(sport: string) {
  return prisma.organization.count({
    where: {
      isActive: true,
      OR: [
        { teams: { some: { sport: { equals: sport, mode: "insensitive" } } } },
        {
          athleteMemberships: {
            some: {
              athleteProfile: {
                OR: [
                  {
                    sports: {
                      some: { sport: { equals: sport, mode: "insensitive" } },
                    },
                  },
                  { primarySport: { equals: sport, mode: "insensitive" } },
                ],
              },
            },
          },
        },
      ],
    },
  });
}
