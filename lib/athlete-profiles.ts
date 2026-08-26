import { prisma } from "@/lib/db";
import { getDefaultOrganization } from "@/lib/organizations";
import { replaceAthleteSports } from "@/lib/athlete-sports";

type AthleteRecord = {
  id: string;
  coachId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date | null;
  sport: string;
  position: string | null;
};

/** Creates or updates AthleteProfile + membership for a legacy Athlete row. */
export async function syncAthleteProfile(
  athlete: AthleteRecord,
  extraSports: string[] = [],
) {
  const organization = await getDefaultOrganization();
  const sports = [...new Set([athlete.sport, ...extraSports.filter(Boolean)])];

  const existing = await prisma.athleteProfile.findUnique({
    where: { legacyAthleteId: athlete.id },
  });

  const profile =
    existing ??
    (await prisma.athleteProfile.create({
      data: {
        firstName: athlete.firstName,
        lastName: athlete.lastName,
        dateOfBirth: athlete.dateOfBirth,
        primarySport: athlete.sport,
        legacyAthleteId: athlete.id,
        sports: {
          create: sports.map((sport) => ({
            sport,
            position: sport === athlete.sport ? athlete.position : null,
            isPrimary: sport === athlete.sport,
          })),
        },
      },
    }));

  if (existing) {
    await prisma.athleteProfile.update({
      where: { id: profile.id },
      data: {
        firstName: athlete.firstName,
        lastName: athlete.lastName,
        dateOfBirth: athlete.dateOfBirth,
        primarySport: athlete.sport,
      },
    });

    await replaceAthleteSports({
      athleteProfileId: profile.id,
      sports,
      primarySport: athlete.sport,
      position: athlete.position,
      legacyAthleteId: athlete.id,
    });
  }

  const membership = await prisma.athleteMembership.findFirst({
    where: {
      athleteProfileId: profile.id,
      organizationId: organization.id,
      coachUserId: athlete.coachId,
      endsAt: null,
    },
  });

  if (!membership) {
    await prisma.athleteMembership.create({
      data: {
        athleteProfileId: profile.id,
        organizationId: organization.id,
        coachUserId: athlete.coachId,
      },
    });
  }

  return profile;
}
