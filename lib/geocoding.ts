export type GeoLocation = {
  zipCode: string;
  latitude: number;
  longitude: number;
  city: string;
  state: string;
};

export function normalizeZipCode(zip: string) {
  return zip.trim().replace(/\D/g, "").slice(0, 5);
}

export function isValidZipCode(zip: string) {
  return /^\d{5}$/.test(normalizeZipCode(zip));
}

export async function geocodeZipCode(zip: string): Promise<GeoLocation | null> {
  const normalized = normalizeZipCode(zip);
  if (!isValidZipCode(normalized)) {
    return null;
  }

  try {
    const response = await fetch(`https://api.zippopotam.us/us/${normalized}`, {
      next: { revalidate: 60 * 60 * 24 * 7 },
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      places?: { latitude: string; longitude: string; "place name": string; "state abbreviation": string }[];
    };

    const place = data.places?.[0];
    if (!place) return null;

    return {
      zipCode: normalized,
      latitude: Number(place.latitude),
      longitude: Number(place.longitude),
      city: place["place name"],
      state: place["state abbreviation"],
    };
  } catch {
    return null;
  }
}

/** Great-circle distance in miles between two lat/lng points. */
export function distanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(miles: number) {
  if (miles < 1) return `${(miles * 5280).toFixed(0)} ft away`;
  if (miles < 10) return `${miles.toFixed(1)} mi away`;
  return `${Math.round(miles)} mi away`;
}

export function parsePositions(raw: string | null | undefined) {
  if (!raw) return [];
  return raw
    .split(",")
    .map((part) => part.trim().toUpperCase())
    .filter(Boolean);
}

export function positionMatches(playerPosition: string | null, lookingFor: string[]) {
  if (lookingFor.length === 0) return true;
  if (!playerPosition) return false;
  const normalized = playerPosition.toUpperCase();
  return lookingFor.some(
    (needle) => normalized.includes(needle) || needle.includes(normalized),
  );
}
