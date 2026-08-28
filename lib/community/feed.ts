import { prisma } from "@/lib/db";
import { CONNECTION_STATUS } from "@/lib/coach-connections";
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
} from "@/lib/community/ranking";
import { listAthleteAchievements } from "@/lib/community/achievements";

export async function getAthleteCommunity(options: {
  athleteProfileId: string;
  sport: string | null;
  locationState?: string | null;
}) {
  await refreshAthleteChallenges(options.athleteProfileId, options.sport);
  const metrics = await listLeaderboardMetrics(options.sport);
  const headlineMetric = metrics[0] ?? null;

  const [potw, history, challenges, recentPrs, trainingLeaders, achievements] =
    await Promise.all([
      getCurrentPlayerOfTheWeek(),
      listPlayerOfTheWeekHistory(8),
      getActiveChallenges(options.sport),
      prisma.metricEntry.findMany({
        where: {
          resultStatus: "ACTIVE" as const,
          notes: { contains: "Personal record", mode: "insensitive" },
          athleteProfile: options.sport
            ? {
                OR: [
                  { primarySport: { equals: options.sport, mode: "insensitive" } },
                  { sports: { some: { sport: { equals: options.sport, mode: "insensitive" } } } },
                ],
              }
            : undefined,
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
              profileVisibility: true,
            },
          },
        },
        orderBy: { recordedAt: "desc" },
        take: 8,
      }),
      rankTrainingLeaders({
        sport: options.sport,
        period: "7d",
        rankingType: "TRAINING_DAYS",
        take: 8,
      }),
      listAthleteAchievements(options.athleteProfileId),
    ]);

  const top =
    headlineMetric
      ? await rankMetricResults({
          metricDefinitionId: headlineMetric.id,
          sport: options.sport,
          period: "30d",
          verification: "VERIFIED",
          take: 8,
        })
      : [];
  const improved =
    headlineMetric
      ? await rankMostImproved({
          metricDefinitionId: headlineMetric.id,
          sport: options.sport,
          period: "90d",
          take: 8,
        })
      : [];

  const yourNational = headlineMetric
    ? await getAthleteRank({
        athleteProfileId: options.athleteProfileId,
        scope: {
          metricDefinitionId: headlineMetric.id,
          sport: options.sport,
          period: "30d",
        },
      })
    : null;
  const yourState =
    headlineMetric && options.locationState
      ? await getAthleteRank({
          athleteProfileId: options.athleteProfileId,
          scope: {
            metricDefinitionId: headlineMetric.id,
            sport: options.sport,
            state: options.locationState,
            period: "30d",
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
  };
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
