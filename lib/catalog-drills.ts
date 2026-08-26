import { prisma } from "@/lib/db";
import {
  AGE_BANDS,
  ageBandFromAge,
  ageFromDateOfBirth,
  getSuggestedDrills as getBuiltInSuggestedDrills,
  listAllBuiltInDrills,
  listCatalogDrillsForSport as listBuiltInCatalog,
  type AgeBandId,
  type Drill,
} from "@/lib/drills";
import { SPORTS } from "@/lib/athletes";

export const CATALOG_SPORTS = SPORTS.filter((sport) => sport !== "Other");

export async function seedCatalogDrillsIfEmpty() {
  const count = await prisma.catalogDrill.count();
  if (count > 0) return { inserted: 0 };
  const rows = listAllBuiltInDrills();
  await prisma.catalogDrill.createMany({
    data: rows.map((row, index) => ({
      sport: row.sport,
      ageBand: row.ageBandId,
      title: row.drill.title,
      focus: row.drill.focus,
      durationMin: row.drill.durationMin,
      equipment: row.drill.equipment,
      howTo: row.drill.howTo,
      coachingCue: row.drill.coachingCue,
      sortOrder: index,
    })),
  });
  return { inserted: rows.length };
}

export async function listCatalogDrills(options: {
  sport?: string;
  ageBand?: string;
}) {
  await seedCatalogDrillsIfEmpty();
  return prisma.catalogDrill.findMany({
    where: {
      isActive: true,
      ...(options.sport ? { sport: options.sport } : {}),
      ...(options.ageBand ? { ageBand: options.ageBand } : {}),
    },
    include: {
      athleteRecipients: { select: { athleteProfileId: true } },
    },
    orderBy: [{ sport: "asc" }, { ageBand: "asc" }, { sortOrder: "asc" }],
  });
}

export async function listCatalogRecipientAthletes(sport?: string) {
  const rows = await prisma.athleteProfile.findMany({
    where: sport
      ? {
          OR: [
            {
              sports: {
                some: { sport: { equals: sport, mode: "insensitive" } },
              },
            },
            { primarySport: { equals: sport, mode: "insensitive" } },
            {
              legacyAthlete: {
                is: { sport: { equals: sport, mode: "insensitive" } },
              },
            },
          ],
        }
      : undefined,
    include: {
      sports: { select: { sport: true } },
      legacyAthlete: { select: { sport: true } },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  return rows.map((athlete) => ({
    id: athlete.id,
    name: `${athlete.firstName} ${athlete.lastName}`,
    sports: [
      ...new Set([
        ...athlete.sports.map((item) => item.sport),
        ...(athlete.primarySport ? [athlete.primarySport] : []),
        ...(athlete.legacyAthlete?.sport
          ? [athlete.legacyAthlete.sport]
          : []),
      ]),
    ],
  }));
}

function toDrill(row: {
  id: string;
  title: string;
  focus: string;
  durationMin: number;
  equipment: string;
  howTo: string;
  coachingCue: string;
  videoUrl?: string | null;
  sport?: string;
}): Drill {
  return {
    id: row.id,
    title: row.title,
    focus: row.focus,
    durationMin: row.durationMin,
    equipment: row.equipment,
    howTo: row.howTo,
    coachingCue: row.coachingCue,
    videoUrl: row.videoUrl,
    sport: row.sport,
  };
}

export async function getSuggestedDrills(options: {
  sport: string;
  dateOfBirth?: Date | null;
  ageBandId?: AgeBandId;
  limit?: number;
  audience?: "coaches" | "athletes";
  athleteProfileId?: string;
}) {
  await seedCatalogDrillsIfEmpty();
  const age =
    options.ageBandId != null
      ? null
      : ageFromDateOfBirth(options.dateOfBirth ?? null);
  const band = options.ageBandId
    ? AGE_BANDS.find((item) => item.id === options.ageBandId) ??
      ageBandFromAge(age)
    : ageBandFromAge(age);

  const rows = await prisma.catalogDrill.findMany({
    where: {
      isActive: true,
      ageBand: band.id,
      sport: { equals: options.sport, mode: "insensitive" },
      ...(options.audience === "coaches"
        ? { shareWithCoaches: true }
        : options.audience === "athletes"
          ? {
              shareWithAthletes: true,
              OR: [
                { athleteAudience: "ALL_SPORT" },
                ...(options.athleteProfileId
                  ? [
                      {
                        athleteAudience: "SELECTED",
                        athleteRecipients: {
                          some: {
                            athleteProfileId: options.athleteProfileId,
                          },
                        },
                      },
                    ]
                  : []),
              ],
            }
          : {}),
    },
    orderBy: [{ updatedAt: "desc" }, { sortOrder: "asc" }],
    take: options.limit ?? 3,
  });

  if (rows.length > 0) {
    return {
      band,
      drills: rows.map(toDrill),
      sportLabel: options.sport.trim() || "Multi-sport",
    };
  }

  const catalogCount = await prisma.catalogDrill.count({
    where: {
      isActive: true,
      ageBand: band.id,
      sport: { equals: options.sport, mode: "insensitive" },
    },
  });
  if (catalogCount > 0 && options.audience) {
    return {
      band,
      drills: [],
      sportLabel: options.sport.trim() || "Multi-sport",
    };
  }

  return getBuiltInSuggestedDrills(options);
}

/** Suggestions for every sport on an athlete profile, two per sport. */
export async function getSuggestedDrillsForSports(options: {
  sports: string[];
  dateOfBirth?: Date | null;
  athleteProfileId: string;
}) {
  const sports = [...new Set(options.sports.map((sport) => sport.trim()).filter(Boolean))];
  const suggestions = await Promise.all(
    sports.map((sport) =>
      getSuggestedDrills({
        sport,
        dateOfBirth: options.dateOfBirth,
        limit: 2,
        audience: "athletes",
        athleteProfileId: options.athleteProfileId,
      }),
    ),
  );
  const first = suggestions[0];
  return {
    band: first?.band ?? ageBandFromAge(ageFromDateOfBirth(options.dateOfBirth)),
    sportLabel: sports.join(" & ") || "Multi-sport",
    drills: suggestions.flatMap((result, index) =>
      result.drills.map((drill) => ({
        ...drill,
        sport: drill.sport ?? sports[index],
      })),
    ),
  };
}

export async function listCatalogDrillsForSport(sport: string) {
  await seedCatalogDrillsIfEmpty();
  const rows = await prisma.catalogDrill.findMany({
    where: {
      isActive: true,
      sport: { equals: sport, mode: "insensitive" },
      shareWithCoaches: true,
    },
    orderBy: [{ ageBand: "asc" }, { sortOrder: "asc" }],
  });
  if (rows.length === 0) {
    return listBuiltInCatalog(sport);
  }
  return rows.map((row) => ({
    ageBandId: row.ageBand as AgeBandId,
    ageBandLabel:
      AGE_BANDS.find((band) => band.id === row.ageBand)?.label ?? row.ageBand,
    drill: toDrill(row),
  }));
}

export type { AgeBandId, Drill } from "@/lib/drills";
