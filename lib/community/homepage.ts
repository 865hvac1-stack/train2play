import { prisma } from "@/lib/db";
import { startOfWeekMonday } from "@/lib/community/age-groups";
import {
  getCurrentPlayerOfTheWeek,
  playerOfTheWeekCard,
} from "@/lib/community/player-of-the-week";
import { getActiveChallenges } from "@/lib/community/challenges";
import {
  listLeaderboardMetrics,
  rankMetricResults,
  rankMostImproved,
  rankTrainingLeaders,
} from "@/lib/community/ranking";

export async function getPublishedHomepageWeek(now = new Date()) {
  const weekOf = startOfWeekMonday(now);
  const exact = await prisma.homepageWeek.findFirst({
    where: { weekOf, published: true },
    include: {
      modules: {
        where: { published: true },
        orderBy: { slot: "asc" },
        include: {
          playerOfTheWeek: {
            include: {
              athleteProfile: {
                include: {
                  sports: { orderBy: [{ isPrimary: "desc" }, { sport: "asc" }] },
                  memberships: {
                    include: {
                      organization: { select: { name: true } },
                      team: { select: { name: true } },
                    },
                    take: 1,
                  },
                },
              },
              featuredVideoReview: {
                include: { trainingVideo: { select: { videoUrl: true, title: true } } },
              },
            },
          },
          challenge: true,
        },
      },
    },
  });
  if (exact) return exact;
  return prisma.homepageWeek.findFirst({
    where: { published: true, weekOf: { lte: weekOf } },
    include: {
      modules: {
        where: { published: true },
        orderBy: { slot: "asc" },
        include: {
          playerOfTheWeek: {
            include: {
              athleteProfile: {
                include: {
                  sports: { orderBy: [{ isPrimary: "desc" }, { sport: "asc" }] },
                  memberships: {
                    include: {
                      organization: { select: { name: true } },
                      team: { select: { name: true } },
                    },
                    take: 1,
                  },
                },
              },
              featuredVideoReview: {
                include: { trainingVideo: { select: { videoUrl: true, title: true } } },
              },
            },
          },
          challenge: true,
        },
      },
    },
    orderBy: { weekOf: "desc" },
  });
}

export type HomepageCommunityPayload = {
  weekHeadline: string | null;
  playerOfTheWeek: ReturnType<typeof playerOfTheWeekCard> | null;
  modules: Array<{
    id: string;
    kind: string;
    title: string;
    subtitle: string | null;
    body: string | null;
    entries: Array<{
      displayName: string;
      valueLabel: string;
      slug: string | null;
      detail?: string | null;
    }>;
    href?: string | null;
  }>;
};

export async function getPublicHomepageCommunity(): Promise<HomepageCommunityPayload> {
  const week = await getPublishedHomepageWeek();
  const potw = await getCurrentPlayerOfTheWeek();
  const modules: HomepageCommunityPayload["modules"] = [];

  if (week) {
    for (const slot of week.modules) {
      if (slot.kind === "PLAYER_OF_THE_WEEK") continue;
      const resolved = await resolveHomepageModule(slot);
      if (resolved) modules.push(resolved);
    }
  }

  return {
    weekHeadline: week?.headline ?? null,
    playerOfTheWeek: potw ? playerOfTheWeekCard(potw) : null,
    modules,
  };
}

async function resolveHomepageModule(item: {
  id: string;
  kind: string;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  metricDefinitionId: string | null;
  sport: string | null;
  challenge: { id: string; name: string; description: string } | null;
}): Promise<HomepageCommunityPayload["modules"][number] | null> {
  if (item.kind === "CUSTOM") {
    if (!item.title) return null;
    return {
      id: item.id,
      kind: item.kind,
      title: item.title,
      subtitle: item.subtitle,
      body: item.body,
      entries: [],
    };
  }

  if (item.kind === "CURRENT_CHALLENGE") {
    const challenge =
      item.challenge ?? (await getActiveChallenges(item.sport))[0] ?? null;
    if (!challenge) return null;
    return {
      id: item.id,
      kind: item.kind,
      title: item.title || challenge.name,
      subtitle: item.subtitle,
      body: item.body || challenge.description,
      entries: [],
      href: "/signup",
    };
  }

  const metrics = item.metricDefinitionId
    ? [{ id: item.metricDefinitionId }]
    : await listLeaderboardMetrics(item.sport);
  const metricId = metrics[0]?.id;
  if (!metricId && item.kind !== "TRAINING_LEADER") return null;

  if (item.kind === "TOP_PERFORMANCE" && metricId) {
    const rows = await rankMetricResults({
      metricDefinitionId: metricId,
      sport: item.sport,
      period: "30d",
      verification: "VERIFIED",
      publicOnly: true,
      take: 3,
    });
    if (rows.length === 0) return null;
    return {
      id: item.id,
      kind: item.kind,
      title: item.title || "Top verified performance",
      subtitle: item.subtitle,
      body: item.body,
      entries: rows.map((row) => ({
        displayName: row.displayName,
        valueLabel: `${row.value} ${row.unit ?? ""}`.trim(),
        slug: row.slug,
      })),
    };
  }

  if (item.kind === "MOST_IMPROVED" && metricId) {
    const rows = await rankMostImproved({
      metricDefinitionId: metricId,
      sport: item.sport,
      period: "90d",
      publicOnly: true,
      take: 3,
    });
    if (rows.length === 0) return null;
    return {
      id: item.id,
      kind: item.kind,
      title: item.title || "Most improved",
      subtitle: item.subtitle || "It's not where you started. It's where you're going.",
      body: item.body,
      entries: rows.map((row) => ({
        displayName: row.displayName,
        valueLabel: `+${row.value} ${row.unit ?? ""}`.trim(),
        slug: row.slug,
      })),
    };
  }

  if (item.kind === "TRAINING_LEADER") {
    const rows = await rankTrainingLeaders({
      sport: item.sport,
      period: "7d",
      rankingType: "TRAINING_DAYS",
      publicOnly: true,
      take: 3,
    });
    if (rows.length === 0) return null;
    return {
      id: item.id,
      kind: item.kind,
      title: item.title || "Training leaders",
      subtitle: item.subtitle,
      body: item.body,
      entries: rows.map((row) => ({
        displayName: row.displayName,
        valueLabel: `${row.value} ${row.unit ?? "days"}`,
        slug: row.slug,
      })),
    };
  }

  return null;
}
