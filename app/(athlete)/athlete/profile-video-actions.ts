"use server";

import { revalidatePath } from "next/cache";

import { requireAthleteContext } from "@/lib/athlete-dashboard";
import { prisma } from "@/lib/db";
import { resolveDirectVideoMedia } from "@/lib/direct-video-media";
import { isProductionRuntime } from "@/lib/env";
import { isObjectStorageConfigured, storeVideoFile } from "@/lib/storage";
import { reportVideoUploadFailure } from "@/lib/video-upload-errors";
import { MAX_VIDEO_UPLOAD_BYTES } from "@/lib/video-upload-limits";
import {
  PROFILE_VIDEO_TYPES,
  VIDEO_SHOWCASE_VISIBILITY,
  isVideoShowcaseVisibility,
} from "@/lib/video-categories";
import {
  archiveLibraryVideo,
  createAthleteLibraryVideo,
  setFeaturedVideo,
  setHighlightVideo,
  updateLibraryVideoDetails,
  updateVideoShowcaseVisibility,
} from "@/lib/community/profile-videos";
import { submitVideoToTrain2Play } from "@/lib/community/content-submissions";

export type ProfileVideoActionState = {
  error?: string;
  success?: string;
  reviewId?: string;
  uploaded?: boolean;
};

async function revalidateProfileVideos(profileId?: string) {
  revalidatePath("/athlete/profile");
  revalidatePath("/athlete/profile/edit");
  revalidatePath("/athlete/videos");
  if (!profileId) return;
  const profile = await prisma.athleteProfile.findUnique({
    where: { id: profileId },
    select: { publicSlug: true },
  });
  if (profile?.publicSlug) revalidatePath(`/p/${profile.publicSlug}`);
}

async function resolveStoredVideo(formData: FormData, userId: string) {
  const file = formData.get("videoFile");
  const direct = await resolveDirectVideoMedia(formData, userId);
  if (!direct.ok) return { error: direct.error as string };
  let stored = direct.media;
  if (!stored) {
    if (!(file instanceof File) || file.size === 0) {
      return { error: "Choose a video from your device." };
    }
    if (file.size > MAX_VIDEO_UPLOAD_BYTES) {
      return { error: "Video must be 100 MB or smaller." };
    }
    if (isProductionRuntime() && !isObjectStorageConfigured()) {
      return {
        error:
          "Video uploads need Cloudinary or R2. Ask your admin to configure storage.",
      };
    }
    const ext =
      file.name.split(".").pop()?.toLowerCase() ||
      (file.type === "video/quicktime" ? "mov" : "mp4");
    const filename = `${crypto.randomUUID()}.${ext}`;
    const contentType =
      file.type && file.type !== "application/octet-stream"
        ? file.type
        : ext === "mov"
          ? "video/quicktime"
          : "video/mp4";
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const uploaded = await storeVideoFile(buffer, filename, contentType);
      stored = { url: uploaded.videoUrl, storageKey: uploaded.storageKey };
    } catch (error) {
      return {
        error: reportVideoUploadFailure(error, {
          surface: "athlete-profile-video",
          userId,
          file,
        }),
      };
    }
  }
  return { stored };
}

export async function uploadProfileVideoAction(
  _prev: ProfileVideoActionState,
  formData: FormData,
): Promise<ProfileVideoActionState> {
  const ctx = await requireAthleteContext();
  const generated = `Clip ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  const title = String(formData.get("title") ?? "").trim() || generated;
  const sport = String(formData.get("sport") ?? "").trim() || ctx.sport || "Multi-sport";
  const category = String(formData.get("category") ?? "").trim() || "Other";
  const description = String(formData.get("description") ?? "").trim() || null;
  const visibilityRaw = String(formData.get("showcaseVisibility") ?? VIDEO_SHOWCASE_VISIBILITY.PRIVATE);
  const showcaseVisibility = isVideoShowcaseVisibility(visibilityRaw)
    ? visibilityRaw
    : VIDEO_SHOWCASE_VISIBILITY.PRIVATE;
  const metricEntryId = String(formData.get("metricEntryId") ?? "").trim() || null;

  if (
    !PROFILE_VIDEO_TYPES.includes(category as (typeof PROFILE_VIDEO_TYPES)[number])
  ) {
    return { error: "Choose a video type." };
  }

  const resolved = await resolveStoredVideo(formData, ctx.userId);
  if ("error" in resolved && resolved.error) return { error: resolved.error };
  const stored = "stored" in resolved ? resolved.stored : null;
  if (!stored) return { error: "Choose a video from your device." };

  try {
    if (metricEntryId) {
      const owned = await prisma.metricEntry.findFirst({
        where: { id: metricEntryId, athleteProfileId: ctx.profileId },
        select: { id: true },
      });
      if (!owned) return { error: "Choose one of your own results." };
    }

    const { review } = await createAthleteLibraryVideo({
      uploadedByUserId: ctx.userId,
      athleteProfileId: ctx.profileId,
      legacyAthleteId: ctx.athleteId,
      title,
      sport,
      category,
      description,
      videoUrl: stored.url,
      storageKey: stored.storageKey,
      showcaseVisibility,
      metricEntryId,
    });
    await revalidateProfileVideos(ctx.profileId);
    return {
      success: "Video uploaded.",
      reviewId: review.id,
      uploaded: true,
    };
  } catch (error) {
    return {
      error: reportVideoUploadFailure(error, {
        surface: "athlete-profile-video",
        userId: ctx.userId,
        file: formData.get("videoFile") instanceof File ? (formData.get("videoFile") as File) : null,
      }),
    };
  }
}

export async function setFeaturedProfileVideoAction(reviewId: string) {
  const ctx = await requireAthleteContext();
  await setFeaturedVideo(ctx.profileId, reviewId);
  await revalidateProfileVideos(ctx.profileId);
  return { success: "Featured video updated." };
}

export async function removeFeaturedProfileVideoAction() {
  const ctx = await requireAthleteContext();
  await setFeaturedVideo(ctx.profileId, null);
  await revalidateProfileVideos(ctx.profileId);
  return { success: "Featured video removed." };
}

export async function toggleHighlightProfileVideoAction(reviewId: string, add: boolean) {
  const ctx = await requireAthleteContext();
  await setHighlightVideo({ athleteProfileId: ctx.profileId, reviewId, add });
  await revalidateProfileVideos(ctx.profileId);
  return { success: add ? "Added to highlights." : "Removed from highlights." };
}

export async function updateProfileVideoVisibilityAction(reviewId: string, visibility: string) {
  const ctx = await requireAthleteContext();
  await updateVideoShowcaseVisibility({
    athleteProfileId: ctx.profileId,
    reviewId,
    visibility,
  });
  await revalidateProfileVideos(ctx.profileId);
  return { success: "Visibility updated." };
}

export async function archiveProfileVideoAction(reviewId: string) {
  const ctx = await requireAthleteContext();
  await archiveLibraryVideo({ athleteProfileId: ctx.profileId, reviewId });
  await revalidateProfileVideos(ctx.profileId);
  return { success: "Video archived." };
}

export async function updateProfileVideoDetailsAction(
  _prev: ProfileVideoActionState,
  formData: FormData,
): Promise<ProfileVideoActionState> {
  const ctx = await requireAthleteContext();
  const reviewId = String(formData.get("reviewId") ?? "").trim();
  if (!reviewId) return { error: "Video not found." };
  try {
    await updateLibraryVideoDetails({
      athleteProfileId: ctx.profileId,
      reviewId,
      title: String(formData.get("title") ?? "").trim() || undefined,
      category: String(formData.get("category") ?? "").trim() || undefined,
      metricEntryId: String(formData.get("metricEntryId") ?? "").trim() || null,
    });
    await revalidateProfileVideos(ctx.profileId);
    return { success: "Video details saved.", reviewId };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save details." };
  }
}

export async function submitProfileVideoToTrain2PlayAction(
  _prev: ProfileVideoActionState,
  formData: FormData,
): Promise<ProfileVideoActionState> {
  const ctx = await requireAthleteContext();
  const reviewId = String(formData.get("reviewId") ?? "").trim();
  if (!reviewId) return { error: "Choose a video to submit." };
  try {
    await submitVideoToTrain2Play({
      athleteProfileId: ctx.profileId,
      videoReviewId: reviewId,
      category: String(formData.get("category") ?? "").trim(),
      note: String(formData.get("note") ?? "").trim() || null,
      featurePermission: formData.get("featurePermission") === "on",
      socialMediaPermission: formData.get("socialMediaPermission") === "on",
      guardianApproved: formData.get("guardianApproved") === "on",
    });
    revalidatePath("/admin/community");
    revalidatePath("/admin/community/content");
    await revalidateProfileVideos(ctx.profileId);
    return { success: "Submitted to Train2Play.", reviewId };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not submit." };
  }
}
