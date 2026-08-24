import { MetricSource } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import { resolveMetricSlug } from "@/lib/metrics/definitions";

async function findOrCreateMetricDefinition(
  label: string,
  sport: string,
  unit: string,
) {
  const slug = resolveMetricSlug(label, sport);

  const existing = await prisma.metricDefinition.findUnique({
    where: {
      sport_slug: {
        sport,
        slug,
      },
    },
  });

  if (existing) return existing;

  return prisma.metricDefinition.create({
    data: {
      sport,
      slug,
      name: label.trim(),
      category: "custom",
      unit,
      direction: unit === "sec" ? "LOWER_IS_BETTER" : "HIGHER_IS_BETTER",
      inputType: unit === "%" ? "percentage" : "number",
    },
  });
}

/** Dual-write a ProgressMetric row to MetricEntry when an athlete profile exists. */
export async function syncMetricEntryForProgressMetric(
  progressMetricId: string,
  athleteId: string,
  coachUserId: string,
  label: string,
  sport: string,
  unit: string,
  value: number,
  recordedAt: Date,
  notes: string | null,
) {
  const profile = await prisma.athleteProfile.findUnique({
    where: { legacyAthleteId: athleteId },
    select: { id: true },
  });

  if (!profile) return null;

  const definition = await findOrCreateMetricDefinition(label, sport, unit);

  const existing = await prisma.metricEntry.findUnique({
    where: { legacyMetricId: progressMetricId },
  });

  if (existing) return existing;

  return prisma.metricEntry.create({
    data: {
      athleteProfileId: profile.id,
      metricDefinitionId: definition.id,
      value,
      recordedAt,
      source: MetricSource.COACH_ENTERED,
      enteredByUserId: coachUserId,
      notes,
      legacyMetricId: progressMetricId,
    },
  });
}
