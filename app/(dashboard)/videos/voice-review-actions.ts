"use server";

import { revalidatePath } from "next/cache";

import { requireCoach } from "@/lib/session";
import { isProductionRuntime } from "@/lib/env";
import { isObjectStorageConfigured } from "@/lib/storage";
import { saveVoiceReview } from "@/lib/voice-reviews";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

export type VoiceReviewActionState = {
  error?: string;
  success?: string;
};

export async function saveVoiceReviewAction(
  videoReviewId: string,
  _prev: VoiceReviewActionState,
  formData: FormData,
): Promise<VoiceReviewActionState> {
  const coach = await requireCoach();
  const audio = formData.get("audio");
  const durationMs = Number(formData.get("durationMs"));
  const timelineRaw = String(formData.get("timeline") ?? "");

  if (!(audio instanceof File) || audio.size === 0) {
    return { error: "Record your voice review before saving" };
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return { error: "Voice review is too large. Keep it under 30 minutes." };
  }
  if (isProductionRuntime() && !isObjectStorageConfigured()) {
    return {
      error:
        "Private voice storage is not configured. Ask your admin to configure Cloudinary or S3.",
    };
  }

  let timeline: unknown;
  try {
    timeline = JSON.parse(timelineRaw);
  } catch {
    return { error: "The synchronized review timeline is invalid" };
  }

  try {
    await saveVoiceReview({
      videoReviewId,
      coachUserId: coach.id,
      audio: Buffer.from(await audio.arrayBuffer()),
      audioMimeType: audio.type || "audio/webm",
      durationMs,
      timeline,
    });
    revalidatePath(`/videos/reviews/${videoReviewId}`);
    revalidatePath(`/athlete/videos/reviews/${videoReviewId}`);
    return {
      success:
        "Voice review saved. Add written notes or training, then complete the review below.",
    };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not save voice review",
    };
  }
}
