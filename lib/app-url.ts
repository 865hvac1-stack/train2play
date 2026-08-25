import { getAppUrl } from "@/lib/env";

export function getAppBaseUrl() {
  return getAppUrl();
}

export function getAthleteProfileUrl(athleteId: string) {
  return `${getAppBaseUrl()}/athletes/${athleteId}`;
}

/** Public pickup listing view for coaches who do not own the athlete. */
export function getPickupProfileUrl(athleteId: string) {
  return `${getAppBaseUrl()}/pickup-players/${athleteId}`;
}

export function getNearbyPickupUrl() {
  return `${getAppBaseUrl()}/pickup-players/nearby`;
}
