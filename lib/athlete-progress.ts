import { CONNECTION_STATUS } from "@/lib/coach-connections";
import { listAthleteAchievements } from "@/lib/community/achievements";
import { verificationLabel } from "@/lib/community/verification";
import { prisma } from "@/lib/db";
import type { AthleteContext } from "@/lib/athlete-dashboard";
import {
  rankingDirectionFromMetric,
  resultsDuringWindow,
  summarizeMetricHistory,
  trainingOverviewFromDates,
  type MetricHistoryPoint,
} from "@/lib/progress-story";
import {
  formatMetricDate,
  formatMetricValue,
  formatRelativeActivityDate,
} from "@/lib/progress";

export type ProgressActivityItem = {
  id: string;
  kind: string;
  title: string;
  detail: string;
  at: Date;
  when: string;
  href: string | null;
  cta: string | null;
};

export type ProgressMetricCard = {
  id: string;
  name: string;
  unit: string;
  sport: string;
  direction: string;
  startingLabel: string;
  currentLabel: string;
  personalBestLabel: string;
  changeLabel: string | null;
  percentLabel: string | null;
  improved: boolean;
  resultCount: number;
  historyLabel: string;
  chartPoints: { id: string; label: string; value: number; unit: string; recordedAt: Date }[];
  latestVerification: string | null;
  latestCoachContext: string | null;
};

export type ProgressPersonalRecord = {
  id: string;
  name: string;
  valueLabel: string;
  dateLabel: string;
  isNew: boolean;
  verification: string | null;
  coachContext: string | null;
};

export async function getAthleteProgressStory(
  ctx: AthleteContext,
  selectedSport?: string | null,
) {
  const sports = ctx.sports.length > 0 ? ctx.sports : [ctx.sport];
  const sport =
    selectedSport && sports.some((item) => item.toLowerCase() === selectedSport.toLowerCase())
      ? sports.find((item) => item.toLowerCase() === selectedSport.toLowerCase())!
      : ctx.sport;

  const now = new Date();
  const [
    entries,
    sessions,
    reviews,
    achievements,
    plans,
    coachLinks,
  ] = await Promise.all([
    prisma.metricEntry.findMany({
      where: {
        athleteProfileId: ctx.profileId,
        resultStatus: "ACTIVE",
        metricDefinition: { isSensitive: false },
      },
      include: {
        metricDefinition: true,
        verifiedByUser: { select: { name: true } },
        enteredByUser: { select: { name: true } },
      },
      orderBy: { recordedAt: "asc" },
    }),
    ctx.athleteId
      ? prisma.workoutSession.findMany({
          where: { athleteId: ctx.athleteId, status: "COMPLETED" },
          select: {
            id: true,
            completedAt: true,
            workout: { select: { title: true, trainingPlanId: true } },
          },
          orderBy: { completedAt: "desc" },
        })
      : Promise.resolve([]),
    prisma.videoReview.findMany({
      where: {
        athleteProfileId: ctx.profileId,
        status: { not: "ARCHIVED" },
      },
      select: {
        id: true,
        title: true,
        status: true,
        purpose: true,
        coachFeedback: true,
        reviewedAt: true,
        submittedAt: true,
        updatedAt: true,
        coachUser: { select: { name: true } },
        voiceReview: { select: { id: true, status: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 12,
    }),
    listAthleteAchievements(ctx.profileId),
    ctx.athleteId
      ? prisma.trainingPlan.findMany({
          where: { athleteId: ctx.athleteId },
          include: {
            coach: { select: { name: true } },
            workouts: { select: { completed: true, completedAt: true } },
          },
          orderBy: { updatedAt: "desc" },
        })
      : Promise.resolve([]),
    prisma.coachAthleteConnection.findMany({
      where: {
        athleteProfileId: ctx.profileId,
        status: CONNECTION_STATUS.APPROVED,
      },
      select: { id: true },
      take: 1,
    }),
  ]);

  const completedAt = sessions
    .map((session) => session.completedAt)
    .filter((date): date is Date => Boolean(date));
  const overview = trainingOverviewFromDates(completedAt, now);

  const byDefinition = new Map<string, typeof entries>();
  for (const entry of entries) {
    if (entry.metricDefinition.sport.toLowerCase() !== sport.toLowerCase()) continue;
    const list = byDefinition.get(entry.metricDefinitionId) ?? [];
    list.push(entry);
    byDefinition.set(entry.metricDefinitionId, list);
  }

  const metricCards: ProgressMetricCard[] = [];
  const personalRecords: ProgressPersonalRecord[] = [];

  for (const group of byDefinition.values()) {
    const def = group[0]!.metricDefinition;
    const points: MetricHistoryPoint[] = group.map((entry) => ({
      id: entry.id,
      value: entry.value,
      recordedAt: entry.recordedAt,
      verificationType: entry.verificationType,
      verifiedByName: entry.verifiedByUser?.name ?? null,
      recordedByName: entry.enteredByUser?.name ?? null,
    }));
    const story = summarizeMetricHistory(points, def.direction, def.unit);
    if (!story) continue;
    const latest = group[group.length - 1]!;
    const verification = verificationLabel(latest.verificationType);
    const coachContext = coachContextLabel({
      verificationType: latest.verificationType,
      verifiedByName: latest.verifiedByUser?.name ?? null,
      recordedByName:
        latest.enteredByUserId && latest.enteredByUserId !== ctx.userId
          ? latest.enteredByUser?.name ?? null
          : null,
    });

    metricCards.push({
      id: def.id,
      name: def.name,
      unit: def.unit,
      sport: def.sport,
      direction: rankingDirectionFromMetric(def.direction),
      startingLabel: formatMetricValue(story.starting, def.unit),
      currentLabel: formatMetricValue(story.current, def.unit),
      personalBestLabel: formatMetricValue(story.personalBest, def.unit),
      changeLabel: story.improved
        ? `+${formatMetricValue(story.delta, def.unit)}`
        : story.delta !== 0
          ? formatMetricValue(story.delta, def.unit)
          : null,
      percentLabel:
        story.percent != null ? `+${story.percent}%` : null,
      improved: story.improved,
      resultCount: story.resultCount,
      historyLabel: story.historyLabel,
      chartPoints: points.map((point) => ({
        id: point.id,
        label: def.name,
        value: point.value,
        unit: def.unit,
        recordedAt: point.recordedAt,
      })),
      latestVerification: verification,
      latestCoachContext: coachContext,
    });

    const bestEntry = group.find((entry) => entry.id === story.personalBestId) ?? latest;
    personalRecords.push({
      id: story.personalBestId,
      name: def.name,
      valueLabel: formatMetricValue(story.personalBest, def.unit),
      dateLabel: formatMetricDate(story.personalBestAt),
      isNew: story.latestIsPersonalRecord,
      verification: verificationLabel(bestEntry.verificationType),
      coachContext: coachContextLabel({
        verificationType: bestEntry.verificationType,
        verifiedByName: bestEntry.verifiedByUser?.name ?? null,
        recordedByName:
          bestEntry.enteredByUserId && bestEntry.enteredByUserId !== ctx.userId
            ? bestEntry.enteredByUser?.name ?? null
            : null,
      }),
    });
  }

  const activePlan =
    plans.find((plan) => plan.status === "ACTIVE") ?? plans[0] ?? null;
  let programConnection: {
    title: string;
    completed: number;
    total: number;
    lines: { name: string; from: string; to: string }[];
  } | null = null;

  if (activePlan) {
    const start = activePlan.startDate ?? activePlan.createdAt;
    const end = activePlan.endDate ?? now;
    const lines: { name: string; from: string; to: string }[] = [];
    for (const group of byDefinition.values()) {
      const def = group[0]!.metricDefinition;
      const windowed = resultsDuringWindow(
        group.map((entry) => ({
          id: entry.id,
          value: entry.value,
          recordedAt: entry.recordedAt,
        })),
        start,
        end,
      );
      if (windowed.length < 2) continue;
      const story = summarizeMetricHistory(windowed, def.direction, def.unit);
      if (!story || !story.improved) continue;
      lines.push({
        name: def.name,
        from: formatMetricValue(story.starting, def.unit),
        to: formatMetricValue(story.current, def.unit),
      });
    }
    programConnection = {
      title: activePlan.title,
      completed: activePlan.workouts.filter((workout) => workout.completed).length,
      total: activePlan.workouts.length,
      lines,
    };
  }

  const activity = buildDevelopmentActivity({
    sport,
    sessions,
    entries: entries.filter(
      (entry) => entry.metricDefinition.sport.toLowerCase() === sport.toLowerCase(),
    ),
    reviews,
    achievements,
    plans,
    now,
  });

  return {
    sports,
    selectedSport: sport,
    hasCoach: coachLinks.length > 0,
    overview: {
      ...overview,
      personalRecords: personalRecords.length,
    },
    metricCards,
    personalRecords,
    programConnection,
    activity,
    recordMetricHref: "/athlete/train",
  };
}

function coachContextLabel(input: {
  verificationType: string | null;
  verifiedByName: string | null;
  recordedByName: string | null;
}) {
  const label = verificationLabel(input.verificationType);
  if (label && input.verifiedByName) {
    return `${label} by ${input.verifiedByName}`;
  }
  if (label) return label;
  if (input.recordedByName) return `Recorded by ${input.recordedByName}`;
  return null;
}

function buildDevelopmentActivity(input: {
  sport: string;
  sessions: {
    id: string;
    completedAt: Date | null;
    workout: { title: string };
  }[];
  entries: {
    id: string;
    value: number;
    recordedAt: Date;
    verificationType: string;
    verifiedAt: Date | null;
    metricDefinition: { id: string; name: string; unit: string; direction: string };
  }[];
  reviews: {
    id: string;
    title: string;
    status: string;
    coachFeedback: string | null;
    reviewedAt: Date | null;
    submittedAt: Date;
    updatedAt: Date;
    coachUser: { name: string };
    voiceReview: { id: string; status: string } | null;
  }[];
  achievements: { id: string; title: string; earnedAt: Date }[];
  plans: {
    id: string;
    title: string;
    createdAt: Date;
    status: string;
    coach: { name: string };
    workouts: { completed: boolean; completedAt: Date | null }[];
  }[];
  now: Date;
}): ProgressActivityItem[] {
  const items: ProgressActivityItem[] = [];
  const resultHref = (metricId: string) =>
    `/athlete/progress?sport=${encodeURIComponent(input.sport)}#metric-${metricId}`;

  for (const session of input.sessions) {
    if (!session.completedAt) continue;
    items.push({
      id: `workout-${session.id}`,
      kind: "WORKOUT_COMPLETED",
      title: "Workout completed",
      detail: session.workout.title,
      at: session.completedAt,
      when: formatRelativeActivityDate(session.completedAt, input.now),
      href: `/athlete/workout/${session.id}`,
      cta: "View workout",
    });
  }

  const byMetric = new Map<string, typeof input.entries>();
  for (const entry of input.entries) {
    const list = byMetric.get(entry.metricDefinition.id) ?? [];
    list.push(entry);
    byMetric.set(entry.metricDefinition.id, list);
  }
  for (const group of byMetric.values()) {
    const chronological = [...group].sort(
      (a, b) => a.recordedAt.getTime() - b.recordedAt.getTime(),
    );
    chronological.forEach((entry, index) => {
      const story = summarizeMetricHistory(
        chronological.slice(0, index + 1).map((row) => ({
          id: row.id,
          value: row.value,
          recordedAt: row.recordedAt,
        })),
        entry.metricDefinition.direction,
        entry.metricDefinition.unit,
      );
      const isLatest = index === chronological.length - 1;
      if (story?.latestIsPersonalRecord && index > 0) {
        const previous = chronological[index - 1]!;
        items.push({
          id: `pr-${entry.id}`,
          kind: "NEW_PR",
          title: "New personal record",
          detail: `${entry.metricDefinition.name} · ${formatMetricValue(previous.value, entry.metricDefinition.unit)} → ${formatMetricValue(entry.value, entry.metricDefinition.unit)}`,
          at: entry.recordedAt,
          when: formatRelativeActivityDate(entry.recordedAt, input.now),
          href: resultHref(entry.metricDefinition.id),
          cta: "View result",
        });
      } else if (isLatest) {
        items.push({
          id: `result-${entry.id}`,
          kind: "NEW_RESULT",
          title: "New performance result",
          detail: `${entry.metricDefinition.name} · ${formatMetricValue(entry.value, entry.metricDefinition.unit)}`,
          at: entry.recordedAt,
          when: formatRelativeActivityDate(entry.recordedAt, input.now),
          href: resultHref(entry.metricDefinition.id),
          cta: "View result",
        });
      }
      if (
        isLatest &&
        entry.verifiedAt &&
        (entry.verificationType === "COACH" ||
          entry.verificationType === "TRAIN2PLAY")
      ) {
        items.push({
          id: `verified-${entry.id}`,
          kind: "METRIC_VERIFIED",
          title: "Metric verified",
          detail: `${entry.metricDefinition.name} · ${verificationLabel(entry.verificationType)}`,
          at: entry.verifiedAt,
          when: formatRelativeActivityDate(entry.verifiedAt, input.now),
          href: resultHref(entry.metricDefinition.id),
          cta: "View result",
        });
      }
    });
  }

  for (const review of input.reviews) {
    const feedbackReady =
      review.status === "REVIEWED" ||
      Boolean(review.coachFeedback?.trim()) ||
      review.voiceReview?.status === "READY";
    items.push({
      id: `video-${review.id}`,
      kind: feedbackReady ? "COACH_FEEDBACK" : "VIDEO_ADDED",
      title: feedbackReady ? "Coach feedback ready" : "Video added",
      detail: feedbackReady
        ? `${review.coachUser.name} reviewed your ${review.title} video.`
        : review.title,
      at: review.reviewedAt ?? review.updatedAt ?? review.submittedAt,
      when: formatRelativeActivityDate(
        review.reviewedAt ?? review.updatedAt ?? review.submittedAt,
        input.now,
      ),
      href: `/athlete/videos/reviews/${review.id}`,
      cta: feedbackReady ? "Watch feedback" : "Watch video",
    });
  }

  for (const achievement of input.achievements) {
    items.push({
      id: `achievement-${achievement.id}`,
      kind: "ACHIEVEMENT",
      title: "Achievement earned",
      detail: achievement.title,
      at: achievement.earnedAt,
      when: formatRelativeActivityDate(achievement.earnedAt, input.now),
      href: "/athlete/profile",
      cta: "View profile",
    });
  }

  for (const plan of input.plans) {
    const finished =
      plan.workouts.length > 0 && plan.workouts.every((workout) => workout.completed);
    if (finished) {
      const at =
        plan.workouts
          .map((workout) => workout.completedAt)
          .filter((date): date is Date => Boolean(date))
          .sort((a, b) => b.getTime() - a.getTime())[0] ?? plan.createdAt;
      items.push({
        id: `program-complete-${plan.id}`,
        kind: "PROGRAM_COMPLETED",
        title: "Program completed",
        detail: plan.title,
        at,
        when: formatRelativeActivityDate(at, input.now),
        href: "/athlete/train",
        cta: "Start training",
      });
    } else if (plan.status === "ACTIVE") {
      items.push({
        id: `program-assigned-${plan.id}`,
        kind: "TRAINING_ASSIGNED",
        title: "Coach assigned training",
        detail: `${plan.coach.name} assigned ${plan.title}.`,
        at: plan.createdAt,
        when: formatRelativeActivityDate(plan.createdAt, input.now),
        href: "/athlete/train",
        cta: "Start training",
      });
    }
  }

  items.sort((a, b) => b.at.getTime() - a.at.getTime());
  const seen = new Set<string>();
  const deduped: ProgressActivityItem[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    deduped.push(item);
  }
  return deduped.slice(0, 12);
}
