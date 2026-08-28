import { prisma } from "@/lib/db";
import { ageFromDateOfBirth } from "@/lib/drills";
import { ageGroupFromAge, periodStart } from "@/lib/community/age-groups";
import {
  creditedTrainingDays,
  denseCompetitionRank,
  improvementDelta,
  isVerifiedType,
  type RankingDirection,
  type RankedRow,
  type VerificationFilter,
} from "@/lib/community/ranking-core";
import { ResultStatus, type Prisma } from "@/lib/generated/prisma/client";
import { safeDisplayName } from "@/lib/community/privacy";

export type RankingScope = {
  metricDefinitionId?: string;
  sport?: string | null;
  ageGroup?: string | null;
  state?: string | null;
  organizationId?: string | null;
  period?: string;
  verification?: VerificationFilter;
  rankingType?:
    | "METRIC"
    | "MOST_IMPROVED"
    | "TRAINING_DAYS"
    | "WORKOUTS_COMPLETED"
    | "PROGRAM_COMPLETION"
    | "CONSISTENCY";
  publicOnly?: boolean;
  athleteProfileIds?: string[];
  take?: number;
};

export type LeaderboardEntry = RankedRow<{
  athleteProfileId: string;
  value: number;
  displayName: string;
  sport: string | null;
  ageGroup: string | null;
  location: string | null;
  slug: string | null;
  unit?: string;
  verified?: boolean;
  previous?: number | null;
  history?: number[];
}>;

const cache = new Map<string, { at: number; value: LeaderboardEntry[] }>();
const CACHE_MS = 45_000;

function cacheKey(scope: RankingScope) {
  return JSON.stringify(scope);
}

function readCache(scope: RankingScope) {
  const hit = cache.get(cacheKey(scope));
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_MS) {
    cache.delete(cacheKey(scope));
    return null;
  }
  return hit.value;
}

function writeCache(scope: RankingScope, value: LeaderboardEntry[]) {
  cache.set(cacheKey(scope), { at: Date.now(), value });
}

export function invalidateRankingCache() {
  cache.clear();
}

function athleteWhere(scope: RankingScope): Prisma.AthleteProfileWhereInput {
  const AND: Prisma.AthleteProfileWhereInput[] = [];
  if (scope.athleteProfileIds) {
    AND.push({ id: { in: scope.athleteProfileIds } });
  }
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
  if (scope.publicOnly) {
    AND.push({
      profileVisibility: "PUBLIC",
      publicLeaderboardOptIn: true,
    });
  }
  return AND.length ? { AND } : {};
}

function inAgeGroup(
  dateOfBirth: Date | null,
  ageGroup: string | null | undefined,
) {
  if (!ageGroup) return true;
  return ageGroupFromAge(ageFromDateOfBirth(dateOfBirth)) === ageGroup;
}

function directionFromMetric(direction: string): RankingDirection {
  return direction === "LOWER_IS_BETTER" || direction === "LOWER"
    ? "LOWER_IS_BETTER"
    : "HIGHER_IS_BETTER";
}

function toEntry(
  row: RankedRow<{ athleteProfileId: string; value: number }>,
  profile: {
    id: string;
    firstName: string;
    lastName: string;
    displayName: string | null;
    dateOfBirth: Date | null;
    publicSlug: string | null;
    locationState: string | null;
    primarySport: string | null;
  },
  extra: Partial<LeaderboardEntry> = {},
): LeaderboardEntry {
  return {
    ...row,
    displayName: safeDisplayName({
      firstName: profile.firstName,
      lastName: profile.lastName,
      displayName: profile.displayName,
      dateOfBirth: profile.dateOfBirth,
    }),
    sport: profile.primarySport,
    ageGroup: ageGroupFromAge(ageFromDateOfBirth(profile.dateOfBirth)),
    location: profile.locationState,
    slug: profile.publicSlug,
    ...extra,
  };
}

export async function rankMetricResults(
  scope: RankingScope,
): Promise<LeaderboardEntry[]> {
  const cached = readCache({ ...scope, rankingType: "METRIC" });
  if (cached) return cached;
  if (!scope.metricDefinitionId) return [];

  const metric = await prisma.metricDefinition.findUnique({
    where: { id: scope.metricDefinitionId },
  });
  if (!metric || !metric.isActive) return [];
  if (metric.isSensitive) return [];
  if (scope.publicOnly && !metric.publicLeaderboardEligible) return [];
  if (!metric.leaderboardEligible && scope.publicOnly) return [];

  const since = periodStart(scope.period ?? "all");
  const verifiedOnly = (scope.verification ?? (scope.publicOnly ? "VERIFIED" : "ALL")) === "VERIFIED";

  const entries = await prisma.metricEntry.findMany({
    where: {
      metricDefinitionId: metric.id,
      resultStatus: ResultStatus.ACTIVE,
      ...(since ? { recordedAt: { gte: since } } : {}),
      ...(verifiedOnly
        ? { verificationType: { in: ["COACH", "TRAIN2PLAY"] } }
        : {}),
      athleteProfile: athleteWhere(scope),
    },
    select: {
      athleteProfileId: true,
      value: true,
      recordedAt: true,
      verificationType: true,
      athleteProfile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          displayName: true,
          dateOfBirth: true,
          publicSlug: true,
          locationState: true,
          primarySport: true,
        },
      },
    },
    orderBy: [{ recordedAt: "desc" }],
    take: 5000,
  });

  const best = new Map<
    string,
    {
      value: number;
      verified: boolean;
      profile: (typeof entries)[number]["athleteProfile"];
    }
  >();
  const direction = directionFromMetric(metric.direction);

  for (const entry of entries) {
    if (!inAgeGroup(entry.athleteProfile.dateOfBirth, scope.ageGroup)) continue;
    const current = best.get(entry.athleteProfileId);
    const better =
      !current ||
      (direction === "LOWER_IS_BETTER"
        ? entry.value < current.value
        : entry.value > current.value);
    if (better) {
      best.set(entry.athleteProfileId, {
        value: entry.value,
        verified: isVerifiedType(entry.verificationType),
        profile: entry.athleteProfile,
      });
    }
  }

  const ranked = denseCompetitionRank(
    [...best.entries()].map(([athleteProfileId, row]) => ({
      athleteProfileId,
      value: row.value,
    })),
    direction,
  ).slice(0, scope.take ?? 50);

  const result = ranked.map((row) => {
    const meta = best.get(row.athleteProfileId)!;
    return toEntry(row, meta.profile, {
      unit: metric.unit,
      verified: meta.verified,
    });
  });
  writeCache({ ...scope, rankingType: "METRIC" }, result);
  return result;
}

export async function rankMostImproved(
  scope: RankingScope,
): Promise<LeaderboardEntry[]> {
  const cached = readCache({ ...scope, rankingType: "MOST_IMPROVED" });
  if (cached) return cached;
  if (!scope.metricDefinitionId) return [];

  const metric = await prisma.metricDefinition.findUnique({
    where: { id: scope.metricDefinitionId },
  });
  if (!metric || metric.isSensitive) return [];

  const since = periodStart(scope.period ?? "90d") ?? periodStart("90d");
  const verifiedOnly = (scope.verification ?? "ALL") === "VERIFIED";
  const entries = await prisma.metricEntry.findMany({
    where: {
      metricDefinitionId: metric.id,
      resultStatus: ResultStatus.ACTIVE,
      recordedAt: { gte: since! },
      ...(verifiedOnly
        ? { verificationType: { in: ["COACH", "TRAIN2PLAY"] } }
        : {}),
      athleteProfile: athleteWhere(scope),
    },
    select: {
      athleteProfileId: true,
      value: true,
      recordedAt: true,
      athleteProfile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          displayName: true,
          dateOfBirth: true,
          publicSlug: true,
          locationState: true,
          primarySport: true,
        },
      },
    },
    orderBy: { recordedAt: "asc" },
    take: 8000,
  });

  const byAthlete = new Map<string, typeof entries>();
  for (const entry of entries) {
    if (!inAgeGroup(entry.athleteProfile.dateOfBirth, scope.ageGroup)) continue;
    const list = byAthlete.get(entry.athleteProfileId) ?? [];
    list.push(entry);
    byAthlete.set(entry.athleteProfileId, list);
  }

  const direction = directionFromMetric(metric.direction);
  const improved: Array<{
    athleteProfileId: string;
    value: number;
    previous: number;
    history: number[];
    profile: (typeof entries)[number]["athleteProfile"];
  }> = [];

  for (const [athleteProfileId, list] of byAthlete) {
    if (list.length < 2) continue;
    const first = list[0]!;
    const latest = list[list.length - 1]!;
    const delta = improvementDelta({
      first: first.value,
      latest: latest.value,
      direction,
    });
    if (delta <= 0) continue;
    improved.push({
      athleteProfileId,
      value: Number(delta.toFixed(3)),
      previous: first.value,
      history: list.map((row) => row.value),
      profile: latest.athleteProfile,
    });
  }

  const ranked = denseCompetitionRank(
    improved.map((row) => ({
      athleteProfileId: row.athleteProfileId,
      value: row.value,
    })),
    "HIGHER_IS_BETTER",
  ).slice(0, scope.take ?? 50);

  const byId = new Map(improved.map((row) => [row.athleteProfileId, row]));
  const result = ranked.map((row) => {
    const meta = byId.get(row.athleteProfileId)!;
    return toEntry(row, meta.profile, {
      unit: metric.unit,
      previous: meta.previous,
      history: meta.history,
    });
  });
  writeCache({ ...scope, rankingType: "MOST_IMPROVED" }, result);
  return result;
}

export async function rankTrainingLeaders(
  scope: RankingScope,
): Promise<LeaderboardEntry[]> {
  const type = scope.rankingType ?? "TRAINING_DAYS";
  const cached = readCache({ ...scope, rankingType: type });
  if (cached) return cached;

  const since = periodStart(scope.period ?? "30d") ?? periodStart("30d");
  const profiles = await prisma.athleteProfile.findMany({
    where: athleteWhere(scope),
    select: {
      id: true,
      firstName: true,
      lastName: true,
      displayName: true,
      dateOfBirth: true,
      publicSlug: true,
      locationState: true,
      primarySport: true,
      legacyAthleteId: true,
    },
    take: 2000,
  });
  const eligible = profiles.filter((profile) =>
    inAgeGroup(profile.dateOfBirth, scope.ageGroup),
  );
  const legacyIds = eligible
    .map((profile) => profile.legacyAthleteId)
    .filter((id): id is string => Boolean(id));

  const sessions =
    legacyIds.length === 0
      ? []
      : await prisma.workoutSession.findMany({
          where: {
            athleteId: { in: legacyIds },
            status: "COMPLETED",
            completedAt: { gte: since! },
          },
          select: {
            athleteId: true,
            completedAt: true,
          },
        });

  const byLegacy = new Map<string, Date[]>();
  for (const session of sessions) {
    if (!session.completedAt) continue;
    const list = byLegacy.get(session.athleteId) ?? [];
    list.push(session.completedAt);
    byLegacy.set(session.athleteId, list);
  }

  const rows = eligible.flatMap((profile) => {
    if (!profile.legacyAthleteId) return [];
    const dates = byLegacy.get(profile.legacyAthleteId) ?? [];
    if (dates.length === 0) return [];
    const value =
      type === "WORKOUTS_COMPLETED"
        ? dates.length
        : creditedTrainingDays(dates);
    return [
      {
        athleteProfileId: profile.id,
        value,
        profile,
      },
    ];
  });

  const ranked = denseCompetitionRank(
    rows.map((row) => ({
      athleteProfileId: row.athleteProfileId,
      value: row.value,
    })),
    "HIGHER_IS_BETTER",
  ).slice(0, scope.take ?? 50);

  const byId = new Map(rows.map((row) => [row.athleteProfileId, row]));
  const result = ranked.map((row) => {
    const meta = byId.get(row.athleteProfileId)!;
    return toEntry(row, meta.profile, {
      unit: type === "WORKOUTS_COMPLETED" ? "workouts" : "days",
    });
  });
  writeCache({ ...scope, rankingType: type }, result);
  return result;
}

export async function getAthleteRank(options: {
  athleteProfileId: string;
  scope: RankingScope;
}) {
  const rows =
    options.scope.rankingType === "MOST_IMPROVED"
      ? await rankMostImproved({ ...options.scope, take: 200 })
      : options.scope.rankingType === "TRAINING_DAYS" ||
          options.scope.rankingType === "WORKOUTS_COMPLETED"
        ? await rankTrainingLeaders({ ...options.scope, take: 200 })
        : await rankMetricResults({ ...options.scope, take: 200 });
  const mine = rows.find((row) => row.athleteProfileId === options.athleteProfileId);
  if (!mine || rows.length < 3) return null;
  return {
    rank: mine.rank,
    fieldSize: rows.length,
    value: mine.value,
    unit: mine.unit,
    tied: mine.tied,
  };
}

export async function listLeaderboardMetrics(sport?: string | null) {
  return prisma.metricDefinition.findMany({
    where: {
      isActive: true,
      isSensitive: false,
      leaderboardEligible: true,
      ...(sport ? { sport: { equals: sport, mode: "insensitive" } } : {}),
    },
    orderBy: [{ sport: "asc" }, { name: "asc" }],
  });
}
