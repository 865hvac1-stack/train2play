"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAthleteContext } from "@/lib/athlete-dashboard";
import { resolveDirectVideoMedia } from "@/lib/direct-video-media";
import { isProductionRuntime } from "@/lib/env";
import { isObjectStorageConfigured, storeVideoFile } from "@/lib/storage";
import { submitVideoForReview } from "@/lib/video-reviews";
import { getVideoCategoriesForSport } from "@/lib/video-categories";
import { prisma } from "@/lib/db";
import { reportVideoUploadFailure } from "@/lib/video-upload-errors";
import { MAX_VIDEO_UPLOAD_BYTES } from "@/lib/video-upload-limits";

export type AthleteVideoActionState = {
  error?: string;
  success?: string;
  reviewId?: string;
};

export async function submitAthleteVideoReviewAction(
  _prev: AthleteVideoActionState,
  formData: FormData,
): Promise<AthleteVideoActionState> {
  const ctx = await requireAthleteContext();

  const title = String(formData.get("title") ?? "").trim();
  const sport = String(formData.get("sport") ?? "").trim() || ctx.sport || "Multi-sport";
  const category = String(formData.get("category") ?? "").trim();
  const athleteNote = String(formData.get("athleteNote") ?? "").trim();
  const coachUserId = String(formData.get("coachUserId") ?? "").trim();
  const file = formData.get("videoFile");

  if (!title) return { error: "Add a title for this video" };
  if (!category) return { error: "Choose a category" };
  if (!coachUserId) return { error: "Select a connected coach" };

  const categories = getVideoCategoriesForSport(sport);
  if (!categories.includes(category)) {
    return { error: "Choose a valid category for this sport" };
  }

  const direct = await resolveDirectVideoMedia(formData, ctx.userId);
  if (!direct.ok) return { error: direct.error };
  let stored = direct.media;
  if (!stored) {
    if (!(file instanceof File) || file.size === 0) {
      return { error: "Choose a video from your device" };
    }
    if (file.size > MAX_VIDEO_UPLOAD_BYTES) {
      return { error: "Video must be 100 MB or smaller" };
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
          surface: "athlete-video-review",
          userId: ctx.userId,
          file,
        }),
      };
    }
  }

  try {
    const { review } = await submitVideoForReview({
      uploadedByUserId: ctx.userId,
      athleteProfileId: ctx.profileId,
      legacyAthleteId: ctx.athleteId,
      coachUserId,
      title,
      sport,
      category,
      athleteNote: athleteNote || null,
      videoUrl: stored.url,
      storageKey: stored.storageKey,
      sourceType: "UPLOAD",
    });

    revalidatePath("/athlete/videos");
    revalidatePath("/videos");
    revalidatePath("/dashboard");
    redirect(`/athlete/videos/reviews/${review.id}?sent=1`);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof (error as { digest?: string }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    return {
      error: reportVideoUploadFailure(error, {
        surface: "athlete-video-review",
        userId: ctx.userId,
        file: file instanceof File ? file : null,
      }),
    };
  }
}

export async function getApprovedCoachesForAthleteAction() {
  const ctx = await requireAthleteContext();
  return prisma.coachAthleteConnection.findMany({
    where: {
      athleteProfileId: ctx.profileId,
      status: "APPROVED",
    },
    include: {
      coachUser: {
        select: {
          id: true,
          name: true,
          lookingForSport: true,
          organizationMemberships: {
            take: 1,
            include: { organization: { select: { name: true } } },
          },
        },
      },
    },
    orderBy: { approvedAt: "desc" },
  });
}
