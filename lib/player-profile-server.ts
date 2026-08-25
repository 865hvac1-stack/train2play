import { prisma } from "@/lib/db";
import {
  computePercentile,
  getLatestMetricForLabel,
  normalizeMetricLabel,
  PROFILE_METRICS,
  type ProfileStatComparison,
} from "@/lib/player-profile";

export async function getSystemMetricSamples(
  label: string,
  unit: string,
  sport?: string,
) {
  const normalized = normalizeMetricLabel(label);
  const metrics = await prisma.progressMetric.findMany({
    where: {
      unit,
      ...(sport ? { athlete: { sport } } : {}),
    },
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

export async function getSystemBenchmarks(sport?: string) {
  const benchmarks: Record<
    string,
    { average: number | null; sampleSize: number; unit: string; direction: "HIGHER" | "LOWER" }
  > = {};

  for (const metric of PROFILE_METRICS) {
    const samples = await getSystemMetricSamples(metric.label, metric.unit, sport);
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
  sport?: string,
): Promise<ProfileStatComparison[]> {
  const benchmarks = await getSystemBenchmarks(sport);
  const resolved: ProfileStatComparison[] = [];

  for (const config of PROFILE_METRICS) {
    const latest = getLatestMetricForLabel(metrics, config.label);
    const benchmark = benchmarks[config.label];
    const value = latest?.value ?? null;
    const systemAverage = benchmark?.average ?? null;
    const delta =
      value !== null && systemAverage !== null ? value - systemAverage : null;
    const samples = await getSystemMetricSamples(config.label, config.unit, sport);

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
  const [owned, connected] = await Promise.all([
    prisma.athlete.findMany({
      where: { coachId, rosterStatus: "ROSTER" },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      include: {
        trainingPlans: {
          where: { status: "ACTIVE" },
          orderBy: { updatedAt: "desc" },
          take: 1,
          include: {
            workouts: {
              select: { completed: true, completedAt: true, title: true },
            },
          },
        },
        workoutSessions: {
          where: { status: "COMPLETED" },
          orderBy: { completedAt: "desc" },
          take: 1,
          select: {
            completedAt: true,
            workout: { select: { title: true } },
          },
        },
      },
    }),
    prisma.coachAthleteConnection.findMany({
      where: {
        coachUserId: coachId,
        status: "APPROVED",
      },
      include: {
        athleteProfile: {
          include: {
            legacyAthlete: {
              include: {
                trainingPlans: {
                  where: { status: "ACTIVE" },
                  orderBy: { updatedAt: "desc" },
                  take: 1,
                  include: {
                    workouts: {
                      select: {
                        completed: true,
                        completedAt: true,
                        title: true,
                      },
                    },
                  },
                },
                workoutSessions: {
                  where: { status: "COMPLETED" },
                  orderBy: { completedAt: "desc" },
                  take: 1,
                  select: {
                    completedAt: true,
                    workout: { select: { title: true } },
                  },
                },
              },
            },
            sports: { where: { isPrimary: true }, take: 1 },
          },
        },
      },
    }),
  ]);

  const byId = new Map<
    string,
    {
      id: string;
      firstName: string;
      lastName: string;
      sport: string;
      position: string | null;
      dateOfBirth: Date | null;
      activeProgram: string | null;
      completionPercent: number | null;
      completedWorkouts: number;
      totalWorkouts: number;
      lastWorkoutTitle: string | null;
      lastActivityAt: Date | null;
    }
  >();

  function mapAthlete(athlete: {
    id: string;
    firstName: string;
    lastName: string;
    sport: string;
    position: string | null;
    dateOfBirth: Date | null;
    trainingPlans: {
      title: string;
      workouts: {
        completed: boolean;
        completedAt: Date | null;
        title: string;
      }[];
    }[];
    workoutSessions: {
      completedAt: Date | null;
      workout: { title: string };
    }[];
  }) {
    const plan = athlete.trainingPlans[0] ?? null;
    const total = plan?.workouts.length ?? 0;
    const completed = plan?.workouts.filter((w) => w.completed).length ?? 0;
    const lastSession = athlete.workoutSessions[0] ?? null;
    const lastWorkoutFromPlan = plan?.workouts
      .filter((w) => w.completed && w.completedAt)
      .sort(
        (a, b) =>
          (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0),
      )[0];

    byId.set(athlete.id, {
      id: athlete.id,
      firstName: athlete.firstName,
      lastName: athlete.lastName,
      sport: athlete.sport,
      position: athlete.position,
      dateOfBirth: athlete.dateOfBirth,
      activeProgram: plan?.title ?? null,
      completionPercent:
        total > 0 ? Math.round((completed / total) * 100) : null,
      completedWorkouts: completed,
      totalWorkouts: total,
      lastWorkoutTitle:
        lastSession?.workout.title ?? lastWorkoutFromPlan?.title ?? null,
      lastActivityAt:
        lastSession?.completedAt ?? lastWorkoutFromPlan?.completedAt ?? null,
    });
  }

  for (const athlete of owned) {
    mapAthlete(athlete);
  }

  for (const connection of connected) {
    const legacy = connection.athleteProfile.legacyAthlete;
    if (legacy && legacy.rosterStatus === "ROSTER") {
      mapAthlete(legacy);
    }
  }

  return Array.from(byId.values()).sort((a, b) => {
    const last = a.lastName.localeCompare(b.lastName);
    return last !== 0 ? last : a.firstName.localeCompare(b.firstName);
  });
}

export async function getListedPickupPlayerForView(id: string) {
  return prisma.athlete.findFirst({
    where: {
      id,
      rosterStatus: "PICKUP",
      listedForPickup: true,
    },
    include: {
      coach: { select: { id: true, name: true } },
      progressMetrics: {
        orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
      },
      pickupInterests: {
        select: { interestedCoachId: true },
      },
    },
  });
}
