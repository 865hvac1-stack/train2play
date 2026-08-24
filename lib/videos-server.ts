import { prisma } from "@/lib/db";

export async function getVideosForCoach(coachId: string) {
  return prisma.trainingVideo.findMany({
    where: { coachId },
    orderBy: { updatedAt: "desc" },
    include: {
      athlete: { select: { id: true, firstName: true, lastName: true } },
      _count: { select: { annotations: true } },
      annotations: {
        orderBy: { timestampMs: "desc" },
        take: 1,
        select: { timestampMs: true },
      },
    },
  });
}

export async function getVideoForCoach(coachId: string, videoId: string) {
  return prisma.trainingVideo.findFirst({
    where: { id: videoId, coachId },
    include: {
      athlete: { select: { id: true, firstName: true, lastName: true } },
      annotations: { orderBy: { timestampMs: "asc" } },
    },
  });
}

export async function getVideosForAthlete(coachId: string, athleteId: string) {
  return prisma.trainingVideo.findMany({
    where: { coachId, athleteId },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { annotations: true } },
    },
  });
}
