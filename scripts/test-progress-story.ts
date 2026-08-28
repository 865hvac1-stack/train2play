/**
 * Progress development-story calculations.
 * Run: npx tsx scripts/test-progress-story.ts
 */
import {
  consecutiveDayStreak,
  percentImprovement,
  rankingDirectionFromMetric,
  summarizeMetricHistory,
  trainingOverviewFromDates,
} from "../lib/progress-story";

function assert(cond: unknown, message: string) {
  if (!cond) throw new Error(message);
}

const velo = summarizeMetricHistory(
  [
    { id: "a", value: 68, recordedAt: new Date("2026-01-01") },
    { id: "b", value: 71, recordedAt: new Date("2026-02-01") },
    { id: "c", value: 74, recordedAt: new Date("2026-03-01") },
    { id: "d", value: 76, recordedAt: new Date("2026-04-01") },
  ],
  "HIGHER_IS_BETTER",
  "mph",
)!;
assert(velo.starting === 68, "starting is earliest result");
assert(velo.current === 76, "current is latest result");
assert(velo.personalBest === 76, "personal best is highest velo");
assert(velo.delta === 8, "absolute improvement 68 → 76 is +8");
assert(velo.improved, "higher velo is improvement");
assert(velo.percent === 11.8, `percent should be 11.8 got ${velo.percent}`);
assert(velo.historyLabel.includes("68 → 71 → 74 → 76"), "history uses real values");
assert(velo.latestIsPersonalRecord, "latest velo is a new PR");

const sprint = summarizeMetricHistory(
  [
    { id: "s1", value: 7.6, recordedAt: new Date("2026-01-01") },
    { id: "s2", value: 7.4, recordedAt: new Date("2026-02-01") },
    { id: "s3", value: 7.2, recordedAt: new Date("2026-03-01") },
  ],
  "LOWER_IS_BETTER",
  "sec",
)!;
assert(sprint.starting === 7.6, "sprint starting");
assert(sprint.current === 7.2, "sprint current");
assert(sprint.personalBest === 7.2, "faster time is personal best");
assert(Math.abs(sprint.delta - 0.4) < 1e-9, "lower-is-better delta is first - latest");
assert(sprint.improved, "faster sprint is improvement");
assert(
  rankingDirectionFromMetric("LOWER") === "LOWER_IS_BETTER",
  "LOWER maps to lower-is-better",
);

const regression = summarizeMetricHistory(
  [
    { id: "r1", value: 76, recordedAt: new Date("2026-01-01") },
    { id: "r2", value: 80, recordedAt: new Date("2026-02-01") },
    { id: "r3", value: 74, recordedAt: new Date("2026-03-01") },
  ],
  "HIGHER_IS_BETTER",
  "mph",
)!;
assert(regression.starting === 76, "regression starting");
assert(regression.current === 74, "current can be below personal best");
assert(regression.personalBest === 80, "personal best is not always current");
assert(regression.improved === false, "76 → 74 is not improvement");
assert(regression.percent === null, "do not show percent when not an improvement");
assert(regression.latestIsPersonalRecord === false, "74 is not a PR after 80");

assert(percentImprovement(0, 8) === null, "percent skipped when starting is 0");
assert(percentImprovement(68, 8) === 11.8, "68 → 76 is +11.8%");

const first = summarizeMetricHistory(
  [{ id: "f1", value: 60, recordedAt: new Date("2026-01-01") }],
  "HIGHER_IS_BETTER",
  "mph",
)!;
assert(first.resultCount === 1, "single result counts");
assert(first.starting === first.current, "first result is starting and current");
assert(first.personalBest === 60, "first result is personal best");
assert(first.latestIsPersonalRecord, "first result is a PR");
assert(first.improved === false, "no development story without a second result");

const today = new Date("2026-08-28T15:00:00");
const overview = trainingOverviewFromDates(
  [
    new Date("2026-08-26T12:00:00"),
    new Date("2026-08-27T12:00:00"),
    new Date("2026-08-28T12:00:00"),
    new Date("2026-08-28T18:00:00"),
  ],
  today,
);
assert(overview.workoutsCompleted === 4, "workouts count sessions");
assert(overview.trainingDays === 3, "training days are unique calendar days");
assert(overview.streak === 3, "streak is consecutive days ending today");
assert(
  consecutiveDayStreak([new Date("2026-08-20T12:00:00")], today) === 0,
  "stale activity is not a current streak",
);
assert(
  trainingOverviewFromDates([], today).workoutsCompleted === 0,
  "new athlete shows 0 workouts",
);

console.log("progress story calculation tests passed");
