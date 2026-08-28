import { prisma } from "@/lib/db";
import { creditedTrainingDays, uniqueTrainingDays } from "@/lib/community/ranking-core";

export const ACHIEVEMENT_CATALOG = {
  FIRST_WORKOUT: {
    title: "First Workout",
    description: "Completed the first Train2Play workout.",
  },
  WORKOUTS_10: {
    title: "10 Workouts",
    description: "Ten workouts in the book.",
  },
  WORKOUTS_50: {
    title: "50 Workouts",
    description: "Fifty workouts completed.",
  },
  WORKOUTS_100: {
    title: "100 Workouts",
    description: "One hundred workouts completed.",
  },
  NEW_PR: {
    title: "New PR",
    description: "Set a new personal record.",
  },
  STREAK_7: {
    title: "7-Day Streak",
    description: "Trained on seven consecutive days.",
  },
  PROGRAM_COMPLETED: {
    title: "Program Completed",
    description: "Finished a training program.",
  },
  TOP_10: {
    title: "Top 10",
    description: "Ranked in the top 10 of a Train2Play leaderboard.",
  },
  RANKING_1: {
    title: "#1 Ranking",
    description: "Reached #1 on a Train2Play leaderboard.",
  },
  MOST_IMPROVED: {
    title: "Most Improved",
    description: "Led a Most Improved board.",
  },
  PLAYER_OF_THE_WEEK: {
    title: "Player of the Week",
    description: "Named Train2Play Player of the Week.",
  },
  CHALLENGE_COMPLETE: {
    title: "Challenge Complete",
    description: "Finished a Train2Play challenge.",
  },
  CHALLENGE_WINNER: {
    title: "Challenge Winner",
    description: "Won a Train2Play challenge.",
  },
} as const;

export type AchievementKey = keyof typeof ACHIEVEMENT_CATALOG;

export async function awardAchievement(options: {
  athleteProfileId: string;
  key: AchievementKey;
  occurrenceKey?: string;
  metadata?: Record<string, unknown>;
  earnedAt?: Date;
}) {
  const def = ACHIEVEMENT_CATALOG[options.key];
  const occurrenceKey = options.occurrenceKey ?? options.key;
  return prisma.athleteAchievement.upsert({
    where: {
      athleteProfileId_occurrenceKey: {
        athleteProfileId: options.athleteProfileId,
        occurrenceKey,
      },
    },
    update: {},
    create: {
      athleteProfileId: options.athleteProfileId,
      key: options.key,
      occurrenceKey,
      title: def.title,
      description: def.description,
      metadataJson: options.metadata ? JSON.stringify(options.metadata) : null,
      earnedAt: options.earnedAt ?? new Date(),
      shareable: true,
    },
  });
}

export async function removeAchievement(options: {
  athleteProfileId: string;
  occurrenceKey: string;
}) {
  await prisma.athleteAchievement.deleteMany({
    where: {
      athleteProfileId: options.athleteProfileId,
      occurrenceKey: options.occurrenceKey,
    },
  });
}

export async function syncTrainingAchievements(athleteProfileId: string) {
  const profile = await prisma.athleteProfile.findUnique({
    where: { id: athleteProfileId },
    select: { id: true, legacyAthleteId: true },
  });
  if (!profile?.legacyAthleteId) return;

  const sessions = await prisma.workoutSession.findMany({
    where: { athleteId: profile.legacyAthleteId, status: "COMPLETED" },
    select: { completedAt: true },
  });
  const dates = sessions
    .map((session) => session.completedAt)
    .filter((date): date is Date => Boolean(date));
  const workouts = dates.length;
  const days = uniqueTrainingDays(dates);

  if (workouts >= 1) await awardAchievement({ athleteProfileId, key: "FIRST_WORKOUT" });
  if (workouts >= 10) await awardAchievement({ athleteProfileId, key: "WORKOUTS_10" });
  if (workouts >= 50) await awardAchievement({ athleteProfileId, key: "WORKOUTS_50" });
  if (workouts >= 100) await awardAchievement({ athleteProfileId, key: "WORKOUTS_100" });

  const plans = await prisma.trainingPlan.findMany({
    where: { athleteId: profile.legacyAthleteId, status: "ACTIVE" },
    include: { workouts: { select: { completed: true } } },
  });
  if (
    plans.some(
      (plan) =>
        plan.workouts.length > 0 && plan.workouts.every((workout) => workout.completed),
    )
  ) {
    await awardAchievement({ athleteProfileId, key: "PROGRAM_COMPLETED" });
  }

  void creditedTrainingDays(dates);
  void days;
}

export async function listAthleteAchievements(athleteProfileId: string) {
  return prisma.athleteAchievement.findMany({
    where: { athleteProfileId },
    orderBy: { earnedAt: "desc" },
  });
}
