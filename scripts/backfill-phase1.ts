import "dotenv/config";

import { MetricSource } from "@/lib/generated/prisma/client";
import { createPrismaClient } from "@/lib/db";
import {
  LEGACY_METRIC_LABEL_MAP,
  METRIC_DEFINITIONS,
  normalizeMetricLabel,
  resolveMetricSlug,
} from "@/lib/metrics/definitions";
import { UserRole } from "@/lib/generated/prisma/client";
import {
  DEFAULT_ORG_NAME,
  DEFAULT_ORG_SLUG,
  ensureDefaultOrganization,
  ensureOrganizationMembership,
} from "@/lib/organizations";

const prisma = createPrismaClient();

export async function seedMetricDefinitions() {
  for (const definition of METRIC_DEFINITIONS) {
    await prisma.metricDefinition.upsert({
      where: {
        sport_slug: {
          sport: definition.sport,
          slug: definition.slug,
        },
      },
      update: {
        name: definition.name,
        category: definition.category,
        unit: definition.unit,
        direction: definition.direction,
        inputType: definition.inputType ?? "number",
        isActive: true,
      },
      create: {
        sport: definition.sport,
        slug: definition.slug,
        name: definition.name,
        category: definition.category,
        unit: definition.unit,
        direction: definition.direction,
        inputType: definition.inputType ?? "number",
      },
    });
  }
}

async function findMetricDefinitionForLegacyMetric(
  label: string,
  sport: string,
  unit: string,
) {
  const slug = resolveMetricSlug(label, sport);
  const bySlug = await prisma.metricDefinition.findUnique({
    where: {
      sport_slug: {
        sport,
        slug,
      },
    },
  });
  if (bySlug) return bySlug;

  const normalized = normalizeMetricLabel(label);
  const mappedSlug = LEGACY_METRIC_LABEL_MAP[normalized];
  if (mappedSlug) {
    const mapped = await prisma.metricDefinition.findUnique({
      where: {
        sport_slug: {
          sport,
          slug: mappedSlug,
        },
      },
    });
    if (mapped) return mapped;
  }

  return prisma.metricDefinition.upsert({
    where: {
      sport_slug: {
        sport,
        slug,
      },
    },
    update: {},
    create: {
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

export async function backfillAthleteProfiles() {
  const organization = await ensureDefaultOrganization();
  const athletes = await prisma.athlete.findMany({
    include: {
      athleteProfile: true,
      coach: { select: { id: true } },
    },
  });

  let created = 0;
  let memberships = 0;

  for (const athlete of athletes) {
    await ensureOrganizationMembership(athlete.coachId);

    let profile = athlete.athleteProfile;

    if (!profile) {
      profile = await prisma.athleteProfile.create({
        data: {
          firstName: athlete.firstName,
          lastName: athlete.lastName,
          dateOfBirth: athlete.dateOfBirth,
          primarySport: athlete.sport,
          legacyAthleteId: athlete.id,
          sports: {
            create: {
              sport: athlete.sport,
              position: athlete.position,
              isPrimary: true,
            },
          },
        },
      });
      created += 1;
    }

    const existingMembership = await prisma.athleteMembership.findFirst({
      where: {
        athleteProfileId: profile.id,
        organizationId: organization.id,
        coachUserId: athlete.coachId,
        endsAt: null,
      },
    });

    if (!existingMembership) {
      await prisma.athleteMembership.create({
        data: {
          athleteProfileId: profile.id,
          organizationId: organization.id,
          coachUserId: athlete.coachId,
        },
      });
      memberships += 1;
    }
  }

  return { athletes: athletes.length, profilesCreated: created, membershipsCreated: memberships };
}

export async function backfillMetricEntries() {
  const metrics = await prisma.progressMetric.findMany({
    where: {
      metricEntry: null,
    },
    include: {
      athlete: {
        select: {
          id: true,
          sport: true,
          coachId: true,
          athleteProfile: { select: { id: true } },
        },
      },
    },
  });

  let created = 0;
  let skipped = 0;

  for (const metric of metrics) {
    const profileId = metric.athlete.athleteProfile?.id;
    if (!profileId) {
      skipped += 1;
      continue;
    }

    const definition = await findMetricDefinitionForLegacyMetric(
      metric.label,
      metric.athlete.sport,
      metric.unit,
    );

    await prisma.metricEntry.create({
      data: {
        athleteProfileId: profileId,
        metricDefinitionId: definition.id,
        value: metric.value,
        recordedAt: metric.recordedAt,
        source: MetricSource.COACH_ENTERED,
        enteredByUserId: metric.athlete.coachId,
        notes: metric.notes,
        legacyMetricId: metric.id,
      },
    });
    created += 1;
  }

  return { processed: metrics.length, created, skipped };
}

export async function backfillCoachOrganizationMemberships() {
  const coaches = await prisma.user.findMany({
    where: {
      role: {
        in: [
          UserRole.COACH,
          UserRole.ORG_ADMIN,
          UserRole.STAFF,
          UserRole.PLATFORM_ADMIN,
        ],
      },
    },
    select: { id: true },
  });

  let created = 0;
  for (const coach of coaches) {
    const membership = await ensureOrganizationMembership(coach.id);
    if (membership) created += 1;
  }

  return { coaches: coaches.length, membershipsEnsured: created };
}

export async function runPhase1Foundation() {
  console.log("Phase 1 foundation: seeding organization and metric definitions...");
  const organization = await ensureDefaultOrganization();
  console.log(`Organization ready: ${organization.name} (${organization.slug})`);

  await seedMetricDefinitions();
  console.log(`Metric definitions seeded: ${METRIC_DEFINITIONS.length} baseline definitions`);

  const coachResult = await backfillCoachOrganizationMemberships();
  console.log(
    `Coach org memberships: ${coachResult.membershipsEnsured}/${coachResult.coaches}`,
  );

  const athleteResult = await backfillAthleteProfiles();
  console.log(
    `Athlete profiles: ${athleteResult.profilesCreated} created, ${athleteResult.membershipsCreated} memberships from ${athleteResult.athletes} athletes`,
  );

  const metricResult = await backfillMetricEntries();
  console.log(
    `Metric entries: ${metricResult.created} created, ${metricResult.skipped} skipped (${metricResult.processed} legacy metrics)`,
  );

  return {
    organization: organization.slug,
    defaultOrg: DEFAULT_ORG_NAME,
    defaultSlug: DEFAULT_ORG_SLUG,
    ...athleteResult,
    ...metricResult,
  };
}

async function main() {
  const result = await runPhase1Foundation();
  console.log("Phase 1 foundation complete.", result);
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
