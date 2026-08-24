import { getAppUrl } from "@/lib/env";

export function getAppBaseUrl() {
  return getAppUrl();
}

export function getAthleteProfileUrl(athleteId: string) {
  return `${getAppBaseUrl()}/athletes/${athleteId}`;
}

export function getNearbyPickupUrl() {
  return `${getAppBaseUrl()}/pickup-players/nearby`;
}
