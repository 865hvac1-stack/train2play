import { prisma } from "@/lib/db";

export async function replaceAthleteSports(options: {
  athleteProfileId: string;
  sports: string[];
  primarySport: string;
  position?: string | null;
  secondaryPosition?: string | null;
  legacyAthleteId?: string | null;
}) {
  const sports = [...new Set(options.sports.filter(Boolean))];
  const primarySport = sports.includes(options.primarySport)
    ? options.primarySport
    : (sports[0] ?? null);
  if (!primarySport) {
    throw new Error("Select at least one sport");
  }

  await prisma.$transaction(async (tx) => {
    await tx.athleteProfile.update({
      where: { id: options.athleteProfileId },
      data: { primarySport },
    });

    await tx.athleteSport.deleteMany({
      where: {
        athleteProfileId: options.athleteProfileId,
        sport: { notIn: sports },
      },
    });

    for (const sport of sports) {
      await tx.athleteSport.upsert({
        where: {
          athleteProfileId_sport: {
            athleteProfileId: options.athleteProfileId,
            sport,
          },
        },
        update: {
          isPrimary: sport === primarySport,
          ...(sport === primarySport
            ? {
                position: options.position ?? undefined,
                secondaryPosition: options.secondaryPosition ?? undefined,
              }
            : {}),
        },
        create: {
          athleteProfileId: options.athleteProfileId,
          sport,
          isPrimary: sport === primarySport,
          position: sport === primarySport ? options.position ?? null : null,
          secondaryPosition:
            sport === primarySport ? options.secondaryPosition ?? null : null,
        },
      });
    }

    if (options.legacyAthleteId) {
      await tx.athlete.update({
        where: { id: options.legacyAthleteId },
        data: {
          sport: primarySport,
          ...(options.position !== undefined
            ? { position: options.position }
            : {}),
        },
      });
    }
  });
}
