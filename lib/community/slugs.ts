export const RESERVED_PROFILE_SLUGS = new Set([
  "admin",
  "athlete",
  "athletes",
  "dashboard",
  "trainer",
  "library",
  "courses",
  "training",
  "videos",
  "calendar",
  "reports",
  "settings",
  "teams",
  "connect",
  "view",
  "login",
  "signup",
  "onboarding",
  "privacy",
  "terms",
  "pickup-players",
  "accept-invite",
  "api",
  "p",
  "community",
  "leaderboard",
  "leaderboards",
  "metrics",
  "search",
  "new",
  "edit",
  "print",
  "nexgen",
  "home",
  "about",
  "help",
  "support",
  "me",
  "profile",
  "share",
  "card",
  "www",
  "app",
  "static",
  "assets",
  "null",
  "undefined",
]);

export function slugifyProfileName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function isReservedProfileSlug(slug: string) {
  return RESERVED_PROFILE_SLUGS.has(slug.trim().toLowerCase());
}

export function isValidProfileSlug(slug: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 3 && slug.length <= 48;
}

/** First name + last initial, e.g. hudson-h */
export function suggestedProfileSlug(firstName: string, lastName: string) {
  const first = slugifyProfileName(firstName);
  const lastInitial = slugifyProfileName(lastName).charAt(0);
  const base = lastInitial ? `${first}-${lastInitial}` : first;
  return base || "athlete";
}

export async function allocateUniqueSlug(
  desired: string,
  isTaken: (slug: string) => Promise<boolean>,
) {
  let candidate = slugifyProfileName(desired);
  if (!isValidProfileSlug(candidate) || isReservedProfileSlug(candidate)) {
    candidate = `athlete-${Math.random().toString(36).slice(2, 6)}`;
  }
  if (!(await isTaken(candidate))) return candidate;
  for (let i = 2; i < 50; i += 1) {
    const next = `${candidate.slice(0, 36)}-${i}`;
    if (!(await isTaken(next))) return next;
  }
  return `${candidate.slice(0, 28)}-${Date.now().toString(36)}`;
}
