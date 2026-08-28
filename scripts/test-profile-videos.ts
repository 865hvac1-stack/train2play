/**
 * Player Profile library videos + content submissions.
 * Run: npx tsx scripts/test-profile-videos.ts
 */
import "dotenv/config";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";

import { createPrismaClient } from "../lib/db";
import { createAthleteLibraryVideo, isEligibleForPublicProfileVideo, setFeaturedVideo, setHighlightVideo, archiveLibraryVideo } from "../lib/community/profile-videos";
import { submitVideoToTrain2Play } from "../lib/community/content-submissions";
import { VIDEO_PURPOSE, VIDEO_REVIEW_STATUS, VIDEO_SHOWCASE_VISIBILITY } from "../lib/video-categories";
import { DEMO_VIDEO_URL } from "../lib/videos";
import { profileCompletion } from "../lib/community/profile";

const prisma = createPrismaClient();
const stamp = Date.now();

async function main() {
  const passwordHash = await bcrypt.hash("TestPass123!", 10);
  const athleteUser = await prisma.user.create({
    data: {
      name: "Pat Film",
      email: `pat.film.${stamp}@example.com`,
      passwordHash,
      role: "ATHLETE",
    },
  });
  const profile = await prisma.athleteProfile.create({
    data: {
      userId: athleteUser.id,
      firstName: "Pat",
      lastName: "Film",
      primarySport: "Baseball",
      dateOfBirth: new Date("2000-01-01"),
      sports: { create: [{ sport: "Baseball", isPrimary: true, position: "SS" }] },
    },
  });

  const { review, video } = await createAthleteLibraryVideo({
    uploadedByUserId: athleteUser.id,
    athleteProfileId: profile.id,
    legacyAthleteId: null,
    title: "Exit velo clip",
    sport: "Baseball",
    category: "New PR",
    videoUrl: DEMO_VIDEO_URL,
    showcaseVisibility: VIDEO_SHOWCASE_VISIBILITY.PRIVATE,
  });

  assert.equal(review.status, VIDEO_REVIEW_STATUS.LIBRARY);
  assert.equal(review.purpose, VIDEO_PURPOSE.LIBRARY);
  assert.equal(review.coachUserId, athleteUser.id);
  assert.equal(video.coachId, athleteUser.id);
  assert.equal(review.showcaseVisibility, VIDEO_SHOWCASE_VISIBILITY.PRIVATE);

  const notifications = await prisma.appNotification.count({
    where: { entityId: review.id },
  });
  assert.equal(notifications, 0, "library upload must not notify a coach");

  await setFeaturedVideo(profile.id, review.id);
  await setHighlightVideo({ athleteProfileId: profile.id, reviewId: review.id, add: true });
  const featured = await prisma.athleteProfile.findUniqueOrThrow({
    where: { id: profile.id },
    select: { featuredVideoReviewId: true, publicVideoSharingEnabled: true },
  });
  assert.equal(featured.featuredVideoReviewId, review.id);

  await archiveLibraryVideo({ athleteProfileId: profile.id, reviewId: review.id });
  const archived = await prisma.videoReview.findUniqueOrThrow({
    where: { id: review.id },
    select: { status: true, showcaseVisibility: true },
  });
  assert.equal(archived.status, VIDEO_REVIEW_STATUS.ARCHIVED);
  assert.equal(archived.showcaseVisibility, VIDEO_SHOWCASE_VISIBILITY.PRIVATE);
  const afterArchive = await prisma.athleteProfile.findUniqueOrThrow({
    where: { id: profile.id },
    select: { featuredVideoReviewId: true },
  });
  assert.equal(afterArchive.featuredVideoReviewId, null);

  const second = await createAthleteLibraryVideo({
    uploadedByUserId: athleteUser.id,
    athleteProfileId: profile.id,
    legacyAthleteId: null,
    title: "Exit velo clip",
    sport: "Baseball",
    category: "New PR",
    videoUrl: DEMO_VIDEO_URL,
    showcaseVisibility: VIDEO_SHOWCASE_VISIBILITY.PRIVATE,
  });
  const { review: liveReview, video: liveVideo } = second;

  assert.equal(
    isEligibleForPublicProfileVideo({
      publicVideoSharingEnabled: false,
      showcaseVisibility: VIDEO_SHOWCASE_VISIBILITY.PUBLIC_PROFILE,
    }),
    false,
    "private sharing flag blocks public playback",
  );
  assert.equal(
    isEligibleForPublicProfileVideo({
      publicVideoSharingEnabled: true,
      showcaseVisibility: VIDEO_SHOWCASE_VISIBILITY.PRIVATE,
    }),
    false,
    "private clip never leaks to public profile",
  );

  const completionEmpty = profileCompletion({
    avatarUrl: null,
    coverImageUrl: null,
    bio: null,
    featuredVideoReviewId: null,
    instagramUrl: null,
    xUrl: null,
    tiktokUrl: null,
    youtubeUrl: null,
    sports: [{ position: null }],
    metricCount: 0,
    videoCount: 0,
  });
  assert.equal(
    completionEmpty.missing.find((item) => item.id === "video")?.href,
    "/athlete/profile?upload=1",
  );
  const completionHasClips = profileCompletion({
    avatarUrl: null,
    coverImageUrl: null,
    bio: null,
    featuredVideoReviewId: null,
    instagramUrl: null,
    xUrl: null,
    tiktokUrl: null,
    youtubeUrl: null,
    sports: [{ position: "SS" }],
    metricCount: 0,
    videoCount: 1,
  });
  assert.equal(
    completionHasClips.missing.find((item) => item.id === "video")?.href,
    "/athlete/profile?choose=1",
  );

  const submission = await submitVideoToTrain2Play({
    athleteProfileId: profile.id,
    videoReviewId: liveReview.id,
    category: "New PR",
    note: "82 mph",
    featurePermission: true,
    socialMediaPermission: false,
    guardianApproved: false,
  });
  assert.equal(submission.status, "PENDING");
  assert.equal(submission.videoReviewId, liveReview.id);

  try {
    await submitVideoToTrain2Play({
      athleteProfileId: profile.id,
      videoReviewId: liveReview.id,
      category: "New PR",
      featurePermission: true,
      socialMediaPermission: false,
      guardianApproved: false,
    });
    throw new Error("duplicate pending submission should fail");
  } catch (error) {
    assert.match(String(error), /already in the Train2Play queue/);
  }

  await prisma.athleteContentSubmission.delete({ where: { id: submission.id } });
  await prisma.videoReview.delete({ where: { id: liveReview.id } });
  await prisma.trainingVideo.delete({ where: { id: liveVideo.id } });
  await prisma.videoReview.delete({ where: { id: review.id } });
  await prisma.trainingVideo.delete({ where: { id: video.id } });
  await prisma.athleteProfile.delete({ where: { id: profile.id } });
  await prisma.user.delete({ where: { id: athleteUser.id } });
  console.log("profile video tests passed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
