import { createHash, randomInt } from "crypto";

import { prisma } from "@/lib/db";
import { getDefaultOrganization } from "@/lib/organizations";
import { syncAthleteProfile } from "@/lib/athlete-profiles";
import { createNotification, NOTIFICATION_TYPE } from "@/lib/notifications";
import { isMinor } from "@/lib/consent";
import { COACH_DISCOVERY_STATUS } from "@/lib/coaching/status";
import { isCoachAcceptingAthletes } from "@/lib/coaching/discovery";

const CODE_STATUS = {
  PENDING: "PENDING",
  PENDING_GUARDIAN: "PENDING_GUARDIAN",
  PENDING_COACH: "PENDING_COACH",
  APPROVED: "APPROVED",
  DECLINED: "DECLINED",
  CANCELLED: "CANCELLED",
  REVOKED: "REVOKED",
  EXPIRED: "EXPIRED",
} as const;

export const CONNECTION_STATUS = CODE_STATUS;

export const ACTIVE_REQUEST_STATUSES = [
  CONNECTION_STATUS.PENDING,
  CONNECTION_STATUS.PENDING_GUARDIAN,
  CONNECTION_STATUS.PENDING_COACH,
] as const;

export const COACH_INBOX_STATUSES = [
  CONNECTION_STATUS.PENDING,
  CONNECTION_STATUS.PENDING_COACH,
] as const;

export const CONNECTION_SOURCE = {
  EMAIL_INVITE: "EMAIL_INVITE",
  COACH_CODE: "COACH_CODE",
  QR_CODE: "QR_CODE",
  ORGANIZATION: "ORGANIZATION",
  ADMIN: "ADMIN",
  DISCOVERY: "DISCOVERY",
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
  athleteNote?: string | null;
  requestedSpecialty?: string | null;
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
      status: { in: [...ACTIVE_REQUEST_STATUSES] },
    },
  });
  if (pending) {
    throw new Error("You already have a pending request with this coach");
  }

  if (source === CONNECTION_SOURCE.DISCOVERY) {
    const coachProfile = await prisma.coachProfile.findUnique({
      where: { userId: options.coachUserId },
    });
    if (!coachProfile || coachProfile.discoveryStatus !== COACH_DISCOVERY_STATUS.APPROVED) {
      throw new Error("This coach is not available in Find a Coach.");
    }
    if (!coachProfile.appearInFindACoach) {
      throw new Error("This coach is not currently listed in Find a Coach.");
    }
    const accepting = await isCoachAcceptingAthletes(coachProfile);
    if (!accepting) {
      throw new Error("This coach is not currently accepting new athletes.");
    }
  }

  const athlete = await prisma.athleteProfile.findUnique({
    where: { id: options.athleteProfileId },
    select: { dateOfBirth: true, firstName: true, userId: true },
  });
  const minor = athlete?.dateOfBirth ? isMinor(athlete.dateOfBirth) : true;
  const guardianRequired = source === CONNECTION_SOURCE.DISCOVERY && minor;
  const status =
    source === CONNECTION_SOURCE.DISCOVERY
      ? guardianRequired
        ? CONNECTION_STATUS.PENDING_GUARDIAN
        : CONNECTION_STATUS.PENDING_COACH
      : CONNECTION_STATUS.PENDING;

  const row = await prisma.coachAthleteConnection.create({
    data: {
      athleteProfileId: options.athleteProfileId,
      coachUserId: options.coachUserId,
      status,
      source,
      requestedAt: new Date(),
      athleteNote: options.athleteNote?.trim() || null,
      requestedSpecialty: options.requestedSpecialty?.trim() || null,
      guardianApprovalRequired: guardianRequired,
    },
  });

  if (status === CONNECTION_STATUS.PENDING || status === CONNECTION_STATUS.PENDING_COACH) {
    await createNotification({
      userId: options.coachUserId,
      type: NOTIFICATION_TYPE.COACH_CONNECTION,
      title: "New athlete request",
      body: `${athlete?.firstName ?? "An athlete"} asked to connect with you.`,
      href: "/dashboard/requests",
      entityId: row.id,
      entityType: "CoachAthleteConnection",
    });
  }

  if (athlete?.userId) {
    await createNotification({
      userId: athlete.userId,
      type: NOTIFICATION_TYPE.COACH_CONNECTION,
      title:
        status === CONNECTION_STATUS.PENDING_GUARDIAN
          ? "Guardian approval needed"
          : "Coach request submitted",
      body:
        status === CONNECTION_STATUS.PENDING_GUARDIAN
          ? "A parent or guardian must approve this coach request before the coach can accept."
          : "We'll let you know when the coach responds.",
      href: "/athlete/coaches",
      entityId: row.id,
      entityType: "CoachAthleteConnection",
    });
  }

  return row;
}

export async function approveCoachConnection(options: {
  connectionId: string;
  coachUserId: string;
}) {
  const connection = await prisma.coachAthleteConnection.findFirst({
    where: {
      id: options.connectionId,
      coachUserId: options.coachUserId,
      status: { in: [...COACH_INBOX_STATUSES] },
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
  if (connection.guardianApprovalRequired && !connection.guardianApprovedAt) {
    throw new Error("A parent or guardian must approve this request first.");
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
        notes:
          connection.source === CONNECTION_SOURCE.DISCOVERY
            ? "Connected via Find a Coach"
            : "Connected via Train2Play coach code",
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

  const updated = await prisma.coachAthleteConnection.update({
    where: { id: connection.id },
    data: {
      status: CONNECTION_STATUS.APPROVED,
      approvedAt: new Date(),
      declinedAt: null,
    },
  });

  if (profile.userId) {
    await createNotification({
      userId: profile.userId,
      type: NOTIFICATION_TYPE.COACH_CONNECTION,
      title: "You're connected",
      body: "Your coach can now assign training and review your development.",
      href: "/athlete",
      entityId: updated.id,
      entityType: "CoachAthleteConnection",
    });
  }

  const coachProfile = await prisma.coachProfile.findUnique({
    where: { userId: options.coachUserId },
  });
  if (coachProfile?.acceptingAthletes && coachProfile.maxActiveAthletes != null) {
    const stillAccepting = await isCoachAcceptingAthletes(coachProfile);
    if (!stillAccepting) {
      await createNotification({
        userId: options.coachUserId,
        type: NOTIFICATION_TYPE.COACH_CONNECTION,
        title: "Athlete capacity reached",
        body: "You are at your max active athletes. New Find a Coach requests are paused until a slot opens.",
        href: "/dashboard/profile/edit?section=availability",
        entityId: coachProfile.id,
        entityType: "CoachProfile",
      });
    }
  }

  return updated;
}

export async function declineCoachConnection(options: {
  connectionId: string;
  coachUserId: string;
  note?: string | null;
}) {
  const connection = await prisma.coachAthleteConnection.findFirst({
    where: {
      id: options.connectionId,
      coachUserId: options.coachUserId,
      status: { in: [...COACH_INBOX_STATUSES] },
    },
    include: { athleteProfile: { select: { userId: true } } },
  });
  if (!connection) {
    throw new Error("Connection request not found");
  }

  const updated = await prisma.coachAthleteConnection.update({
    where: { id: connection.id },
    data: {
      status: CONNECTION_STATUS.DECLINED,
      declinedAt: new Date(),
      coachDeclineNote: options.note?.trim() || null,
    },
  });

  if (connection.athleteProfile.userId) {
    await createNotification({
      userId: connection.athleteProfile.userId,
      type: NOTIFICATION_TYPE.COACH_CONNECTION,
      title: "Coach request update",
      body: "This coach isn't available to connect right now.",
      href: "/athlete/coaches",
      entityId: updated.id,
      entityType: "CoachAthleteConnection",
    });
  }

  return updated;
}

export async function approveGuardianForConnection(options: {
  connectionId: string;
  athleteProfileId: string;
}) {
  const connection = await prisma.coachAthleteConnection.findFirst({
    where: {
      id: options.connectionId,
      athleteProfileId: options.athleteProfileId,
      status: CONNECTION_STATUS.PENDING_GUARDIAN,
    },
  });
  if (!connection) throw new Error("Request not found.");

  const updated = await prisma.coachAthleteConnection.update({
    where: { id: connection.id },
    data: {
      guardianApprovedAt: new Date(),
      status: CONNECTION_STATUS.PENDING_COACH,
    },
  });

  await createNotification({
    userId: connection.coachUserId,
    type: NOTIFICATION_TYPE.COACH_CONNECTION,
    title: "New athlete request",
    body: "A guardian approved a request. Review it in Athlete requests.",
    href: "/dashboard/requests",
    entityId: updated.id,
    entityType: "CoachAthleteConnection",
  });

  return updated;
}

export async function cancelCoachConnectionRequest(options: {
  connectionId: string;
  athleteProfileId: string;
}) {
  const connection = await prisma.coachAthleteConnection.findFirst({
    where: {
      id: options.connectionId,
      athleteProfileId: options.athleteProfileId,
      status: { in: [...ACTIVE_REQUEST_STATUSES] },
    },
  });
  if (!connection) throw new Error("Request not found.");

  const updated = await prisma.coachAthleteConnection.update({
    where: { id: connection.id },
    data: {
      status: CONNECTION_STATUS.CANCELLED,
      cancelledAt: new Date(),
    },
  });

  await createNotification({
    userId: connection.coachUserId,
    type: NOTIFICATION_TYPE.COACH_CONNECTION,
    title: "Athlete canceled a request",
    body: "An athlete is no longer waiting to connect.",
    href: "/dashboard/requests",
    entityId: updated.id,
    entityType: "CoachAthleteConnection",
  });

  return updated;
}

const DISCOVERY_REQUEST_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Mark stale Find a Coach requests expired and notify the athlete. */
export async function expireStaleDiscoveryRequests(options?: {
  athleteProfileId?: string;
  coachUserId?: string;
}) {
  const cutoff = new Date(Date.now() - DISCOVERY_REQUEST_TTL_MS);
  const stale = await prisma.coachAthleteConnection.findMany({
    where: {
      source: CONNECTION_SOURCE.DISCOVERY,
      status: { in: [...ACTIVE_REQUEST_STATUSES] },
      requestedAt: { lt: cutoff },
      ...(options?.athleteProfileId ? { athleteProfileId: options.athleteProfileId } : {}),
      ...(options?.coachUserId ? { coachUserId: options.coachUserId } : {}),
    },
    include: { athleteProfile: { select: { userId: true } } },
    take: 50,
  });
  for (const row of stale) {
    await prisma.coachAthleteConnection.update({
      where: { id: row.id },
      data: { status: CONNECTION_STATUS.EXPIRED, expiredAt: new Date() },
    });
    if (row.athleteProfile.userId) {
      await createNotification({
        userId: row.athleteProfile.userId,
        type: NOTIFICATION_TYPE.COACH_CONNECTION,
        title: "Coach request expired",
        body: "This request is no longer active. You can send a new one if the coach is still accepting athletes.",
        href: "/athlete/coaches",
        entityId: row.id,
        entityType: "CoachAthleteConnection",
      });
    }
  }
  return stale.length;
}

/** Stable opaque token for future QR deep links (not the human code). */
export function connectionCodePath(code: string) {
  return `/connect/${encodeURIComponent(normalizeConnectionCode(code))}`;
}

export function hashForAudit(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}
