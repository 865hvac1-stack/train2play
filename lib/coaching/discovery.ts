import { prisma } from "@/lib/db";
import {
  COACH_DISCOVERY_STATUS,
  isBackgroundCheckPublicBadge,
  isTrain2PlayApproved,
} from "@/lib/coaching/status";
import { isTrainer } from "@/lib/roles";
import type { Prisma, UserRole } from "@/lib/generated/prisma/client";

export function isDiscoverableCoach(profile: {
  discoveryStatus: string;
  appearInFindACoach: boolean;
  user?: { isActive?: boolean } | null;
}) {
  return (
    profile.discoveryStatus === COACH_DISCOVERY_STATUS.APPROVED &&
    profile.appearInFindACoach &&
    profile.user?.isActive !== false
  );
}

export async function countActiveAthletesForCoach(coachUserId: string) {
  return prisma.coachAthleteConnection.count({
    where: { coachUserId, status: "APPROVED" },
  });
}

export async function isCoachAcceptingAthletes(profile: {
  userId: string;
  acceptingAthletes: boolean;
  maxActiveAthletes: number | null;
  discoveryStatus: string;
}) {
  if (!profile.acceptingAthletes) return false;
  if (profile.discoveryStatus === COACH_DISCOVERY_STATUS.SUSPENDED) return false;
  if (profile.maxActiveAthletes == null) return true;
  const active = await countActiveAthletesForCoach(profile.userId);
  return active < profile.maxActiveAthletes;
}

export type FindCoachFilters = {
  sport?: string;
  specialty?: string;
  position?: string;
  ageGroup?: string;
  location?: string;
  method?: "in-person" | "remote" | "both" | "";
  accepting?: boolean;
  organization?: string;
  page?: number;
  pageSize?: number;
};

export async function searchDiscoverableCoaches(filters: FindCoachFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(24, Math.max(6, filters.pageSize ?? 12));
  const sport = filters.sport?.trim() || undefined;
  const specialty = filters.specialty?.trim() || undefined;
  const position = filters.position?.trim() || undefined;
  const ageGroup = filters.ageGroup?.trim() || undefined;
  const location = filters.location?.trim() || undefined;
  const organization = filters.organization?.trim() || undefined;

  const sportFilter =
    sport || specialty || position || ageGroup
      ? {
          sports: {
            some: {
              ...(sport ? { sport } : {}),
              ...(specialty ? { specialties: { has: specialty } } : {}),
              ...(position ? { positions: { has: position } } : {}),
              ...(ageGroup ? { ageGroups: { has: ageGroup } } : {}),
            },
          },
        }
      : {};

  const locationFilter = location
    ? {
        OR: [
          { locationLabel: { contains: location, mode: "insensitive" as const } },
          { locationCity: { contains: location, mode: "insensitive" as const } },
          { locationState: { contains: location, mode: "insensitive" as const } },
          { serviceArea: { contains: location, mode: "insensitive" as const } },
        ],
      }
    : {};

  const methodFilter =
    filters.method === "in-person"
      ? { inPersonCoaching: true }
      : filters.method === "remote"
        ? { remoteCoaching: true }
        : filters.method === "both"
          ? { inPersonCoaching: true, remoteCoaching: true }
          : {};

  const where: Prisma.CoachProfileWhereInput = {
    discoveryStatus: COACH_DISCOVERY_STATUS.APPROVED,
    appearInFindACoach: true,
    user: {
      isActive: true,
      role: { in: ["COACH", "STAFF", "ORG_ADMIN"] as UserRole[] },
    },
    ...sportFilter,
    ...locationFilter,
    ...methodFilter,
    ...(filters.accepting ? { acceptingAthletes: true } : {}),
    ...(organization
      ? { organizationName: { contains: organization, mode: "insensitive" as const } }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.coachProfile.findMany({
      where,
      include: {
        sports: { orderBy: [{ isPrimary: "desc" }, { sport: "asc" }] },
        featuredVideo: { select: { videoUrl: true, title: true } },
        user: { select: { id: true, name: true, isActive: true } },
      },
      orderBy: [{ train2playApprovedAt: "desc" }, { updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.coachProfile.count({ where }),
  ]);

  const withCapacity = await Promise.all(
    rows.map(async (row) => {
      const accepting = await isCoachAcceptingAthletes(row);
      return { ...row, acceptingNow: accepting };
    }),
  );

  const visible = filters.accepting ? withCapacity.filter((row) => row.acceptingNow) : withCapacity;

  return {
    coaches: visible.map((row) => toSearchCard(row)),
    total: filters.accepting ? visible.length : total,
    page,
    pageSize,
    pages: Math.max(1, Math.ceil((filters.accepting ? visible.length : total) / pageSize)),
  };
}

function toSearchCard(row: {
  id: string;
  userId: string;
  publicSlug: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  organizationName: string | null;
  locationLabel: string | null;
  locationState: string | null;
  inPersonCoaching: boolean;
  remoteCoaching: boolean;
  discoveryStatus: string;
  backgroundCheckStatus: string;
  backgroundCheckExpiresAt: Date | null;
  acceptingNow: boolean;
  sports: { sport: string; isPrimary: boolean; specialties: string[] }[];
  user: { name: string };
}) {
  const primary = row.sports.find((sport) => sport.isPrimary) ?? row.sports[0];
  const specialties = [...new Set(row.sports.flatMap((sport) => sport.specialties))].slice(0, 3);
  return {
    id: row.id,
    userId: row.userId,
    slug: row.publicSlug,
    name: row.displayName?.trim() || row.user.name,
    avatarUrl: row.avatarUrl,
    sport: primary?.sport ?? null,
    specialties,
    organizationName: row.organizationName,
    locationLabel: row.locationLabel,
    locationState: row.locationState,
    inPerson: row.inPersonCoaching,
    remote: row.remoteCoaching,
    accepting: row.acceptingNow,
    approved: isTrain2PlayApproved(row.discoveryStatus),
    backgroundCheckCompleted: isBackgroundCheckPublicBadge({
      status: row.backgroundCheckStatus,
      expiresAt: row.backgroundCheckExpiresAt,
    }),
  };
}

export function canCoachOpenDiscoveryProfile(role: string | null | undefined) {
  return Boolean(role && role !== "ATHLETE" && role !== "PARENT" && !isTrainer(role));
}
