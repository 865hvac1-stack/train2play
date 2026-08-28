import { prisma } from "@/lib/db";
import {
  VIDEO_PURPOSE,
  VIDEO_REVIEW_STATUS,
  VIDEO_SHOWCASE_VISIBILITY,
  isVideoShowcaseVisibility,
  type VideoShowcaseVisibility,
} from "@/lib/video-categories";

export function isEligibleForPublicProfileVideo(options: {
  publicVideoSharingEnabled: boolean;
  showcaseVisibility: string;
}) {
  return (
    options.publicVideoSharingEnabled &&
    options.showcaseVisibility === VIDEO_SHOWCASE_VISIBILITY.PUBLIC_PROFILE
  );
}

export async function createAthleteLibraryVideo(options: {
  uploadedByUserId: string;
  athleteProfileId: string;
  legacyAthleteId: string | null;
  title: string;
  sport: string;
  category: string;
  description?: string | null;
  videoUrl: string;
  storageKey?: string | null;
  showcaseVisibility?: VideoShowcaseVisibility;
  metricEntryId?: string | null;
  achievementId?: string | null;
}) {
  const video = await prisma.trainingVideo.create({
    data: {
      coachId: options.uploadedByUserId,
      athleteId: options.legacyAthleteId,
      title: options.title.trim(),
      description: options.description?.trim() || null,
      sourceType: "UPLOAD",
      videoUrl: options.videoUrl,
      storageKey: options.storageKey ?? null,
    },
  });

  const review = await prisma.videoReview.create({
    data: {
      trainingVideoId: video.id,
      athleteProfileId: options.athleteProfileId,
      coachUserId: options.uploadedByUserId,
      uploadedByUserId: options.uploadedByUserId,
      title: options.title.trim(),
      sport: options.sport.trim(),
      category: options.category.trim(),
      athleteNote: options.description?.trim() || null,
      status: VIDEO_REVIEW_STATUS.LIBRARY,
      purpose: VIDEO_PURPOSE.LIBRARY,
      showcaseVisibility: options.showcaseVisibility ?? VIDEO_SHOWCASE_VISIBILITY.PRIVATE,
      metricEntryId: options.metricEntryId ?? null,
      achievementId: options.achievementId ?? null,
    },
  });

  return { review, video };
}

export async function assertAthleteOwnsReview(athleteProfileId: string, reviewId: string) {
  const review = await prisma.videoReview.findFirst({
    where: { id: reviewId, athleteProfileId },
    select: {
      id: true,
      title: true,
      showcaseVisibility: true,
      metricEntryId: true,
    },
  });
  if (!review) throw new Error("Choose one of your own videos.");
  return review;
}

export async function setFeaturedVideo(athleteProfileId: string, reviewId: string | null) {
  if (reviewId) await assertAthleteOwnsReview(athleteProfileId, reviewId);
  return prisma.athleteProfile.update({
    where: { id: athleteProfileId },
    data: { featuredVideoReviewId: reviewId },
  });
}

export async function setHighlightVideo(options: {
  athleteProfileId: string;
  reviewId: string;
  add: boolean;
}) {
  await assertAthleteOwnsReview(options.athleteProfileId, options.reviewId);
  if (!options.add) {
    await prisma.athleteProfileVideoShowcase.deleteMany({
      where: {
        athleteProfileId: options.athleteProfileId,
        videoReviewId: options.reviewId,
      },
    });
    return;
  }
  const last = await prisma.athleteProfileVideoShowcase.findFirst({
    where: { athleteProfileId: options.athleteProfileId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  await prisma.athleteProfileVideoShowcase.upsert({
    where: {
      athleteProfileId_videoReviewId: {
        athleteProfileId: options.athleteProfileId,
        videoReviewId: options.reviewId,
      },
    },
    update: {},
    create: {
      athleteProfileId: options.athleteProfileId,
      videoReviewId: options.reviewId,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });
}

export async function updateVideoShowcaseVisibility(options: {
  athleteProfileId: string;
  reviewId: string;
  visibility: string;
}) {
  if (!isVideoShowcaseVisibility(options.visibility)) {
    throw new Error("Choose a valid visibility.");
  }
  await assertAthleteOwnsReview(options.athleteProfileId, options.reviewId);
  return prisma.videoReview.update({
    where: { id: options.reviewId },
    data: { showcaseVisibility: options.visibility },
  });
}

export async function archiveLibraryVideo(options: {
  athleteProfileId: string;
  reviewId: string;
}) {
  const review = await prisma.videoReview.findFirst({
    where: { id: options.reviewId, athleteProfileId: options.athleteProfileId },
    select: { id: true, purpose: true },
  });
  if (!review) throw new Error("Choose one of your own videos.");

  await prisma.athleteProfileVideoShowcase.deleteMany({
    where: {
      athleteProfileId: options.athleteProfileId,
      videoReviewId: options.reviewId,
    },
  });
  await prisma.athleteProfile.updateMany({
    where: {
      id: options.athleteProfileId,
      featuredVideoReviewId: options.reviewId,
    },
    data: { featuredVideoReviewId: null },
  });

  if (review.purpose === VIDEO_PURPOSE.LIBRARY) {
    await prisma.videoReview.update({
      where: { id: options.reviewId },
      data: {
        status: VIDEO_REVIEW_STATUS.ARCHIVED,
        showcaseVisibility: VIDEO_SHOWCASE_VISIBILITY.PRIVATE,
      },
    });
    return;
  }

  await prisma.videoReview.update({
    where: { id: options.reviewId },
    data: { showcaseVisibility: VIDEO_SHOWCASE_VISIBILITY.PRIVATE },
  });
}

export async function updateLibraryVideoDetails(options: {
  athleteProfileId: string;
  reviewId: string;
  title?: string;
  category?: string;
  metricEntryId?: string | null;
}) {
  await assertAthleteOwnsReview(options.athleteProfileId, options.reviewId);
  if (options.metricEntryId) {
    const metric = await prisma.metricEntry.findFirst({
      where: {
        id: options.metricEntryId,
        athleteProfileId: options.athleteProfileId,
      },
      select: { id: true },
    });
    if (!metric) throw new Error("Choose one of your own results.");
  }
  return prisma.videoReview.update({
    where: { id: options.reviewId },
    data: {
      ...(options.title ? { title: options.title.trim() } : {}),
      ...(options.category ? { category: options.category.trim() } : {}),
      ...(options.metricEntryId !== undefined ? { metricEntryId: options.metricEntryId } : {}),
    },
  });
}
