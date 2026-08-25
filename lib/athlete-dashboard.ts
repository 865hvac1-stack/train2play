import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { requireAthlete } from "@/lib/session";
import {
  getLatestMetricForLabel,
  normalizeMetricLabel,
  PROFILE_METRICS,
} from "@/lib/player-profile";
import { getSuggestedDrills } from "@/lib/drills";

export type AthleteContext = {
  userId: string;
  userName: string;
  profileId: string;
  athleteId: string | null;
  firstName: string;
  lastName: string;
  sport: string;
  position: string | null;
  dateOfBirth: Date | null;
  avatarUrl: string | null;
};

/** Resolve the logged-in athlete's shared AthleteProfile (+ legacy Athlete when linked). */
export async function getAthleteContext(): Promise<AthleteContext | null> {
  const user = await requireAthlete();

  const profile = await prisma.athleteProfile.findUnique({
    where: { userId: user.id },
    include: {
      sports: { where: { isPrimary: true }, take: 1 },
      legacyAthlete: {
        select: {
          id: true,
          sport: true,
          position: true,
          dateOfBirth: true,
        },
      },
    },
  });

  if (!profile) {
    return null;
  }

  const primarySport =
    profile.sports[0]?.sport ||
    profile.primarySport ||
    profile.legacyAthlete?.sport ||
    "Multi-sport";
  const position =
    profile.sports[0]?.position || profile.legacyAthlete?.position || null;

  return {
    userId: user.id,
    userName: user.name ?? `${profile.firstName} ${profile.lastName}`,
    profileId: profile.id,
    athleteId: profile.legacyAthleteId,
    firstName: profile.firstName,
    lastName: profile.lastName,
    sport: primarySport,
    position,
    dateOfBirth: profile.dateOfBirth ?? profile.legacyAthlete?.dateOfBirth ?? null,
    avatarUrl: profile.avatarUrl,
  };
}

export async function requireAthleteContext(): Promise<AthleteContext> {
  const ctx = await getAthleteContext();
  if (!ctx) {
    redirect("/athlete/setup-required");
  }
  return ctx;
}

function startOfLocalDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameLocalDay(a: Date, b: Date) {
  return startOfLocalDay(a).getTime() === startOfLocalDay(b).getTime();
}

export async function getAthleteDashboardData(ctx: AthleteContext) {
  const athleteId = ctx.athleteId;

  const [plans, metrics, goals, videos, metricEntries] = await Promise.all([
    athleteId
      ? prisma.trainingPlan.findMany({
          where: { athleteId, status: "ACTIVE" },
          include: {
            workouts: {
              orderBy: [{ sortOrder: "asc" }, { scheduledDate: "asc" }],
            },
          },
          orderBy: { updatedAt: "desc" },
        })
      : Promise.resolve([]),
    athleteId
      ? prisma.progressMetric.findMany({
          where: { athleteId },
          orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
        })
      : Promise.resolve([]),
    athleteId
      ? prisma.progressGoal.findMany({
          where: { athleteId },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    athleteId
      ? prisma.trainingVideo.findMany({
          where: { athleteId },
          orderBy: { updatedAt: "desc" },
          take: 5,
        })
      : Promise.resolve([]),
    prisma.metricEntry.findMany({
      where: { athleteProfileId: ctx.profileId },
      include: { metricDefinition: true },
      orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
      take: 40,
    }),
  ]);

  const activePlan = plans[0] ?? null;
  const today = startOfLocalDay(new Date());

  const todaysWorkout =
    activePlan?.workouts.find(
      (w) => w.scheduledDate && isSameLocalDay(w.scheduledDate, today) && !w.completed,
    ) ??
    activePlan?.workouts.find((w) => !w.completed) ??
    null;

  const completedWorkouts = (activePlan?.workouts ?? []).filter((w) => w.completed);
  const totalWorkouts = activePlan?.workouts.length ?? 0;
  const programProgress =
    totalWorkouts > 0
      ? Math.round((completedWorkouts.length / totalWorkouts) * 100)
      : 0;

  // Streak: consecutive calendar days with a completed workout ending today or yesterday
  const completedDates = [
    ...new Set(
      plans
        .flatMap((p) => p.workouts)
        .filter((w) => w.completed && (w.completedAt || w.scheduledDate))
        .map((w) =>
          startOfLocalDay(w.completedAt ?? w.scheduledDate!).getTime(),
        ),
    ),
  ].sort((a, b) => b - a);

  let streak = 0;
  if (completedDates.length > 0) {
    const latest = completedDates[0]!;
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (latest === today.getTime() || latest === yesterday.getTime()) {
      let expect = latest === today.getTime() ? today.getTime() : yesterday.getTime();
      for (const ts of completedDates) {
        if (ts === expect) {
          streak += 1;
          const prev = new Date(expect);
          prev.setDate(prev.getDate() - 1);
          expect = prev.getTime();
        } else if (ts < expect) {
          break;
        }
      }
    }
  }

  // Prefer MetricEntry (new architecture); fall back to ProgressMetric labels
  type MetricCard = {
    label: string;
    shortLabel: string;
    unit: string;
    direction: "HIGHER" | "LOWER";
    value: number | null;
    previous: number | null;
    delta: number | null;
  };

  const cards: MetricCard[] = [];

  function toHigherLower(
    direction: string,
  ): "HIGHER" | "LOWER" {
    if (
      direction === "LOWER" ||
      direction === "LOWER_IS_BETTER" ||
      direction === "ASC"
    ) {
      return "LOWER";
    }
    return "HIGHER";
  }

  if (metricEntries.length > 0) {
    const byDef = new Map<string, typeof metricEntries>();
    for (const entry of metricEntries) {
      const key = entry.metricDefinitionId;
      const list = byDef.get(key) ?? [];
      list.push(entry);
      byDef.set(key, list);
    }
    for (const [, entries] of byDef) {
      if (cards.length >= 4) break;
      const sorted = [...entries].sort(
        (a, b) => b.recordedAt.getTime() - a.recordedAt.getTime(),
      );
      const latest = sorted[0]!;
      const previous = sorted[1] ?? null;
      cards.push({
        label: latest.metricDefinition.name,
        shortLabel: latest.metricDefinition.name,
        unit: latest.metricDefinition.unit,
        direction: toHigherLower(latest.metricDefinition.direction),
        value: latest.value,
        previous: previous?.value ?? null,
        delta:
          previous != null ? latest.value - previous.value : null,
      });
    }
  }

  if (cards.length === 0) {
    for (const config of PROFILE_METRICS) {
      if (cards.length >= 4) break;
      const matching = metrics.filter(
        (m) => normalizeMetricLabel(m.label) === normalizeMetricLabel(config.label),
      );
      if (matching.length === 0) continue;
      const latest = matching[0]!;
      const previous = matching[1] ?? null;
      cards.push({
        label: config.label,
        shortLabel: config.shortLabel,
        unit: config.unit,
        direction: config.direction,
        value: latest.value,
        previous: previous?.value ?? null,
        delta: previous != null ? latest.value - previous.value : null,
      });
    }
  }

  // Personal records from metric history
  type PR = {
    label: string;
    unit: string;
    value: number;
    previousBest: number | null;
    isNew: boolean;
  };

  let personalRecord: PR | null = null;
  for (const config of PROFILE_METRICS) {
    const matching = metrics
      .filter(
        (m) => normalizeMetricLabel(m.label) === normalizeMetricLabel(config.label),
      )
      .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());
    if (matching.length === 0) continue;

    const values = matching.map((m) => m.value);
    const best =
      config.direction === "HIGHER"
        ? Math.max(...values)
        : Math.min(...values);
    const latest = matching[0]!;
    const isLatestBest =
      config.direction === "HIGHER"
        ? latest.value >= best
        : latest.value <= best;
    const prior = matching.slice(1).map((m) => m.value);
    const previousBest =
      prior.length === 0
        ? null
        : config.direction === "HIGHER"
          ? Math.max(...prior)
          : Math.min(...prior);

    if (isLatestBest && previousBest != null && latest.value !== previousBest) {
      personalRecord = {
        label: config.label,
        unit: config.unit,
        value: latest.value,
        previousBest,
        isNew: true,
      };
      break;
    }
  }

  // Goal progress
  const goal =
    goals.find((g) => {
      const current = getLatestMetricForLabel(metrics, g.label)?.value;
      if (current == null) return true;
      // still show as active goal
      return true;
    }) ?? null;

  let goalView: {
    label: string;
    target: number;
    unit: string;
    current: number | null;
    percent: number;
  } | null = null;

  if (goal) {
    const current = getLatestMetricForLabel(metrics, goal.label)?.value ?? null;
    const percent =
      current == null
        ? 0
        : Math.min(100, Math.round((current / goal.targetValue) * 100));
    goalView = {
      label: goal.label,
      target: goal.targetValue,
      unit: goal.unit,
      current,
      percent,
    };
  }

  // Recent activity (simple timeline)
  const activity: { id: string; title: string; detail: string; at: Date }[] = [];

  for (const w of completedWorkouts.slice(0, 5)) {
    activity.push({
      id: `workout-${w.id}`,
      title: "Workout completed",
      detail: w.title,
      at: w.completedAt ?? w.updatedAt,
    });
  }
  for (const m of metrics.slice(0, 5)) {
    activity.push({
      id: `metric-${m.id}`,
      title: "Metric logged",
      detail: `${m.label}: ${m.value} ${m.unit}`,
      at: m.recordedAt,
    });
  }
  if (personalRecord) {
    activity.unshift({
      id: "pr-latest",
      title: "New personal record",
      detail: `${personalRecord.label}: ${personalRecord.value} ${personalRecord.unit}`,
      at: new Date(),
    });
  }
  for (const v of videos.slice(0, 3)) {
    activity.push({
      id: `video-${v.id}`,
      title: "Video available",
      detail: v.title,
      at: v.updatedAt,
    });
  }

  activity.sort((a, b) => b.at.getTime() - a.at.getTime());

  // Lightweight achievements (architecture stub — computed, not a game engine)
  const totalCompletedAll = plans
    .flatMap((p) => p.workouts)
    .filter((w) => w.completed).length;

  const achievements = [
    {
      id: "first-workout",
      label: "First Workout",
      earned: totalCompletedAll >= 1,
    },
    {
      id: "ten-workouts",
      label: "10 Workouts",
      earned: totalCompletedAll >= 10,
    },
    {
      id: "fifty-workouts",
      label: "50 Workouts",
      earned: totalCompletedAll >= 50,
    },
    {
      id: "new-pr",
      label: "New PR",
      earned: Boolean(personalRecord),
    },
    {
      id: "seven-day-streak",
      label: "7-Day Streak",
      earned: streak >= 7,
    },
    {
      id: "program-complete",
      label: "Program Completed",
      earned: Boolean(activePlan && totalWorkouts > 0 && programProgress >= 100),
    },
  ];

  const recommended = getSuggestedDrills({
    sport: ctx.sport,
    dateOfBirth: ctx.dateOfBirth,
    limit: 2,
  });

  const exerciseCountHint = todaysWorkout?.description
    ? Math.max(
        3,
        todaysWorkout.description.split(/\n|;|\. /).filter(Boolean).length,
      )
    : todaysWorkout
      ? 5
      : 0;

  return {
    activePlan,
    todaysWorkout,
    exerciseCountHint,
    streak,
    programProgress,
    completedCount: completedWorkouts.length,
    totalWorkouts,
    metricCards: cards,
    personalRecord,
    goalView,
    activity: activity.slice(0, 8),
    achievements,
    recommended,
  };
}
