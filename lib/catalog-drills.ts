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
    orderBy: [{ sport: "asc" }, { ageBand: "asc" }, { sortOrder: "asc" }],
  });
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
  };
}

export async function getSuggestedDrills(options: {
  sport: string;
  dateOfBirth?: Date | null;
  ageBandId?: AgeBandId;
  limit?: number;
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
    },
    orderBy: { sortOrder: "asc" },
    take: options.limit ?? 3,
  });

  if (rows.length > 0) {
    return {
      band,
      drills: rows.map(toDrill),
      sportLabel: options.sport.trim() || "Multi-sport",
    };
  }

  return getBuiltInSuggestedDrills(options);
}

export async function listCatalogDrillsForSport(sport: string) {
  await seedCatalogDrillsIfEmpty();
  const rows = await prisma.catalogDrill.findMany({
    where: {
      isActive: true,
      sport: { equals: sport, mode: "insensitive" },
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
