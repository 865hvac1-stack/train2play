import { createHash, randomInt } from "crypto";

import { prisma } from "@/lib/db";
import { getDefaultOrganization } from "@/lib/organizations";
import { syncAthleteProfile } from "@/lib/athlete-profiles";

const CODE_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  DECLINED: "DECLINED",
  CANCELLED: "CANCELLED",
  REVOKED: "REVOKED",
} as const;

export const CONNECTION_STATUS = CODE_STATUS;

export const CONNECTION_SOURCE = {
  EMAIL_INVITE: "EMAIL_INVITE",
  COACH_CODE: "COACH_CODE",
  QR_CODE: "QR_CODE",
  ORGANIZATION: "ORGANIZATION",
  ADMIN: "ADMIN",
} as const;

export type ConnectionSource =
  (typeof CONNECTION_SOURCE)[keyof typeof CONNECTION_SOURCE];

function sanitizeNamePart(name: string) {
  return name
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 8);
}

/** Human-readable code like LESTER4821 — not a login credential. */
export function buildConnectionCodeCandidate(displayName: string) {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  const last = sanitizeNamePart(parts[parts.length - 1] ?? "COACH");
  const prefix = (last.length >= 3 ? last : `COACH${last}`).slice(0, 8);
  const digits = String(randomInt(1000, 10000));
  return `${prefix}${digits}`;
}

export function normalizeConnectionCode(raw: string) {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export async function ensureCoachConnectionCode(coachUserId: string) {
  const coach = await prisma.user.findUnique({
    where: { id: coachUserId },
    select: {
      id: true,
      name: true,
      role: true,
      connectionCode: true,
      connectionCodeCreatedAt: true,
    },
  });
  if (!coach) throw new Error("Coach not found");
  if (coach.connectionCode) {
    return {
      code: coach.connectionCode,
      createdAt: coach.connectionCodeCreatedAt,
    };
  }

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = buildConnectionCodeCandidate(coach.name);
    try {
      const updated = await prisma.user.update({
        where: { id: coach.id },
        data: {
          connectionCode: code,
          connectionCodeCreatedAt: new Date(),
        },
        select: { connectionCode: true, connectionCodeCreatedAt: true },
      });
      return {
        code: updated.connectionCode!,
        createdAt: updated.connectionCodeCreatedAt,
      };
    } catch {
      // unique collision — retry
    }
  }

  throw new Error("Could not generate a unique connection code");
}

export async function regenerateCoachConnectionCode(coachUserId: string) {
  const coach = await prisma.user.findUnique({
    where: { id: coachUserId },
    select: { id: true, name: true },
  });
  if (!coach) throw new Error("Coach not found");

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = buildConnectionCodeCandidate(coach.name);
    try {
      const updated = await prisma.user.update({
        where: { id: coach.id },
        data: {
          connectionCode: code,
          connectionCodeCreatedAt: new Date(),
        },
        select: { connectionCode: true, connectionCodeCreatedAt: true },
      });
      return {
        code: updated.connectionCode!,
        createdAt: updated.connectionCodeCreatedAt,
      };
    } catch {
      // retry
    }
  }

  throw new Error("Could not regenerate connection code");
}

/** Public-safe coach preview for connection codes — no email/location/DOB. */
export async function lookupCoachByConnectionCode(rawCode: string) {
  const code = normalizeConnectionCode(rawCode);
  if (code.length < 5) return null;

  const coach = await prisma.user.findFirst({
    where: {
      connectionCode: code,
      role: { in: ["COACH", "ORG_ADMIN", "STAFF", "PLATFORM_ADMIN"] },
    },
    select: {
      id: true,
      name: true,
      lookingForSport: true,
      organizationMemberships: {
        take: 1,
        include: { organization: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!coach) return null;

  return {
    id: coach.id,
    name: coach.name,
    sport: coach.lookingForSport,
    organizationName: coach.organizationMemberships[0]?.organization.name ?? null,
    code,
  };
}

export async function getApprovedCoachIdsForAthleteProfile(
  athleteProfileId: string,
) {
  const rows = await prisma.coachAthleteConnection.findMany({
    where: {
      athleteProfileId,
      status: CONNECTION_STATUS.APPROVED,
    },
    select: { coachUserId: true },
  });
  return rows.map((r) => r.coachUserId);
}

export async function hasApprovedCoachConnection(
  coachUserId: string,
  athleteProfileId: string,
) {
  const row = await prisma.coachAthleteConnection.findFirst({
    where: {
      coachUserId,
      athleteProfileId,
      status: CONNECTION_STATUS.APPROVED,
    },
    select: { id: true },
  });
  return Boolean(row);
}

/** Ensure approved EMAIL_INVITE connection when coach creates/owns roster athlete. */
export async function ensureEmailInviteConnection(options: {
  coachUserId: string;
  athleteId: string;
}) {
  const athlete = await prisma.athlete.findUnique({
    where: { id: options.athleteId },
    include: { athleteProfile: true },
  });
  if (!athlete) return null;

  let profile = athlete.athleteProfile;
  if (!profile) {
    profile = await syncAthleteProfile({
      id: athlete.id,
      coachId: athlete.coachId,
      firstName: athlete.firstName,
      lastName: athlete.lastName,
      dateOfBirth: athlete.dateOfBirth,
      sport: athlete.sport,
      position: athlete.position,
    });
  }

  const existing = await prisma.coachAthleteConnection.findFirst({
    where: {
      coachUserId: options.coachUserId,
      athleteProfileId: profile.id,
      status: CONNECTION_STATUS.APPROVED,
    },
  });
  if (existing) return existing;

  return prisma.coachAthleteConnection.create({
    data: {
      coachUserId: options.coachUserId,
      athleteProfileId: profile.id,
      status: CONNECTION_STATUS.APPROVED,
      source: CONNECTION_SOURCE.EMAIL_INVITE,
      approvedAt: new Date(),
    },
  });
}

export async function requestCoachConnection(options: {
  athleteProfileId: string;
  coachUserId: string;
  source?: ConnectionSource;
}) {
  const source = options.source ?? CONNECTION_SOURCE.COACH_CODE;

  const approved = await prisma.coachAthleteConnection.findFirst({
    where: {
      athleteProfileId: options.athleteProfileId,
      coachUserId: options.coachUserId,
      status: CONNECTION_STATUS.APPROVED,
    },
  });
  if (approved) {
    throw new Error("You are already connected with this coach");
  }

  const pending = await prisma.coachAthleteConnection.findFirst({
    where: {
      athleteProfileId: options.athleteProfileId,
      coachUserId: options.coachUserId,
      status: CONNECTION_STATUS.PENDING,
    },
  });
  if (pending) {
    throw new Error("You already have a pending request with this coach");
  }

  return prisma.coachAthleteConnection.create({
    data: {
      athleteProfileId: options.athleteProfileId,
      coachUserId: options.coachUserId,
      status: CONNECTION_STATUS.PENDING,
      source,
      requestedAt: new Date(),
    },
  });
}

export async function approveCoachConnection(options: {
  connectionId: string;
  coachUserId: string;
}) {
  const connection = await prisma.coachAthleteConnection.findFirst({
    where: {
      id: options.connectionId,
      coachUserId: options.coachUserId,
      status: CONNECTION_STATUS.PENDING,
    },
    include: {
      athleteProfile: {
        include: {
          sports: { where: { isPrimary: true }, take: 1 },
          legacyAthlete: true,
        },
      },
    },
  });

  if (!connection) {
    throw new Error("Connection request not found");
  }

  const profile = connection.athleteProfile;
  let legacyAthleteId = profile.legacyAthleteId;

  // Ensure a training Athlete row exists so coaches can assign programs
  if (!legacyAthleteId) {
    const sport =
      profile.sports[0]?.sport || profile.primarySport || "Multi-sport";
    const position = profile.sports[0]?.position ?? null;
    const created = await prisma.athlete.create({
      data: {
        coachId: options.coachUserId,
        firstName: profile.firstName,
        lastName: profile.lastName,
        dateOfBirth: profile.dateOfBirth,
        sport,
        position,
        rosterStatus: "ROSTER",
        notes: "Connected via Train2Play coach code",
      },
    });
    await prisma.athleteProfile.update({
      where: { id: profile.id },
      data: { legacyAthleteId: created.id },
    });
    legacyAthleteId = created.id;
  }

  const organization = await getDefaultOrganization();
  const membershipExists = await prisma.athleteMembership.findFirst({
    where: {
      athleteProfileId: profile.id,
      coachUserId: options.coachUserId,
      endsAt: null,
    },
  });
  if (!membershipExists) {
    await prisma.athleteMembership.create({
      data: {
        athleteProfileId: profile.id,
        organizationId: organization.id,
        coachUserId: options.coachUserId,
      },
    });
  }

  return prisma.coachAthleteConnection.update({
    where: { id: connection.id },
    data: {
      status: CONNECTION_STATUS.APPROVED,
      approvedAt: new Date(),
      declinedAt: null,
    },
  });
}

export async function declineCoachConnection(options: {
  connectionId: string;
  coachUserId: string;
}) {
  const connection = await prisma.coachAthleteConnection.findFirst({
    where: {
      id: options.connectionId,
      coachUserId: options.coachUserId,
      status: CONNECTION_STATUS.PENDING,
    },
  });
  if (!connection) {
    throw new Error("Connection request not found");
  }

  return prisma.coachAthleteConnection.update({
    where: { id: connection.id },
    data: {
      status: CONNECTION_STATUS.DECLINED,
      declinedAt: new Date(),
    },
  });
}

/** Stable opaque token for future QR deep links (not the human code). */
export function connectionCodePath(code: string) {
  return `/connect/${encodeURIComponent(normalizeConnectionCode(code))}`;
}

export function hashForAudit(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}
