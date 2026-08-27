import { prisma } from "@/lib/db";
import {
  AGE_BANDS,
  ageBandFromAge,
  ageFromDateOfBirth,
  type AgeBandId,
  type Drill,
} from "@/lib/drills";
import { SPORTS } from "@/lib/athletes";

export const CATALOG_SPORTS = SPORTS.filter((sport) => sport !== "Other");

export async function listCatalogDrills(options: {
  sport?: string;
  ageBand?: string;
}) {
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

/** Match athletes who play a sport through profile sports, primary sport, or legacy roster. */
export function athleteSportWhere(sport: string) {
  return {
    OR: [
      {
        sports: {
          some: { sport: { equals: sport, mode: "insensitive" as const } },
        },
      },
      { primarySport: { equals: sport, mode: "insensitive" as const } },
      {
        legacyAthlete: {
          is: { sport: { equals: sport, mode: "insensitive" as const } },
        },
      },
    ],
  };
}

export async function listCatalogRecipientAthletes(sport?: string) {
  const rows = await prisma.athleteProfile.findMany({
    where: sport ? athleteSportWhere(sport) : undefined,
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

function toDrill(
  row: {
    id: string;
    title: string;
    focus: string;
    durationMin: number;
    equipment: string;
    howTo: string;
    coachingCue: string;
    videoUrl?: string | null;
    sport?: string;
  },
  sent?: { byName: string | null; at: Date | null },
): Drill {
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
    sentByName: sent?.byName ?? null,
    sentAt: sent?.at ?? null,
  };
}

/**
 * Drills a director or coach sent straight to this athlete. Age band is a
 * relevance hint for browsing, so it must never hide a targeted send.
 */
async function getDirectSendsForAthlete(options: {
  sport: string;
  athleteProfileId: string;
  limit: number;
}) {
  const [pushes, selected] = await Promise.all([
    prisma.catalogDrillPush.findMany({
      where: {
        athleteProfileId: options.athleteProfileId,
        catalogDrill: {
          isActive: true,
          sport: { equals: options.sport, mode: "insensitive" },
        },
      },
      include: {
        catalogDrill: true,
        pushedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: options.limit,
    }),
    prisma.catalogDrill.findMany({
      where: {
        isActive: true,
        sport: { equals: options.sport, mode: "insensitive" },
        shareWithAthletes: true,
        athleteAudience: "SELECTED",
        athleteRecipients: {
          some: { athleteProfileId: options.athleteProfileId },
        },
      },
      orderBy: [{ updatedAt: "desc" }, { sortOrder: "asc" }],
      take: options.limit,
    }),
  ]);

  const drills: Drill[] = [];
  const seen = new Set<string>();
  for (const push of pushes) {
    if (seen.has(push.catalogDrillId)) continue;
    seen.add(push.catalogDrillId);
    drills.push(
      toDrill(push.catalogDrill, {
        byName: push.pushedBy?.name ?? null,
        at: push.createdAt,
      }),
    );
  }
  for (const drill of selected) {
    if (seen.has(drill.id)) continue;
    seen.add(drill.id);
    drills.push(toDrill(drill));
  }
  return drills.slice(0, options.limit);
}

export async function getSuggestedDrills(options: {
  sport: string;
  dateOfBirth?: Date | null;
  ageBandId?: AgeBandId;
  limit?: number;
  audience?: "coaches" | "athletes";
  athleteProfileId?: string;
}) {
  const age =
    options.ageBandId != null
      ? null
      : ageFromDateOfBirth(options.dateOfBirth ?? null);
  const band = options.ageBandId
    ? AGE_BANDS.find((item) => item.id === options.ageBandId) ??
      ageBandFromAge(age)
    : ageBandFromAge(age);

  const limit = options.limit ?? 3;
  const directSends =
    options.audience === "athletes" && options.athleteProfileId
      ? await getDirectSendsForAthlete({
          sport: options.sport,
          athleteProfileId: options.athleteProfileId,
          limit,
        })
      : [];

  const rows =
    directSends.length >= limit
      ? []
      : await prisma.catalogDrill.findMany({
          where: {
            isActive: true,
            ageBand: band.id,
            sport: { equals: options.sport, mode: "insensitive" },
            id: { notIn: directSends.map((drill) => drill.id) },
            ...(options.audience === "coaches"
              ? { shareWithCoaches: true }
              : options.audience === "athletes"
                ? { shareWithAthletes: true, athleteAudience: "ALL_SPORT" }
                : {}),
          },
          orderBy: [{ updatedAt: "desc" }, { sortOrder: "asc" }],
          take: limit - directSends.length,
        });

  const drills = [...directSends, ...rows.map((row) => toDrill(row))];
  return {
    band,
    drills,
    sportLabel: options.sport.trim() || "Multi-sport",
  };
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

/** One published drill an athlete is allowed to open from Recommended. */
export async function getCatalogDrillForAthlete(options: {
  drillId: string;
  athleteProfileId: string;
  sports: string[];
}) {
  const sports = [
    ...new Set(options.sports.map((sport) => sport.trim()).filter(Boolean)),
  ];
  const sportFilter =
    sports.length > 0
      ? {
          OR: sports.map((sport) => ({
            sport: { equals: sport, mode: "insensitive" as const },
          })),
        }
      : undefined;

  const row = await prisma.catalogDrill.findFirst({
    where: {
      id: options.drillId,
      isActive: true,
      AND: [
        sportFilter ?? {},
        {
          OR: [
            {
              shareWithAthletes: true,
              athleteAudience: "ALL_SPORT",
            },
            {
              shareWithAthletes: true,
              athleteAudience: "SELECTED",
              athleteRecipients: {
                some: { athleteProfileId: options.athleteProfileId },
              },
            },
            {
              pushes: {
                some: { athleteProfileId: options.athleteProfileId },
              },
            },
          ],
        },
      ],
    },
    include: {
      pushes: {
        where: { athleteProfileId: options.athleteProfileId },
        include: { pushedBy: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  if (!row) return null;

  const latestPush = row.pushes[0];
  return {
    ...toDrill(
      row,
      latestPush
        ? { byName: latestPush.pushedBy?.name ?? null, at: latestPush.createdAt }
        : undefined,
    ),
    ageBand: row.ageBand,
  };
}

export async function listCatalogDrillsForSport(sport: string) {
  const rows = await prisma.catalogDrill.findMany({
    where: {
      isActive: true,
      sport: { equals: sport, mode: "insensitive" },
      shareWithCoaches: true,
    },
    orderBy: [{ ageBand: "asc" }, { sortOrder: "asc" }],
  });
  return rows.map((row) => ({
    ageBandId: row.ageBand as AgeBandId,
    ageBandLabel:
      AGE_BANDS.find((band) => band.id === row.ageBand)?.label ?? row.ageBand,
    drill: toDrill(row),
  }));
}

export type { AgeBandId, Drill } from "@/lib/drills";
