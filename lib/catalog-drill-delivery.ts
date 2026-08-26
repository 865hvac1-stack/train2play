import { athleteSportWhere } from "@/lib/catalog-drills";
import { prisma } from "@/lib/db";

export type DrillPushSource = "DIRECTOR" | "COACH";

const COACH_ROLES = ["COACH", "STAFF", "ORG_ADMIN"] as const;

function fullName(athlete: { firstName: string; lastName: string }) {
  return `${athlete.firstName} ${athlete.lastName}`.trim();
}

/** Every player the drill's saved audience covers right now. */
export async function resolveDrillAudienceAthleteIds(drill: {
  id: string;
  sport: string;
  shareWithAthletes: boolean;
  athleteAudience: string;
}) {
  if (!drill.shareWithAthletes || drill.athleteAudience === "NONE") return [];
  if (drill.athleteAudience === "SELECTED") {
    const rows = await prisma.catalogDrillAthleteRecipient.findMany({
      where: { catalogDrillId: drill.id },
      select: { athleteProfileId: true },
    });
    return rows.map((row) => row.athleteProfileId);
  }
  const rows = await prisma.athleteProfile.findMany({
    where: athleteSportWhere(drill.sport),
    select: { id: true },
  });
  return rows.map((row) => row.id);
}

/** Write one send row per player, keeping the newest send time per sender. */
export async function pushDrillToAthletes(options: {
  drillId: string;
  athleteProfileIds: string[];
  pushedByUserId: string;
  source: DrillPushSource;
  note?: string | null;
}) {
  const athleteProfileIds = [...new Set(options.athleteProfileIds)].filter(
    Boolean,
  );
  if (athleteProfileIds.length === 0) return { sent: 0 };

  const now = new Date();
  await prisma.$transaction(
    athleteProfileIds.map((athleteProfileId) =>
      prisma.catalogDrillPush.upsert({
        where: {
          catalogDrillId_athleteProfileId_pushedByUserId: {
            catalogDrillId: options.drillId,
            athleteProfileId,
            pushedByUserId: options.pushedByUserId,
          },
        },
        create: {
          catalogDrillId: options.drillId,
          athleteProfileId,
          pushedByUserId: options.pushedByUserId,
          source: options.source,
          note: options.note ?? null,
        },
        update: {
          createdAt: now,
          firstViewedAt: null,
          source: options.source,
          ...(options.note ? { note: options.note } : {}),
        },
      }),
    ),
  );
  return { sent: athleteProfileIds.length };
}

/** Director "send now": deliver to everyone the saved audience covers. */
export async function pushDrillToSavedAudience(options: {
  drillId: string;
  pushedByUserId: string;
}) {
  const drill = await prisma.catalogDrill.findUnique({
    where: { id: options.drillId },
    select: {
      id: true,
      sport: true,
      shareWithAthletes: true,
      athleteAudience: true,
    },
  });
  if (!drill) throw new Error("Drill not found");
  const athleteProfileIds = await resolveDrillAudienceAthleteIds(drill);
  return pushDrillToAthletes({
    drillId: drill.id,
    athleteProfileIds,
    pushedByUserId: options.pushedByUserId,
    source: "DIRECTOR",
  });
}

/** Coaches who work with at least one player in this sport. */
export async function listSportCoaches(sport: string) {
  const athletes = await prisma.athleteProfile.findMany({
    where: athleteSportWhere(sport),
    select: {
      legacyAthlete: { select: { coachId: true } },
      coachConnections: {
        where: { status: "APPROVED" },
        select: { coachUserId: true },
      },
      memberships: {
        where: { OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] },
        select: { coachUserId: true },
      },
    },
  });
  const coachIds = new Set(
    athletes.flatMap((athlete) => [
      ...(athlete.legacyAthlete?.coachId ? [athlete.legacyAthlete.coachId] : []),
      ...athlete.coachConnections.map((row) => row.coachUserId),
      ...athlete.memberships.flatMap((row) =>
        row.coachUserId ? [row.coachUserId] : [],
      ),
    ]),
  );
  if (coachIds.size === 0) return [];
  return prisma.user.findMany({
    where: { id: { in: [...coachIds] }, role: { in: [...COACH_ROLES] } },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
}

export type DrillDeliveryCounts = {
  audiencePlayers: number;
  sentPlayers: number;
  viewedPlayers: number;
  coachSentPlayers: number;
  lastSentAt: Date | null;
};

/** Headline delivery numbers for a set of drills (used on the drill cards). */
export async function getDrillDeliveryCounts(
  drills: {
    id: string;
    sport: string;
    shareWithAthletes: boolean;
    athleteAudience: string;
  }[],
) {
  const counts = new Map<string, DrillDeliveryCounts>();
  if (drills.length === 0) return counts;

  const sportAthleteCounts = new Map<string, number>();
  for (const sport of new Set(drills.map((drill) => drill.sport))) {
    sportAthleteCounts.set(
      sport,
      await prisma.athleteProfile.count({ where: athleteSportWhere(sport) }),
    );
  }
  const [recipientCounts, pushes] = await Promise.all([
    prisma.catalogDrillAthleteRecipient.groupBy({
      by: ["catalogDrillId"],
      where: { catalogDrillId: { in: drills.map((drill) => drill.id) } },
      _count: { _all: true },
    }),
    prisma.catalogDrillPush.findMany({
      where: { catalogDrillId: { in: drills.map((drill) => drill.id) } },
      select: {
        catalogDrillId: true,
        athleteProfileId: true,
        source: true,
        firstViewedAt: true,
        createdAt: true,
      },
    }),
  ]);
  const recipientTotals = new Map(
    recipientCounts.map((row) => [row.catalogDrillId, row._count._all]),
  );

  for (const drill of drills) {
    const drillPushes = pushes.filter(
      (push) => push.catalogDrillId === drill.id,
    );
    const audiencePlayers =
      !drill.shareWithAthletes || drill.athleteAudience === "NONE"
        ? 0
        : drill.athleteAudience === "SELECTED"
          ? (recipientTotals.get(drill.id) ?? 0)
          : (sportAthleteCounts.get(drill.sport) ?? 0);
    counts.set(drill.id, {
      audiencePlayers,
      sentPlayers: new Set(drillPushes.map((push) => push.athleteProfileId))
        .size,
      viewedPlayers: new Set(
        drillPushes
          .filter((push) => push.firstViewedAt)
          .map((push) => push.athleteProfileId),
      ).size,
      coachSentPlayers: new Set(
        drillPushes
          .filter((push) => push.source === "COACH")
          .map((push) => push.athleteProfileId),
      ).size,
      lastSentAt:
        drillPushes.length === 0
          ? null
          : new Date(
              Math.max(...drillPushes.map((push) => push.createdAt.getTime())),
            ),
    });
  }
  return counts;
}

/** Full "who has this drill" report for one drill. */
export async function getDrillDeliveryReport(drillId: string) {
  const drill = await prisma.catalogDrill.findUnique({
    where: { id: drillId },
    include: {
      athleteRecipients: { select: { athleteProfileId: true } },
      pushes: {
        include: {
          pushedBy: { select: { id: true, name: true, role: true } },
          athleteProfile: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!drill) return null;

  const audienceIds = await resolveDrillAudienceAthleteIds(drill);
  const pushedIds = drill.pushes.map((push) => push.athleteProfileId);
  const allIds = [...new Set([...audienceIds, ...pushedIds])];
  const athletes =
    allIds.length > 0
      ? await prisma.athleteProfile.findMany({
          where: { id: { in: allIds } },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            userId: true,
          },
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        })
      : [];

  const players = athletes.map((athlete) => {
    const pushes = drill.pushes.filter(
      (push) => push.athleteProfileId === athlete.id,
    );
    const directorPush = pushes.find((push) => push.source === "DIRECTOR");
    const coachPushes = pushes
      .filter((push) => push.source === "COACH")
      .map((push) => ({
        coachId: push.pushedBy.id,
        coachName: push.pushedBy.name,
        sentAt: push.createdAt,
      }));
    const viewedAt = pushes
      .map((push) => push.firstViewedAt)
      .filter((value): value is Date => Boolean(value))
      .sort((a, b) => a.getTime() - b.getTime())[0];
    return {
      id: athlete.id,
      name: fullName(athlete),
      hasLogin: Boolean(athlete.userId),
      inAudience: audienceIds.includes(athlete.id),
      directorSentAt: directorPush?.createdAt ?? null,
      coachPushes,
      viewedAt: viewedAt ?? null,
    };
  });

  const sportCoaches = await listSportCoaches(drill.sport);
  const coaches = sportCoaches.map((coach) => {
    const pushes = drill.pushes.filter(
      (push) => push.pushedBy.id === coach.id && push.source === "COACH",
    );
    return {
      id: coach.id,
      name: coach.name,
      email: coach.email,
      canSee: drill.shareWithCoaches,
      sentToPlayers: new Set(pushes.map((push) => push.athleteProfileId)).size,
      lastSentAt:
        pushes.length === 0
          ? null
          : new Date(
              Math.max(...pushes.map((push) => push.createdAt.getTime())),
            ),
      playerNames: [
        ...new Set(pushes.map((push) => fullName(push.athleteProfile))),
      ],
    };
  });

  return {
    drill,
    players,
    coaches,
    totals: {
      audiencePlayers: audienceIds.length,
      sentPlayers: new Set(pushedIds).size,
      viewedPlayers: players.filter((player) => player.viewedAt).length,
      coachesWithAccess: drill.shareWithCoaches ? coaches.length : 0,
      coachesSending: coaches.filter((coach) => coach.sentToPlayers > 0).length,
      playersFromCoaches: new Set(
        drill.pushes
          .filter((push) => push.source === "COACH")
          .map((push) => push.athleteProfileId),
      ).size,
    },
  };
}

/** Players a coach may send a drill to (their roster + approved connections). */
export async function listCoachPushAthletes(
  coachUserId: string,
  sport?: string,
) {
  const rows = await prisma.athleteProfile.findMany({
    where: {
      AND: [
        sport ? athleteSportWhere(sport) : {},
        {
          OR: [
            { legacyAthlete: { is: { coachId: coachUserId } } },
            {
              coachConnections: {
                some: { coachUserId, status: "APPROVED" },
              },
            },
            { memberships: { some: { coachUserId } } },
          ],
        },
      ],
    },
    select: { id: true, firstName: true, lastName: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  return rows.map((athlete) => ({ id: athlete.id, name: fullName(athlete) }));
}

/** Drills sent straight to one player, newest first, with who sent them. */
export async function listPushedDrillsForAthlete(options: {
  athleteProfileId: string;
  sport?: string;
}) {
  return prisma.catalogDrillPush.findMany({
    where: {
      athleteProfileId: options.athleteProfileId,
      catalogDrill: {
        isActive: true,
        ...(options.sport
          ? { sport: { equals: options.sport, mode: "insensitive" } }
          : {}),
      },
    },
    include: {
      catalogDrill: true,
      pushedBy: { select: { name: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function markDrillPushesViewed(options: {
  athleteProfileId: string;
  drillIds: string[];
}) {
  if (options.drillIds.length === 0) return { marked: 0 };
  const result = await prisma.catalogDrillPush.updateMany({
    where: {
      athleteProfileId: options.athleteProfileId,
      catalogDrillId: { in: options.drillIds },
      firstViewedAt: null,
    },
    data: { firstViewedAt: new Date() },
  });
  return { marked: result.count };
}
