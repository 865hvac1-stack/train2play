export type RankingDirection = "HIGHER_IS_BETTER" | "LOWER_IS_BETTER";

export type RankableRow = {
  athleteProfileId: string;
  value: number;
};

export type RankedRow<T extends RankableRow = RankableRow> = T & {
  rank: number;
  tied: boolean;
};

/**
 * Competition ranking with ties: 1, 2, 2, 4.
 * Does not invent tie-breakers.
 */
export function denseCompetitionRank<T extends RankableRow>(
  rows: T[],
  direction: RankingDirection,
): RankedRow<T>[] {
  const sorted = [...rows].sort((a, b) => {
    if (a.value === b.value) return 0;
    if (direction === "LOWER_IS_BETTER") return a.value - b.value;
    return b.value - a.value;
  });

  let lastValue: number | null = null;
  let lastRank = 0;
  return sorted.map((row, index) => {
    const rank =
      lastValue != null && row.value === lastValue ? lastRank : index + 1;
    lastValue = row.value;
    lastRank = rank;
    return { ...row, rank, tied: false };
  }).map((row, _, all) => ({
    ...row,
    tied: all.filter((other) => other.rank === row.rank).length > 1,
  }));
}

export function improvementDelta(options: {
  first: number;
  latest: number;
  direction: RankingDirection;
}) {
  if (options.direction === "LOWER_IS_BETTER") {
    return options.first - options.latest;
  }
  return options.latest - options.first;
}

export function isImprovement(delta: number) {
  return delta > 0;
}

/** Cap credited training days so leaderboards do not reward spam sessions. */
export const MAX_CREDITED_TRAINING_DAYS_PER_WEEK = 6;

export function uniqueTrainingDays(dates: Date[]) {
  const days = new Set(
    dates.map((date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }),
  );
  return days.size;
}

export function creditedTrainingDays(dates: Date[], now = new Date()) {
  const byWeek = new Map<string, Set<number>>();
  for (const date of dates) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const week = weekKey(d);
    const set = byWeek.get(week) ?? new Set<number>();
    set.add(d.getTime());
    byWeek.set(week, set);
  }
  let total = 0;
  for (const set of byWeek.values()) {
    total += Math.min(set.size, MAX_CREDITED_TRAINING_DAYS_PER_WEEK);
  }
  void now;
  return total;
}

function weekKey(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function rankMovement(current: number | null, previous: number | null) {
  if (current == null || previous == null) return null;
  return previous - current;
}

export type VerificationFilter = "ALL" | "VERIFIED";

export function isVerifiedType(type: string | null | undefined) {
  return type === "COACH" || type === "TRAIN2PLAY" || type === "VERIFIED";
}
