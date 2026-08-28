import { prisma } from "@/lib/db";
import { CONNECTION_STATUS } from "@/lib/coach-connections";
import {
  athleteAgeGroup,
  resolveAthleteCommunityFilters,
  type CommunityFilterQuery,
} from "@/lib/community/athlete-community";
import {
  getCurrentPlayerOfTheWeek,
  listPlayerOfTheWeekHistory,
  playerOfTheWeekCard,
} from "@/lib/community/player-of-the-week";
import { getActiveChallenges, refreshAthleteChallenges } from "@/lib/community/challenges";
import {
  getAthleteRank,
  listLeaderboardMetrics,
  rankMetricResults,
  rankMostImproved,
  rankTrainingLeaders,
  type RankingScope,
} from "@/lib/community/ranking";
import { listAthleteAchievements } from "@/lib/community/achievements";
import { ageFromDateOfBirth } from "@/lib/drills";
import { ageGroupFromAge } from "@/lib/community/age-groups";
import { safeDisplayName } from "@/lib/community/privacy";
import { verificationLabel } from "@/lib/community/verification";
import { type Prisma } from "@/lib/generated/prisma/client";
import { formatMetricDate, formatMetricValue } from "@/lib/progress";

export type CommunityRecentPr = {
  id: string;
  displayName: string;
  sport: string | null;
  metricName: string;
  unit: string;
  value: number;
  previous: number | null;
  recordedAt: Date;
  dateLabel: string;
  valueLabel: string;
  previousLabel: string | null;
  verificationLabel: string | null;
  slug: string | null;
};

export async function getAthleteCommunity(options: {
  athleteProfileId: string;
  sport: string | null;
  sports?: string[];
  locationState?: string | null;
  dateOfBirth?: Date | null;
  query?: CommunityFilterQuery;
}) {
  const now = new Date();
  const profile = await prisma.athleteProfile.findUnique({
    where: { id: options.athleteProfileId },
    select: {
      id: true,
      primarySport: true,
      locationState: true,
      dateOfBirth: true,
      publicLeaderboardOptIn: true,
      profileVisibility: true,
      sports: { select: { sport: true, isPrimary: true } },
      memberships: {
        where: { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
        select: {
          organizationId: true,
          organization: { select: { id: true, name: true } },
        },
      },
    },
  });

  const sports = [
    ...new Set(
      (options.sports?.length
        ? options.sports
        : profile?.sports.map((row) => row.sport) ?? []
      ).filter(Boolean),
    ),
  ];
  const primarySport =
    profile?.sports.find((row) => row.isPrimary)?.sport ||
    profile?.primarySport ||
    options.sport ||
    sports[0] ||
    "Multi-sport";
  const organizations = [
    ...new Map(
      (profile?.memberships ?? []).map((row) => [
        row.organization.id,
        row.organization,
      ]),
    ).values(),
  ];
  const locationState = profile?.locationState ?? options.locationState ?? null;
  const dateOfBirth = profile?.dateOfBirth ?? options.dateOfBirth ?? null;
  const myAgeGroup = athleteAgeGroup(dateOfBirth);
  const filters = resolveAthleteCommunityFilters({
    query: options.query ?? {},
    sports: sports.length > 0 ? sports : [primarySport],
    primarySport,
    ageGroup: myAgeGroup,
    organizations,
    locationState,
  });

  await refreshAthleteChallenges(options.athleteProfileId, filters.metricSport);
  const metrics = await listLeaderboardMetrics(filters.metricSport);
  const headlineMetric = metrics[0] ?? null;

  const publicScope: RankingScope = {
    sport: filters.sport,
    ageGroup: filters.ageGroup,
    organizationId: filters.organizationId ?? undefined,
    state: filters.state,
    publicOnly: true,
    take: 8,
  };

  const [potw, history, challenges, recentPrs, trainingLeaders, achievements, metricEntryCount] =
    await Promise.all([
      getCurrentPlayerOfTheWeek(),
      listPlayerOfTheWeekHistory(8),
      getActiveChallenges(filters.sport),
      listRecentCommunityPrs({
        sport: filters.sport,
        ageGroup: filters.ageGroup,
        organizationId: filters.organizationId,
        state: filters.state,
      }),
      rankTrainingLeaders({
        ...publicScope,
        period: "7d",
        rankingType: "TRAINING_DAYS",
      }),
      listAthleteAchievements(options.athleteProfileId),
      prisma.metricEntry.count({
        where: {
          athleteProfileId: options.athleteProfileId,
          resultStatus: "ACTIVE",
        },
      }),
    ]);

  const top =
    headlineMetric
      ? await rankMetricResults({
          ...publicScope,
          metricDefinitionId: headlineMetric.id,
          sport: filters.metricSport,
          period: "30d",
          verification: "VERIFIED",
        })
      : [];
  const improved =
    headlineMetric
      ? await rankMostImproved({
          ...publicScope,
          metricDefinitionId: headlineMetric.id,
          sport: filters.metricSport,
          period: "90d",
        })
      : [];

  const yourNational = headlineMetric
    ? await getAthleteRank({
        athleteProfileId: options.athleteProfileId,
        scope: {
          metricDefinitionId: headlineMetric.id,
          sport: filters.metricSport,
          ageGroup: filters.ageGroup,
          period: "30d",
          publicOnly: true,
        },
      })
    : null;
  const yourState =
    headlineMetric && locationState
      ? await getAthleteRank({
          athleteProfileId: options.athleteProfileId,
          scope: {
            metricDefinitionId: headlineMetric.id,
            sport: filters.metricSport,
            ageGroup: filters.ageGroup,
            state: locationState,
            period: "30d",
            publicOnly: true,
          },
        })
      : null;

  const challengeCards = await Promise.all(
    challenges.map(async (challenge) => {
      const entry = await prisma.challengeEntry.findUnique({
        where: {
          challengeId_athleteProfileId: {
            challengeId: challenge.id,
            athleteProfileId: options.athleteProfileId,
          },
        },
      });
      return { challenge, entry };
    }),
  );

  return {
    potw: potw ? playerOfTheWeekCard(potw) : null,
    history,
    top,
    improved,
    trainingLeaders,
    recentPrs,
    yourNational,
    yourState,
    headlineMetric,
    metrics,
    challengeCards,
    achievements,
    metricEntryCount,
    filters,
    sports: sports.length > 0 ? sports : [primarySport],
    primarySport,
    myAgeGroup,
    organizations,
    locationState,
    publicLeaderboardOptIn: profile?.publicLeaderboardOptIn ?? false,
  };
}

async function listRecentCommunityPrs(scope: {
  sport: string | null;
  ageGroup: string | null;
  organizationId: string | null;
  state: string | null;
}): Promise<CommunityRecentPr[]> {
  const AND: Prisma.AthleteProfileWhereInput[] = [
    { profileVisibility: "PUBLIC" },
    { publicLeaderboardOptIn: true },
  ];
  if (scope.sport) {
    AND.push({
      OR: [
        { primarySport: { equals: scope.sport, mode: "insensitive" } },
        { sports: { some: { sport: { equals: scope.sport, mode: "insensitive" } } } },
      ],
    });
  }
  if (scope.state) {
    AND.push({ locationState: scope.state.toUpperCase() });
  }
  if (scope.organizationId) {
    AND.push({
      memberships: {
        some: {
          organizationId: scope.organizationId,
          OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
        },
      },
    });
  }

  const entries = await prisma.metricEntry.findMany({
    where: {
      resultStatus: "ACTIVE" as const,
      notes: { contains: "Personal record", mode: "insensitive" },
      metricDefinition: {
        isSensitive: false,
        publicLeaderboardEligible: true,
      },
      athleteProfile: { AND },
    },
    include: {
      metricDefinition: true,
      athleteProfile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          displayName: true,
          dateOfBirth: true,
          publicSlug: true,
          primarySport: true,
        },
      },
    },
    orderBy: { recordedAt: "desc" },
    take: 24,
  });

  const eligible = entries.filter((row) => {
    if (!scope.ageGroup) return true;
    return (
      ageGroupFromAge(ageFromDateOfBirth(row.athleteProfile.dateOfBirth)) ===
      scope.ageGroup
    );
  }).slice(0, 8);

  const previousRows =
    eligible.length === 0
      ? []
      : await prisma.metricEntry.findMany({
          where: {
            resultStatus: "ACTIVE" as const,
            OR: eligible.map((row) => ({
              athleteProfileId: row.athleteProfileId,
              metricDefinitionId: row.metricDefinitionId,
              recordedAt: { lt: row.recordedAt },
            })),
          },
          select: {
            athleteProfileId: true,
            metricDefinitionId: true,
            value: true,
            recordedAt: true,
          },
          orderBy: { recordedAt: "desc" },
        });

  const previousByKey = new Map<string, number>();
  for (const row of previousRows) {
    const key = `${row.athleteProfileId}:${row.metricDefinitionId}`;
    if (!previousByKey.has(key)) previousByKey.set(key, row.value);
  }

  return eligible.map((row) => {
    const previous =
      previousByKey.get(
        `${row.athleteProfileId}:${row.metricDefinitionId}`,
      ) ?? null;
    return {
      id: row.id,
      displayName: safeDisplayName({
        firstName: row.athleteProfile.firstName,
        lastName: row.athleteProfile.lastName,
        displayName: row.athleteProfile.displayName,
        dateOfBirth: row.athleteProfile.dateOfBirth,
      }),
      sport: scope.sport || row.athleteProfile.primarySport,
      metricName: row.metricDefinition.name,
      unit: row.metricDefinition.unit,
      value: row.value,
      previous,
      recordedAt: row.recordedAt,
      dateLabel: formatMetricDate(row.recordedAt),
      valueLabel: formatMetricValue(row.value, row.metricDefinition.unit),
      previousLabel:
        previous != null
          ? formatMetricValue(previous, row.metricDefinition.unit)
          : null,
      verificationLabel: verificationLabel(row.verificationType),
      slug: row.athleteProfile.publicSlug,
    };
  });
}

export async function coachAthleteProfileIds(coachUserId: string) {
  const [owned, connected, memberships] = await Promise.all([
    prisma.athlete.findMany({
      where: { coachId: coachUserId },
      select: { athleteProfile: { select: { id: true } } },
    }),
    prisma.coachAthleteConnection.findMany({
      where: { coachUserId, status: CONNECTION_STATUS.APPROVED },
      select: { athleteProfileId: true },
    }),
    prisma.athleteMembership.findMany({
      where: { coachUserId, OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] },
      select: { athleteProfileId: true },
    }),
  ]);
  return [
    ...new Set([
      ...owned.flatMap((row) => (row.athleteProfile?.id ? [row.athleteProfile.id] : [])),
      ...connected.map((row) => row.athleteProfileId),
      ...memberships.map((row) => row.athleteProfileId),
    ]),
  ];
}

export async function getCoachCommunity(coachUserId: string) {
  const ids = await coachAthleteProfileIds(coachUserId);
  const metrics = await listLeaderboardMetrics();
  const metric = metrics[0] ?? null;
  const scope = { athleteProfileIds: ids, take: 12, period: "30d" as const };
  const [top, improved, training, potw, challenges, prs] = await Promise.all([
    metric
      ? rankMetricResults({ ...scope, metricDefinitionId: metric.id })
      : Promise.resolve([]),
    metric
      ? rankMostImproved({ ...scope, metricDefinitionId: metric.id, period: "90d" })
      : Promise.resolve([]),
    rankTrainingLeaders({ ...scope, rankingType: "TRAINING_DAYS", period: "7d" }),
    getCurrentPlayerOfTheWeek(),
    getActiveChallenges(),
    ids.length
      ? prisma.athleteAchievement.findMany({
          where: { athleteProfileId: { in: ids }, key: "NEW_PR" },
          include: {
            athleteProfile: {
              select: { firstName: true, lastName: true, displayName: true, dateOfBirth: true },
            },
          },
          orderBy: { earnedAt: "desc" },
          take: 10,
        })
      : Promise.resolve([]),
  ]);
  return {
    athleteCount: ids.length,
    metric,
    top,
    improved,
    training,
    potw: potw ? playerOfTheWeekCard(potw) : null,
    challenges,
    prs,
  };
}

export async function directorAuthorizedSports(directorUserId: string) {
  const assignments = await prisma.directorSportAssignment.findMany({
    where: { directorUserId, isActive: true },
    include: { sport: true, organization: { select: { id: true, name: true } } },
  });
  return assignments;
}

export async function getDirectorCommunity(directorUserId: string) {
  const assignments = await directorAuthorizedSports(directorUserId);
  const sports = [...new Set(assignments.map((row) => row.sport.name))];
  const orgIds = assignments
    .map((row) => row.organizationId)
    .filter((id): id is string => Boolean(id));
  const primarySport = sports[0] ?? null;
  const metrics = await listLeaderboardMetrics(primarySport);
  const metric = metrics[0] ?? null;
  const scope = {
    sport: primarySport,
    organizationId: orgIds[0] ?? undefined,
    take: 12,
    period: "30d" as const,
  };
  const [top, improved, training, potw, challenges] = await Promise.all([
    metric ? rankMetricResults({ ...scope, metricDefinitionId: metric.id, verification: "VERIFIED" }) : [],
    metric ? rankMostImproved({ ...scope, metricDefinitionId: metric.id, period: "90d" }) : [],
    rankTrainingLeaders({ ...scope, rankingType: "TRAINING_DAYS", period: "7d" }),
    getCurrentPlayerOfTheWeek(),
    getActiveChallenges(primarySport),
  ]);
  return {
    sports,
    organizations: assignments
      .map((row) => row.organization)
      .filter((row): row is { id: string; name: string } => Boolean(row)),
    metric,
    top,
    improved,
    training,
    potw: potw ? playerOfTheWeekCard(potw) : null,
    challenges,
  };
}
