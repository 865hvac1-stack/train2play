import { prisma } from "@/lib/db";
import { awardAchievement } from "@/lib/community/achievements";
import { creditedTrainingDays } from "@/lib/community/ranking-core";
import { ResultStatus, type Challenge, type ChallengeScoringType } from "@/lib/generated/prisma/client";
import { invalidateRankingCache } from "@/lib/community/ranking";

export async function getActiveChallenges(sport?: string | null) {
  const now = new Date();
  return prisma.challenge.findMany({
    where: {
      status: "PUBLISHED",
      startAt: { lte: now },
      endAt: { gte: now },
      ...(sport
        ? { OR: [{ sport: null }, { sport: { equals: sport, mode: "insensitive" } }] }
        : {}),
    },
    orderBy: { endAt: "asc" },
  });
}

export async function computeChallengeProgress(
  challenge: Pick<
    Challenge,
    | "id"
    | "scoringType"
    | "targetValue"
    | "metricDefinitionId"
    | "workoutTitle"
    | "catalogDrillId"
    | "startAt"
    | "endAt"
    | "sport"
  >,
  athleteProfileId: string,
) {
  const profile = await prisma.athleteProfile.findUnique({
    where: { id: athleteProfileId },
    select: { id: true, legacyAthleteId: true },
  });
  if (!profile) return 0;

  const scoring = challenge.scoringType as ChallengeScoringType;

  if (scoring === "WORKOUT_COUNT" || scoring === "TRAINING_DAYS" || scoring === "SPECIFIC_WORKOUT") {
    if (!profile.legacyAthleteId) return 0;
    const sessions = await prisma.workoutSession.findMany({
      where: {
        athleteId: profile.legacyAthleteId,
        status: "COMPLETED",
        completedAt: { gte: challenge.startAt, lte: challenge.endAt },
        ...(scoring === "SPECIFIC_WORKOUT" && challenge.workoutTitle
          ? { workout: { title: { equals: challenge.workoutTitle, mode: "insensitive" } } }
          : {}),
      },
      select: { completedAt: true },
    });
    const dates = sessions
      .map((session) => session.completedAt)
      .filter((date): date is Date => Boolean(date));
    if (scoring === "TRAINING_DAYS") return creditedTrainingDays(dates);
    return dates.length;
  }

  if (scoring === "PROGRAM_COMPLETION") {
    if (!profile.legacyAthleteId) return 0;
    const plans = await prisma.trainingPlan.findMany({
      where: { athleteId: profile.legacyAthleteId },
      include: { workouts: { select: { completed: true, completedAt: true } } },
    });
    return plans.filter(
      (plan) =>
        plan.workouts.length > 0 &&
        plan.workouts.every(
          (workout) =>
            workout.completed &&
            workout.completedAt &&
            workout.completedAt >= challenge.startAt &&
            workout.completedAt <= challenge.endAt,
        ),
    ).length;
  }

  if (scoring === "PR_ACHIEVEMENT") {
    const prs = await prisma.exerciseResult.count({
      where: {
        isPersonalRecord: true,
        completedAt: { gte: challenge.startAt, lte: challenge.endAt },
        session: {
          athlete: { athleteProfile: { id: athleteProfileId } },
        },
      },
    });
    return prs;
  }

  if (scoring === "METRIC_IMPROVEMENT" && challenge.metricDefinitionId) {
    const entries = await prisma.metricEntry.findMany({
      where: {
        athleteProfileId,
        metricDefinitionId: challenge.metricDefinitionId,
        resultStatus: ResultStatus.ACTIVE,
        recordedAt: { gte: challenge.startAt, lte: challenge.endAt },
      },
      orderBy: { recordedAt: "asc" },
      select: { value: true },
    });
    if (entries.length < 2) return 0;
    return Math.abs(entries[entries.length - 1]!.value - entries[0]!.value);
  }

  if (scoring === "SPECIFIC_DRILL" && challenge.catalogDrillId) {
    return prisma.catalogDrillPush.count({
      where: {
        catalogDrillId: challenge.catalogDrillId,
        athleteProfileId,
        firstViewedAt: { gte: challenge.startAt, lte: challenge.endAt },
      },
    });
  }

  return 0;
}

export async function refreshChallengeEntry(challengeId: string, athleteProfileId: string) {
  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
  if (!challenge || challenge.status !== "PUBLISHED") return null;

  const progress = await computeChallengeProgress(challenge, athleteProfileId);
  const target = challenge.targetValue ?? 1;
  const completed = progress >= target;
  const entry = await prisma.challengeEntry.upsert({
    where: {
      challengeId_athleteProfileId: { challengeId, athleteProfileId },
    },
    update: {
      progressValue: progress,
      completedAt: completed ? new Date() : null,
    },
    create: {
      challengeId,
      athleteProfileId,
      progressValue: progress,
      completedAt: completed ? new Date() : null,
    },
  });

  if (completed) {
    await awardAchievement({
      athleteProfileId,
      key: "CHALLENGE_COMPLETE",
      occurrenceKey: `CHALLENGE_COMPLETE:${challengeId}`,
      metadata: { challengeId, name: challenge.name },
    });
  }
  invalidateRankingCache();
  return entry;
}

export async function refreshAthleteChallenges(athleteProfileId: string, sport?: string | null) {
  const challenges = await getActiveChallenges(sport);
  for (const challenge of challenges) {
    await refreshChallengeEntry(challenge.id, athleteProfileId);
  }
}

export async function challengeLeaderboard(challengeId: string, take = 25) {
  const entries = await prisma.challengeEntry.findMany({
    where: { challengeId },
    include: {
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
    orderBy: [{ progressValue: "desc" }, { completedAt: "asc" }],
    take,
  });
  return entries;
}

export async function markChallengeWinners(challengeId: string) {
  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
  if (!challenge) return;
  const target = challenge.targetValue ?? 1;
  const top = await prisma.challengeEntry.findMany({
    where: { challengeId, progressValue: { gte: target } },
    orderBy: [{ progressValue: "desc" }, { completedAt: "asc" }],
    take: 1,
  });
  await prisma.challengeEntry.updateMany({
    where: { challengeId },
    data: { winner: false },
  });
  for (const winner of top) {
    await prisma.challengeEntry.update({
      where: { id: winner.id },
      data: { winner: true },
    });
    await awardAchievement({
      athleteProfileId: winner.athleteProfileId,
      key: "CHALLENGE_WINNER",
      occurrenceKey: `CHALLENGE_WINNER:${challengeId}`,
      metadata: { challengeId, name: challenge.name },
    });
  }
}
