"use server";

import { revalidatePath } from "next/cache";

import { requireCoach } from "@/lib/session";
import {
  assignDrillFromReview,
  assignPlanFromReview,
  completeVideoReview,
  markReviewInProgress,
} from "@/lib/video-reviews";
import { prisma } from "@/lib/db";

export type CoachReviewActionState = {
  error?: string;
  success?: string;
};

export async function saveCoachFeedbackAction(
  reviewId: string,
  _prev: CoachReviewActionState,
  formData: FormData,
): Promise<CoachReviewActionState> {
  const coach = await requireCoach();
  const feedback = String(formData.get("coachFeedback") ?? "").trim();
  if (!feedback) return { error: "Add written feedback before completing" };

  try {
    await markReviewInProgress(reviewId, coach.id);
    await completeVideoReview({
      reviewId,
      coachUserId: coach.id,
      coachFeedback: feedback,
    });
    revalidatePath(`/videos/reviews/${reviewId}`);
    revalidatePath("/videos");
    revalidatePath("/athlete/videos");
    return { success: "Review completed. Athlete has been notified." };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not complete review",
    };
  }
}

export async function saveCoachFeedbackDraftAction(
  reviewId: string,
  _prev: CoachReviewActionState,
  formData: FormData,
): Promise<CoachReviewActionState> {
  const coach = await requireCoach();
  const feedback = String(formData.get("coachFeedback") ?? "").trim();

  const review = await prisma.videoReview.findFirst({
    where: { id: reviewId, coachUserId: coach.id },
  });
  if (!review) return { error: "Review not found" };

  await prisma.videoReview.update({
    where: { id: reviewId },
    data: {
      coachFeedback: feedback || null,
      status:
        review.status === "AWAITING_REVIEW" ? "IN_REVIEW" : review.status,
    },
  });
  revalidatePath(`/videos/reviews/${reviewId}`);
  return { success: "Feedback draft saved" };
}

export async function assignDrillFromReviewAction(
  reviewId: string,
  _prev: CoachReviewActionState,
  formData: FormData,
): Promise<CoachReviewActionState> {
  const coach = await requireCoach();
  const drillId = String(formData.get("drillId") ?? "").trim();
  const setsRaw = String(formData.get("sets") ?? "").trim();
  const repsRaw = String(formData.get("reps") ?? "").trim();
  const coachNote = String(formData.get("coachNote") ?? "").trim();

  if (!drillId) return { error: "Select a drill" };

  const review = await prisma.videoReview.findFirst({
    where: { id: reviewId, coachUserId: coach.id },
    include: {
      athleteProfile: { select: { legacyAthleteId: true } },
    },
  });
  if (!review) return { error: "Review not found" };
  if (!review.athleteProfile.legacyAthleteId) {
    return { error: "Athlete is not ready for training assignment yet" };
  }

  try {
    await assignDrillFromReview({
      reviewId,
      coachUserId: coach.id,
      drillId,
      sport: review.sport,
      sets: setsRaw ? Number(setsRaw) : 3,
      reps: repsRaw ? Number(repsRaw) : 10,
      coachNote: coachNote || null,
      legacyAthleteId: review.athleteProfile.legacyAthleteId,
    });
    revalidatePath(`/videos/reviews/${reviewId}`);
    revalidatePath("/training");
    revalidatePath("/athlete/train");
    return { success: "Drill assigned to athlete" };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not assign drill",
    };
  }
}

export async function assignPlanFromReviewAction(
  reviewId: string,
  kind: "WORKOUT" | "PROGRAM",
  _prev: CoachReviewActionState,
  formData: FormData,
): Promise<CoachReviewActionState> {
  const coach = await requireCoach();
  const sourcePlanId = String(formData.get("sourcePlanId") ?? "").trim();
  const coachNote = String(formData.get("coachNote") ?? "").trim();
  if (!sourcePlanId) return { error: "Select training to assign" };

  const review = await prisma.videoReview.findFirst({
    where: { id: reviewId, coachUserId: coach.id },
    include: {
      athleteProfile: { select: { legacyAthleteId: true } },
    },
  });
  if (!review) return { error: "Review not found" };
  if (!review.athleteProfile.legacyAthleteId) {
    return { error: "Athlete is not ready for training assignment yet" };
  }

  try {
    await assignPlanFromReview({
      reviewId,
      coachUserId: coach.id,
      sourcePlanId,
      legacyAthleteId: review.athleteProfile.legacyAthleteId,
      kind,
      coachNote: coachNote || null,
    });
    revalidatePath(`/videos/reviews/${reviewId}`);
    revalidatePath("/training");
    revalidatePath("/athlete/train");
    return {
      success:
        kind === "WORKOUT"
          ? "Workout assigned to athlete"
          : "Program assigned to athlete",
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not assign training",
    };
  }
}
