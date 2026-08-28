import { prisma } from "@/lib/db";
import { awardAchievement, removeAchievement } from "@/lib/community/achievements";
import { buildSafeIdentity } from "@/lib/community/privacy";

export async function getCurrentPlayerOfTheWeek(now = new Date()) {
  return prisma.playerOfTheWeek.findFirst({
    where: {
      published: true,
      startDate: { lte: now },
      endDate: { gte: now },
    },
    include: {
      athleteProfile: {
        include: {
          sports: { orderBy: [{ isPrimary: "desc" }, { sport: "asc" }] },
          memberships: {
            where: { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
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
    orderBy: { startDate: "desc" },
  });
}

export async function listPlayerOfTheWeekHistory(take = 24) {
  return prisma.playerOfTheWeek.findMany({
    where: { published: true },
    include: {
      athleteProfile: {
        include: {
          sports: { orderBy: [{ isPrimary: "desc" }, { sport: "asc" }] },
        },
      },
    },
    orderBy: { startDate: "desc" },
    take,
  });
}

export async function publishPlayerOfTheWeek(id: string) {
  const row = await prisma.playerOfTheWeek.update({
    where: { id },
    data: { published: true, publishedAt: new Date() },
  });
  await awardAchievement({
    athleteProfileId: row.athleteProfileId,
    key: "PLAYER_OF_THE_WEEK",
    occurrenceKey: `PLAYER_OF_THE_WEEK:${row.id}`,
    metadata: { playerOfTheWeekId: row.id, highlight: row.highlight },
    earnedAt: row.startDate,
  });
  return row;
}

export async function unpublishPlayerOfTheWeek(id: string) {
  const row = await prisma.playerOfTheWeek.update({
    where: { id },
    data: { published: false },
  });
  await removeAchievement({
    athleteProfileId: row.athleteProfileId,
    occurrenceKey: `PLAYER_OF_THE_WEEK:${row.id}`,
  });
  return row;
}

export function playerOfTheWeekCard(row: NonNullable<Awaited<ReturnType<typeof getCurrentPlayerOfTheWeek>>>) {
  const identity = buildSafeIdentity(row.athleteProfile);
  const publicSafe = row.athleteProfile.profileVisibility === "PUBLIC";
  return {
    id: row.id,
    identity,
    slug: publicSafe ? row.athleteProfile.publicSlug : null,
    avatarUrl: publicSafe ? row.athleteProfile.avatarUrl : null,
    description: row.description,
    highlight: row.highlight,
    sport: row.sport || identity.sport,
    videoUrl: row.featuredVideoReview?.trainingVideo.videoUrl ?? null,
    videoTitle: row.featuredVideoReview?.trainingVideo.title ?? row.featuredVideoReview?.title ?? null,
    startDate: row.startDate,
    endDate: row.endDate,
  };
}
