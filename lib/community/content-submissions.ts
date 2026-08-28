import { isMinor } from "@/lib/consent";
import { prisma } from "@/lib/db";
import { PROFILE_VIDEO_TYPES } from "@/lib/video-categories";
import { collectSocialLinks, publicSocialLinks, buildSafeIdentity } from "@/lib/community/privacy";
import { getAppBaseUrl } from "@/lib/app-url";
import { ensurePublicSlug } from "@/lib/community/profile";

export const CONTENT_SUBMISSION_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;

export async function submitVideoToTrain2Play(options: {
  athleteProfileId: string;
  videoReviewId: string;
  category: string;
  note?: string | null;
  featurePermission: boolean;
  socialMediaPermission: boolean;
  guardianApproved: boolean;
}) {
  const profile = await prisma.athleteProfile.findUnique({
    where: { id: options.athleteProfileId },
    select: { id: true, dateOfBirth: true },
  });
  if (!profile) throw new Error("Profile not found.");

  const review = await prisma.videoReview.findFirst({
    where: { id: options.videoReviewId, athleteProfileId: options.athleteProfileId },
    select: { id: true, metricEntryId: true },
  });
  if (!review) throw new Error("Choose one of your own videos.");

  const existing = await prisma.athleteContentSubmission.findFirst({
    where: {
      videoReviewId: review.id,
      status: CONTENT_SUBMISSION_STATUS.PENDING,
    },
    select: { id: true },
  });
  if (existing) {
    throw new Error("This video is already in the Train2Play queue.");
  }

  const category = PROFILE_VIDEO_TYPES.includes(
    options.category as (typeof PROFILE_VIDEO_TYPES)[number],
  )
    ? options.category
    : "Other";

  const minor = profile.dateOfBirth ? isMinor(profile.dateOfBirth) : true;
  if (minor && !options.guardianApproved) {
    throw new Error("A parent or guardian must approve this submission.");
  }

  return prisma.athleteContentSubmission.create({
    data: {
      athleteProfileId: options.athleteProfileId,
      videoReviewId: review.id,
      category,
      note: options.note?.trim() || null,
      featurePermission: options.featurePermission,
      socialMediaPermission: options.socialMediaPermission,
      guardianApproved: minor ? true : options.guardianApproved,
      metricEntryId: review.metricEntryId,
      status: CONTENT_SUBMISSION_STATUS.PENDING,
    },
  });
}

export async function getContentSubmissionAdminPayload(submissionId: string) {
  const row = await prisma.athleteContentSubmission.findUnique({
    where: { id: submissionId },
    include: {
      videoReview: {
        include: {
          trainingVideo: { select: { videoUrl: true, title: true } },
          metricEntry: {
            include: { metricDefinition: true },
          },
        },
      },
      athleteProfile: {
        include: {
          sports: { orderBy: [{ isPrimary: "desc" }, { sport: "asc" }] },
          memberships: {
            include: {
              organization: { select: { name: true } },
              team: { select: { name: true } },
            },
            take: 2,
          },
        },
      },
    },
  });
  if (!row) return null;

  const slug = await ensurePublicSlug(row.athleteProfile);
  const identity = buildSafeIdentity(row.athleteProfile);
  const socials = publicSocialLinks({
    links: collectSocialLinks(row.athleteProfile),
    dateOfBirth: row.athleteProfile.dateOfBirth,
    profileVisibility: "PUBLIC",
    previewAsPublic: true,
  });

  const metric = row.videoReview.metricEntry;
  let metricSummary = null;
  if (metric) {
    const history = await prisma.metricEntry.findMany({
      where: {
        athleteProfileId: row.athleteProfileId,
        metricDefinitionId: metric.metricDefinitionId,
        resultStatus: "ACTIVE",
      },
      orderBy: { recordedAt: "asc" },
      select: { value: true, recordedAt: true },
    });
    const previous = history.filter((entry) => entry.recordedAt < metric.recordedAt).at(-1) ?? null;
    const delta =
      previous == null
        ? null
        : metric.metricDefinition.direction === "LOWER_IS_BETTER"
          ? previous.value - metric.value
          : metric.value - previous.value;
    metricSummary = {
      name: metric.metricDefinition.name,
      unit: metric.metricDefinition.unit,
      current: metric.value,
      previous: previous?.value ?? null,
      delta,
      verificationType: metric.verificationType,
      recordedAt: metric.recordedAt,
    };
  }

  return {
    submission: row,
    identity,
    profileUrl: `${getAppBaseUrl()}/p/${slug}`,
    socials,
    metricSummary,
  };
}
