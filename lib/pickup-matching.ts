import {
  distanceMiles,
  parsePositions,
  positionMatches,
} from "@/lib/geocoding";
import { getLatestMetricForLabel } from "@/lib/player-profile";

export const PICKUP_TYPES = ["GUEST", "LOOKING_FOR_TEAM"] as const;
export type PickupType = (typeof PICKUP_TYPES)[number];

export const RADIUS_OPTIONS = [10, 25, 50, 100] as const;

export type NearbyPickupPlayer = {
  id: string;
  firstName: string;
  lastName: string;
  sport: string;
  position: string | null;
  pickupType: string | null;
  availabilityNotes: string | null;
  zipCode: string | null;
  cityLabel: string | null;
  distanceMiles: number;
  throwingVelo: number | null;
  batSpeed: number | null;
  exitVelo: number | null;
  coachName: string;
  alreadyInterested: boolean;
};

export type CoachPickupPreferences = {
  id: string;
  email: string;
  name: string;
  zipCode: string | null;
  latitude: number | null;
  longitude: number | null;
  searchRadiusMiles: number;
  pickupAlertsEnabled: boolean;
  lookingForSport: string | null;
  lookingForPositions: string | null;
  minThrowingVelo: number | null;
};

export function coachMatchesPickupPlayer(
  coach: CoachPickupPreferences,
  player: {
    sport: string;
    position: string | null;
    latitude: number | null;
    longitude: number | null;
    progressMetrics: { label: string; value: number; unit: string; recordedAt: Date }[];
  },
  playerLat: number,
  playerLng: number,
) {
  if (!coach.pickupAlertsEnabled) return false;
  if (coach.latitude == null || coach.longitude == null) return false;

  const miles = distanceMiles(coach.latitude, coach.longitude, playerLat, playerLng);
  if (miles > coach.searchRadiusMiles) return false;

  if (coach.lookingForSport && coach.lookingForSport !== player.sport) {
    return false;
  }

  const positions = parsePositions(coach.lookingForPositions);
  if (!positionMatches(player.position, positions)) {
    return false;
  }

  if (coach.minThrowingVelo != null) {
    const throwing = getLatestMetricForLabel(player.progressMetrics, "Throwing velo");
    if (!throwing || throwing.value < coach.minThrowingVelo) {
      return false;
    }
  }

  return true;
}

export function sortByDistance<T extends { distanceMiles: number }>(items: T[]) {
  return [...items].sort((a, b) => a.distanceMiles - b.distanceMiles);
}
