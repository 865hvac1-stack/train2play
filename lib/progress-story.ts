import {
  improvementDelta,
  isImprovement,
  uniqueTrainingDays,
  type RankingDirection,
} from "@/lib/community/ranking-core";
import { isPersonalRecord } from "@/lib/personal-records";
import { formatMetricNumber } from "@/lib/progress";

export function rankingDirectionFromMetric(
  direction: string | null | undefined,
): RankingDirection {
  if (
    direction === "LOWER_IS_BETTER" ||
    direction === "LOWER" ||
    direction === "ASC"
  ) {
    return "LOWER_IS_BETTER";
  }
  return "HIGHER_IS_BETTER";
}

export type MetricHistoryPoint = {
  id: string;
  value: number;
  recordedAt: Date;
  verificationType?: string | null;
  verifiedByName?: string | null;
  recordedByName?: string | null;
};

export type MetricDevelopmentStory = {
  starting: number;
  current: number;
  personalBest: number;
  startingAt: Date;
  currentAt: Date;
  personalBestAt: Date;
  personalBestId: string;
  delta: number;
  improved: boolean;
  percent: number | null;
  resultCount: number;
  history: number[];
  historyLabel: string;
  latestIsPersonalRecord: boolean;
};

export function summarizeMetricHistory(
  points: MetricHistoryPoint[],
  directionInput: string,
  unit: string,
): MetricDevelopmentStory | null {
  if (points.length === 0) return null;
  const direction = rankingDirectionFromMetric(directionInput);
  const chronological = [...points].sort(
    (a, b) => a.recordedAt.getTime() - b.recordedAt.getTime(),
  );
  const startingPoint = chronological[0]!;
  const currentPoint = chronological[chronological.length - 1]!;
  const bestPoint = chronological.reduce((best, point) => {
    const better =
      direction === "LOWER_IS_BETTER"
        ? point.value < best.value
        : point.value > best.value;
    return better ? point : best;
  }, startingPoint);

  const delta = improvementDelta({
    first: startingPoint.value,
    latest: currentPoint.value,
    direction,
  });
  const previousBest =
    chronological.length < 2
      ? null
      : direction === "LOWER_IS_BETTER"
        ? Math.min(...chronological.slice(0, -1).map((point) => point.value))
        : Math.max(...chronological.slice(0, -1).map((point) => point.value));

  return {
    starting: startingPoint.value,
    current: currentPoint.value,
    personalBest: bestPoint.value,
    startingAt: startingPoint.recordedAt,
    currentAt: currentPoint.recordedAt,
    personalBestAt: bestPoint.recordedAt,
    personalBestId: bestPoint.id,
    delta,
    improved: isImprovement(delta),
    percent: percentImprovement(startingPoint.value, delta),
    resultCount: chronological.length,
    history: chronological.map((point) => point.value),
    historyLabel: chronological
      .map((point) => formatMetricNumber(point.value, unit))
      .join(" → ")
      .concat(` ${unit}`),
    latestIsPersonalRecord: isPersonalRecord({
      direction,
      newValue: currentPoint.value,
      previousBest,
    }),
  };
}

export function percentImprovement(starting: number, delta: number) {
  if (!isImprovement(delta)) return null;
  if (starting === 0) return null;
  const percent = (delta / Math.abs(starting)) * 100;
  if (!Number.isFinite(percent) || Math.abs(percent) >= 1000) return null;
  return Number(percent.toFixed(1));
}

export function consecutiveDayStreak(dates: Date[], today = new Date()) {
  const unique = [
    ...new Set(
      dates.map((date) => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      }),
    ),
  ].sort((a, b) => b - a);
  if (unique.length === 0) return 0;

  const startToday = new Date(today);
  startToday.setHours(0, 0, 0, 0);
  const yesterday = new Date(startToday);
  yesterday.setDate(yesterday.getDate() - 1);
  const latest = unique[0]!;
  if (latest !== startToday.getTime() && latest !== yesterday.getTime()) {
    return 0;
  }

  let streak = 0;
  let expect = latest;
  for (const ts of unique) {
    if (ts === expect) {
      streak += 1;
      const prev = new Date(expect);
      prev.setDate(prev.getDate() - 1);
      expect = prev.getTime();
    } else if (ts < expect) {
      break;
    }
  }
  return streak;
}

export function trainingOverviewFromDates(completedAt: Date[], today = new Date()) {
  return {
    workoutsCompleted: completedAt.length,
    trainingDays: uniqueTrainingDays(completedAt),
    streak: consecutiveDayStreak(completedAt, today),
  };
}

export function resultsDuringWindow(
  points: MetricHistoryPoint[],
  start: Date,
  end: Date,
) {
  return points.filter(
    (point) => point.recordedAt >= start && point.recordedAt <= end,
  );
}
