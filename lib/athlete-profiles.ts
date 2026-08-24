import { prisma } from "@/lib/db";
import { getDefaultOrganization } from "@/lib/organizations";

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
export async function syncAthleteProfile(athlete: AthleteRecord) {
  const organization = await getDefaultOrganization();

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
          create: {
            sport: athlete.sport,
            position: athlete.position,
            isPrimary: true,
          },
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

    await prisma.athleteSport.upsert({
      where: {
        athleteProfileId_sport: {
          athleteProfileId: profile.id,
          sport: athlete.sport,
        },
      },
      update: {
        position: athlete.position,
        isPrimary: true,
      },
      create: {
        athleteProfileId: profile.id,
        sport: athlete.sport,
        position: athlete.position,
        isPrimary: true,
      },
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
