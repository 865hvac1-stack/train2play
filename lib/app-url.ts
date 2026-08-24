export function getAppBaseUrl() {
  return (
    process.env.AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:43123"
  ).replace(/\/$/, "");
}

export function getAthleteProfileUrl(athleteId: string) {
  return `${getAppBaseUrl()}/athletes/${athleteId}`;
}

export function getNearbyPickupUrl() {
  return `${getAppBaseUrl()}/pickup-players/nearby`;
}
