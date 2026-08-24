import { prisma } from "@/lib/db";
import { distanceMiles, parsePositions, positionMatches } from "@/lib/geocoding";
import {
  coachMatchesPickupPlayer,
  sortByDistance,
  type NearbyPickupPlayer,
} from "@/lib/pickup-matching";
import { getLatestMetricForLabel } from "@/lib/player-profile";

export async function getNearbyPickupPlayersForCoach(coachId: string) {
  const coach = await prisma.user.findUnique({
    where: { id: coachId },
    select: {
      id: true,
      latitude: true,
      longitude: true,
      searchRadiusMiles: true,
      lookingForSport: true,
      lookingForPositions: true,
      minThrowingVelo: true,
    },
  });

  if (!coach?.latitude || !coach?.longitude) {
    return { players: [] as NearbyPickupPlayer[], needsZip: true };
  }

  const [pickupPlayers, interests] = await Promise.all([
    prisma.athlete.findMany({
      where: {
        rosterStatus: "PICKUP",
        listedForPickup: true,
        latitude: { not: null },
        longitude: { not: null },
        NOT: { coachId },
      },
      include: {
        coach: { select: { name: true } },
        progressMetrics: { orderBy: { recordedAt: "desc" } },
      },
    }),
    prisma.pickupInterest.findMany({
      where: { interestedCoachId: coachId },
      select: { pickupAthleteId: true },
    }),
  ]);

  const interestedIds = new Set(interests.map((item) => item.pickupAthleteId));

  const players: NearbyPickupPlayer[] = [];

  for (const player of pickupPlayers) {
    if (player.latitude == null || player.longitude == null) continue;

    const miles = distanceMiles(
      coach.latitude,
      coach.longitude,
      player.latitude,
      player.longitude,
    );

    if (miles > coach.searchRadiusMiles) continue;

    if (coach.lookingForSport && coach.lookingForSport !== player.sport) continue;

    const positions = parsePositions(coach.lookingForPositions);
    if (!positionMatches(player.position, positions)) continue;

    const throwing = getLatestMetricForLabel(player.progressMetrics, "Throwing velo");
    if (coach.minThrowingVelo != null) {
      if (!throwing || throwing.value < coach.minThrowingVelo) continue;
    }

    players.push({
      id: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      sport: player.sport,
      position: player.position,
      pickupType: player.pickupType,
      availabilityNotes: player.availabilityNotes,
      zipCode: player.zipCode,
      cityLabel: player.zipCode,
      distanceMiles: miles,
      throwingVelo: throwing?.value ?? null,
      batSpeed: getLatestMetricForLabel(player.progressMetrics, "Bat speed")?.value ?? null,
      exitVelo: getLatestMetricForLabel(player.progressMetrics, "Exit velo")?.value ?? null,
      coachName: player.coach.name,
      alreadyInterested: interestedIds.has(player.id),
    });
  }

  return { players: sortByDistance(players), needsZip: false };
}

export async function findCoachesToNotifyForPickupPlayer(
  pickupAthleteId: string,
  listingCoachId: string,
) {
  const player = await prisma.athlete.findUnique({
    where: { id: pickupAthleteId },
    include: { progressMetrics: { orderBy: { recordedAt: "desc" } } },
  });

  if (!player?.latitude || !player?.longitude) {
    return [];
  }

  const coaches = await prisma.user.findMany({
    where: {
      pickupAlertsEnabled: true,
      latitude: { not: null },
      longitude: { not: null },
      NOT: { id: listingCoachId },
    },
    select: {
      id: true,
      email: true,
      name: true,
      zipCode: true,
      latitude: true,
      longitude: true,
      searchRadiusMiles: true,
      pickupAlertsEnabled: true,
      lookingForSport: true,
      lookingForPositions: true,
      minThrowingVelo: true,
    },
  });

  return coaches.filter((coach) =>
    coachMatchesPickupPlayer(coach, player, player.latitude!, player.longitude!),
  );
}
