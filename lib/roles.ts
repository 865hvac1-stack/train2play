import type { UserRole } from "@/lib/generated/prisma/client";

/** Roles that use the Coach Portal experience. */
export const COACH_PORTAL_ROLES = [
  "COACH",
  "STAFF",
  "ORG_ADMIN",
  "PLATFORM_ADMIN",
  "TRAINER",
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

export function isPlatformAdmin(role: string | null | undefined): boolean {
  return role === "PLATFORM_ADMIN";
}

export function isTrainer(role: string | null | undefined): boolean {
  return role === "TRAINER";
}

/** Can edit the master sport library and suggested-drill catalog. */
export function isLibraryEditor(role: string | null | undefined): boolean {
  return isPlatformAdmin(role) || isTrainer(role);
}

/** Post-auth home path by role (onboarding handled separately for coaches). */
export function getRoleHomePath(role: string | null | undefined): string {
  if (isAthleteRole(role)) return "/athlete";
  if (isParentRole(role)) return "/view";
  if (isPlatformAdmin(role)) return "/admin";
  if (isTrainer(role)) return "/trainer";
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
    return "/login?error=parent-coming-soon";
  }
  if (isPlatformAdmin(options.role)) {
    return "/admin";
  }
  if (isTrainer(options.role)) {
    return "/trainer";
  }
  return options.onboardingCompletedAt ? "/dashboard" : "/onboarding";
}
