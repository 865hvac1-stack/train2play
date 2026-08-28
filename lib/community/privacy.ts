import { ageOn, isMinor } from "@/lib/consent";
import { ageGroupFromAge, stateName } from "@/lib/community/age-groups";
import { collectSocialLinks, type SocialLink } from "@/lib/community/social";
import type { ProfileVisibility } from "@/lib/generated/prisma/client";

export type ProfileViewer =
  | { kind: "public" }
  | { kind: "self"; userId: string }
  | { kind: "authenticated"; userId: string; role?: string | null }
  | { kind: "organization"; userId: string; organizationIds: string[] }
  | { kind: "coach"; userId: string }
  | { kind: "admin" };

export type SafePublicIdentity = {
  displayName: string;
  sport: string | null;
  position: string | null;
  secondaryPosition: string | null;
  ageGroup: string | null;
  graduationYear: number | null;
  location: string | null;
  organizationName: string | null;
  isMinor: boolean;
};

/** Hudson H. for minors; full name for adults unless a display name is set. */
export function safeDisplayName(options: {
  firstName: string;
  lastName: string;
  displayName?: string | null;
  dateOfBirth?: Date | null;
  forceSafe?: boolean;
}) {
  const minor =
    options.forceSafe ||
    (options.dateOfBirth ? isMinor(options.dateOfBirth) : false);
  if (options.displayName?.trim() && !minor) {
    return options.displayName.trim();
  }
  const first = options.firstName.trim() || "Athlete";
  if (minor) {
    const lastInitial = options.lastName.trim().charAt(0).toUpperCase();
    return lastInitial ? `${first} ${lastInitial}.` : first;
  }
  if (options.displayName?.trim()) return options.displayName.trim();
  return `${first} ${options.lastName}`.trim();
}

export function profileVisibleToViewer(
  visibility: ProfileVisibility,
  viewer: ProfileViewer,
  athleteOrganizationIds: string[] = [],
) {
  if (viewer.kind === "self" || viewer.kind === "admin" || viewer.kind === "coach") {
    return true;
  }
  if (visibility === "PRIVATE") return false;
  if (visibility === "PUBLIC") return true;
  if (visibility === "AUTHENTICATED") {
    return viewer.kind === "authenticated" || viewer.kind === "organization";
  }
  if (visibility === "ORGANIZATION") {
    if (viewer.kind !== "organization") return false;
    return viewer.organizationIds.some((id) => athleteOrganizationIds.includes(id));
  }
  return false;
}

export function publicSocialLinks(options: {
  links: SocialLink[];
  dateOfBirth: Date | null;
  profileVisibility: ProfileVisibility;
  /** Owner preview of the shareable card without making a private profile public. */
  previewAsPublic?: boolean;
}): SocialLink[] {
  if (options.profileVisibility !== "PUBLIC" && !options.previewAsPublic) return [];
  return options.links.filter((link) => link.public);
}

export function neverPublicFields() {
  return [
    "email",
    "phone",
    "address",
    "dateOfBirth",
    "fullNameForMinors",
    "coachNotes",
    "privateVideos",
    "health",
    "bodyMeasurements",
    "accountInternal",
  ] as const;
}

export function buildSafeIdentity(profile: {
  firstName: string;
  lastName: string;
  displayName: string | null;
  dateOfBirth: Date | null;
  graduationYear: number | null;
  locationState: string | null;
  primarySport: string | null;
  sports: { sport: string; position: string | null; secondaryPosition: string | null; isPrimary: boolean }[];
  memberships?: { organization?: { name: string } | null; team?: { name: string } | null }[];
}): SafePublicIdentity {
  const primary = profile.sports.find((row) => row.isPrimary) ?? profile.sports[0];
  const age = profile.dateOfBirth ? ageOn(profile.dateOfBirth) : null;
  const orgName =
    profile.memberships?.find((row) => row.team?.name)?.team?.name ??
    profile.memberships?.[0]?.organization?.name ??
    null;
  const minor = profile.dateOfBirth ? isMinor(profile.dateOfBirth) : true;

  return {
    displayName: safeDisplayName({
      firstName: profile.firstName,
      lastName: profile.lastName,
      displayName: profile.displayName,
      dateOfBirth: profile.dateOfBirth,
    }),
    sport: primary?.sport || profile.primarySport,
    position: primary?.position ?? null,
    secondaryPosition: primary?.secondaryPosition ?? null,
    ageGroup: ageGroupFromAge(age),
    graduationYear: minor ? null : profile.graduationYear,
    location: stateName(profile.locationState),
    organizationName: orgName,
    isMinor: minor,
  };
}

export function redactSensitive<T extends Record<string, unknown>>(record: T) {
  const clone = { ...record };
  delete clone.email;
  delete clone.phone;
  delete clone.dateOfBirth;
  delete clone.passwordHash;
  delete clone.zipCode;
  delete clone.latitude;
  delete clone.longitude;
  delete clone.notes;
  delete clone.academicNotes;
  delete clone.contactPreference;
  return clone;
}

export { collectSocialLinks };
