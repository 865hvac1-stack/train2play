import type { UserRole } from "@/lib/generated/prisma/client";

/** Roles that use the Coach Portal experience. */
export const COACH_PORTAL_ROLES = [
  "COACH",
  "STAFF",
  "ORG_ADMIN",
  "PLATFORM_ADMIN",
] as const satisfies readonly UserRole[];

export type CoachPortalRole = (typeof COACH_PORTAL_ROLES)[number];

export function isCoachPortalRole(role: string | null | undefined): boolean {
  return COACH_PORTAL_ROLES.includes(role as CoachPortalRole);
}

export function isAthleteRole(role: string | null | undefined): boolean {
  return role === "ATHLETE";
}

export function isParentRole(role: string | null | undefined): boolean {
  return role === "PARENT";
}

/** Post-auth home path by role (onboarding handled separately for coaches). */
export function getRoleHomePath(role: string | null | undefined): string {
  if (isAthleteRole(role)) return "/athlete";
  if (isParentRole(role)) return "/view"; // parent accounts later; share links stay public
  return "/dashboard";
}

export function getLoginLandingPath(options: {
  role: string | null | undefined;
  onboardingCompletedAt: Date | null | undefined;
}): string {
  if (isAthleteRole(options.role)) {
    return "/athlete";
  }
  if (isParentRole(options.role)) {
    // Parent dashboard not built yet — keep them out of coach portal.
    return "/login?error=parent-coming-soon";
  }
  return options.onboardingCompletedAt ? "/dashboard" : "/onboarding";
}
