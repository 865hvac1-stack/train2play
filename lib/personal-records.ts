import { MetricSource } from "@/lib/generated/prisma/client";

import { prisma } from "@/lib/db";

export type ResultKind = "NONE" | "NUMBER" | "RATIO" | "COUNT" | "TIME" | "WEIGHT";

export function isPersonalRecord(options: {
  direction: "HIGHER_IS_BETTER" | "LOWER_IS_BETTER" | string;
  newValue: number;
  previousBest: number | null;
}) {
  if (options.previousBest == null) return true;
  if (
    options.direction === "LOWER_IS_BETTER" ||
    options.direction === "LOWER"
  ) {
    return options.newValue < options.previousBest;
  }
  return options.newValue > options.previousBest;
}

export async function getBestMetricValue(
  athleteProfileId: string,
  metricDefinitionId: string,
) {
  const def = await prisma.metricDefinition.findUnique({
    where: { id: metricDefinitionId },
  });
  if (!def) return null;

  const entries = await prisma.metricEntry.findMany({
    where: {
      athleteProfileId,
      metricDefinitionId,
      resultStatus: { in: ["ACTIVE"] },
    },
    select: { value: true },
  });
  if (entries.length === 0) return null;

  const values = entries.map((e) => e.value);
  return def.direction === "LOWER_IS_BETTER"
    ? Math.min(...values)
    : Math.max(...values);
}

/** Write MetricEntry + ProgressMetric dual-write; return whether it is a PR. */
export async function recordPerformanceMetric(options: {
  athleteId: string;
  athleteProfileId: string;
  metricDefinitionId: string;
  value: number;
  enteredByUserId: string;
  notes?: string | null;
}) {
  const def = await prisma.metricDefinition.findUnique({
    where: { id: options.metricDefinitionId },
  });
  if (!def) {
    throw new Error("Metric definition not found");
  }

  const previousBest = await getBestMetricValue(
    options.athleteProfileId,
    options.metricDefinitionId,
  );
  const pr = isPersonalRecord({
    direction: def.direction,
    newValue: options.value,
    previousBest,
  });

  const legacy = await prisma.progressMetric.create({
    data: {
      athleteId: options.athleteId,
      label: def.name,
      value: options.value,
      unit: def.unit,
      notes: options.notes?.trim() || (pr ? "Personal record" : null),
      recordedAt: new Date(),
    },
  });

  const entry = await prisma.metricEntry.create({
    data: {
      athleteProfileId: options.athleteProfileId,
      metricDefinitionId: def.id,
      value: options.value,
      source: MetricSource.SELF_REPORTED,
      verificationType: "SELF_REPORTED",
      resultStatus: "ACTIVE",
      resultSource: "SELF_REPORTED",
      enteredByUserId: options.enteredByUserId,
      notes: options.notes?.trim() || null,
      legacyMetricId: legacy.id,
      recordedAt: new Date(),
    },
  });

  if (pr && previousBest != null) {
    const { awardAchievement } = await import("@/lib/community/achievements");
    await awardAchievement({
      athleteProfileId: options.athleteProfileId,
      key: "NEW_PR",
      occurrenceKey: `NEW_PR:${def.id}:${entry.id}`,
      metadata: {
        metric: def.name,
        value: options.value,
        unit: def.unit,
      },
    });
  }

  const { invalidateRankingCache } = await import("@/lib/community/ranking");
  invalidateRankingCache();

  return {
    metricEntryId: entry.id,
    isPersonalRecord: pr && previousBest != null,
    definition: def,
    previousBest,
  };
}
