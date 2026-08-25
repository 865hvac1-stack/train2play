import type { PrismaClient } from "@/lib/generated/prisma/client";
import { OrgRole } from "@/lib/generated/prisma/client";
import { CONNECTION_STATUS } from "@/lib/coach-connections";

type Db = Pick<
  PrismaClient,
  | "athlete"
  | "athleteMembership"
  | "organizationMembership"
  | "guardianLink"
  | "coachAthleteConnection"
>;

export async function getAthleteAccess(db: Db, userId: string, athleteId: string) {
  const athlete = await db.athlete.findUnique({
    where: { id: athleteId },
    select: {
      id: true,
      coachId: true,
      athleteProfile: {
        select: {
          id: true,
          memberships: {
            where: {
              OR: [{ coachUserId: userId }, { endsAt: null }],
            },
            select: { organizationId: true, coachUserId: true },
          },
          guardianLinks: {
            where: { guardianUserId: userId },
            select: { canViewProgress: true, canManageAccount: true },
          },
          coachConnections: {
            where: {
              coachUserId: userId,
              status: CONNECTION_STATUS.APPROVED,
            },
            select: { id: true },
            take: 1,
          },
        },
      },
    },
  });

  if (!athlete) {
    return { exists: false as const, canView: false, canEdit: false };
  }

  const isDirectCoach = athlete.coachId === userId;
  const profileMembership = athlete.athleteProfile?.memberships.some(
    (membership) => membership.coachUserId === userId,
  );
  const approvedConnection =
    (athlete.athleteProfile?.coachConnections.length ?? 0) > 0;
  const guardianLink = athlete.athleteProfile?.guardianLinks[0];

  const canView =
    isDirectCoach ||
    profileMembership === true ||
    approvedConnection ||
    guardianLink?.canViewProgress === true;

  const canEdit =
    isDirectCoach ||
    profileMembership === true ||
    approvedConnection ||
    guardianLink?.canManageAccount === true;

  return {
    exists: true as const,
    canView,
    canEdit,
    athleteProfileId: athlete.athleteProfile?.id ?? null,
  };
}

export async function canViewAthlete(
  db: Db,
  userId: string,
  athleteId: string,
): Promise<boolean> {
  const access = await getAthleteAccess(db, userId, athleteId);
  return access.exists && access.canView;
}

export async function canEditAthlete(
  db: Db,
  userId: string,
  athleteId: string,
): Promise<boolean> {
  const access = await getAthleteAccess(db, userId, athleteId);
  return access.exists && access.canEdit;
}

export async function canManageOrganization(
  db: Pick<PrismaClient, "organizationMembership">,
  userId: string,
  organizationId: string,
): Promise<boolean> {
  const membership = await db.organizationMembership.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
    select: { role: true },
  });

  if (!membership) return false;
  return membership.role === OrgRole.OWNER || membership.role === OrgRole.ADMIN;
}

export async function requireAthleteAccess(
  db: Db,
  userId: string,
  athleteId: string,
  mode: "view" | "edit",
) {
  const access = await getAthleteAccess(db, userId, athleteId);

  if (!access.exists) {
    throw new Error("Athlete not found");
  }

  if (mode === "view" && !access.canView) {
    throw new Error("Not authorized to view this athlete");
  }

  if (mode === "edit" && !access.canEdit) {
    throw new Error("Not authorized to edit this athlete");
  }

  return access;
}
