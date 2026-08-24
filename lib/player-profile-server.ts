import { prisma } from "@/lib/db";
import {
  computePercentile,
  getLatestMetricForLabel,
  normalizeMetricLabel,
  PROFILE_METRICS,
  type ProfileStatComparison,
} from "@/lib/player-profile";

export async function getSystemMetricSamples(label: string, unit: string) {
  const normalized = normalizeMetricLabel(label);
  const metrics = await prisma.progressMetric.findMany({
    where: { unit },
    select: {
      athleteId: true,
      label: true,
      value: true,
      recordedAt: true,
    },
    orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
  });

  const latestByAthlete = new Map<string, number>();

  for (const metric of metrics) {
    if (normalizeMetricLabel(metric.label) !== normalized) continue;
    if (!latestByAthlete.has(metric.athleteId)) {
      latestByAthlete.set(metric.athleteId, metric.value);
    }
  }

  return Array.from(latestByAthlete.values());
}

export async function getSystemBenchmarks() {
  const benchmarks: Record<
    string,
    { average: number | null; sampleSize: number; unit: string; direction: "HIGHER" | "LOWER" }
  > = {};

  for (const metric of PROFILE_METRICS) {
    const samples = await getSystemMetricSamples(metric.label, metric.unit);
    benchmarks[metric.label] = {
      average:
        samples.length > 0
          ? samples.reduce((sum, value) => sum + value, 0) / samples.length
          : null,
      sampleSize: samples.length,
      unit: metric.unit,
      direction: metric.direction,
    };
  }

  return benchmarks;
}

export async function getAthleteProfileComparisons(
  metrics: {
    label: string;
    value: number;
    unit: string;
    recordedAt: Date;
  }[],
): Promise<ProfileStatComparison[]> {
  const benchmarks = await getSystemBenchmarks();
  const resolved: ProfileStatComparison[] = [];

  for (const config of PROFILE_METRICS) {
    const latest = getLatestMetricForLabel(metrics, config.label);
    const benchmark = benchmarks[config.label];
    const value = latest?.value ?? null;
    const systemAverage = benchmark?.average ?? null;
    const delta =
      value !== null && systemAverage !== null ? value - systemAverage : null;
    const samples = await getSystemMetricSamples(config.label, config.unit);

    resolved.push({
      label: config.label,
      shortLabel: config.shortLabel,
      unit: config.unit,
      direction: config.direction,
      value,
      recordedAt: latest?.recordedAt ?? null,
      systemAverage,
      sampleSize: benchmark?.sampleSize ?? 0,
      delta,
      percentile:
        value !== null ? computePercentile(value, samples, config.direction) : null,
    });
  }

  return resolved;
}

export async function getPickupPlayersForCoach(coachId: string) {
  return prisma.athlete.findMany({
    where: { coachId, rosterStatus: "PICKUP" },
    orderBy: [{ updatedAt: "desc" }],
    include: {
      progressMetrics: {
        orderBy: [{ recordedAt: "desc" }],
        take: 8,
      },
    },
  });
}

export async function getRosterAthletesForCoach(coachId: string) {
  return prisma.athlete.findMany({
    where: { coachId, rosterStatus: "ROSTER" },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}
