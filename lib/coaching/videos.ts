import { prisma } from "@/lib/db";
import { COACH_VIDEO_KIND, isCoachVideoKind } from "@/lib/coaching/status";

export async function addCoachProfileVideo(options: {
  coachProfileId: string;
  coachUserId: string;
  title: string;
  videoUrl: string;
  storageKey?: string | null;
  kind?: string;
  publicEligible?: boolean;
  featured?: boolean;
}) {
  const video = await prisma.trainingVideo.create({
    data: {
      coachId: options.coachUserId,
      title: options.title.trim(),
      sourceType: "UPLOAD",
      videoUrl: options.videoUrl,
      storageKey: options.storageKey ?? null,
    },
  });
  const kind = isCoachVideoKind(options.kind ?? "")
    ? options.kind!
    : COACH_VIDEO_KIND.TRAINING;
  const last = await prisma.coachProfileVideo.findFirst({
    where: { coachProfileId: options.coachProfileId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const row = await prisma.coachProfileVideo.create({
    data: {
      coachProfileId: options.coachProfileId,
      trainingVideoId: video.id,
      kind,
      title: options.title.trim(),
      publicEligible: Boolean(options.publicEligible),
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });
  if (options.featured) {
    await prisma.coachProfile.update({
      where: { id: options.coachProfileId },
      data: {
        featuredVideoId: video.id,
        featuredVideoPublic: Boolean(options.publicEligible),
      },
    });
  }
  return { video, row };
}

export async function setCoachFeaturedVideo(options: {
  coachProfileId: string;
  coachUserId: string;
  trainingVideoId: string | null;
  publicEligible?: boolean;
}) {
  if (options.trainingVideoId) {
    const owned = await prisma.trainingVideo.findFirst({
      where: {
        id: options.trainingVideoId,
        coachId: options.coachUserId,
      },
      select: { id: true },
    });
    if (!owned) throw new Error("Choose one of your own videos.");
  }
  return prisma.coachProfile.update({
    where: { id: options.coachProfileId },
    data: {
      featuredVideoId: options.trainingVideoId,
      featuredVideoPublic: Boolean(options.publicEligible),
    },
  });
}

export async function setCoachVideoPublic(options: {
  coachProfileId: string;
  videoRowId: string;
  publicEligible: boolean;
}) {
  return prisma.coachProfileVideo.updateMany({
    where: { id: options.videoRowId, coachProfileId: options.coachProfileId },
    data: { publicEligible: options.publicEligible },
  });
}
