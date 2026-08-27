import { prisma } from "@/lib/db";
import { CONNECTION_STATUS } from "@/lib/coach-connections";
import { createNotification, NOTIFICATION_TYPE } from "@/lib/notifications";
import {
  sendVideoReviewCompleteEmail,
  sendVideoSubmittedEmail,
} from "@/lib/email";
import { getAppUrl } from "@/lib/env";
import { VIDEO_REVIEW_STATUS } from "@/lib/video-categories";
import { listCatalogDrillsForSport } from "@/lib/catalog-drills";
import type { Drill } from "@/lib/drills";

export async function assertApprovedCoachForAthlete(
  athleteProfileId: string,
  coachUserId: string,
) {
  const connection = await prisma.coachAthleteConnection.findFirst({
    where: {
      athleteProfileId,
      coachUserId,
      status: CONNECTION_STATUS.APPROVED,
    },
    select: { id: true },
  });
  if (!connection) {
    throw new Error("You can only send videos to coaches you are connected with");
  }
  return connection;
}

export async function canAccessVideoReview(options: {
  reviewId: string;
  userId: string;
  asCoach?: boolean;
  asAthlete?: boolean;
}) {
  const review = await prisma.videoReview.findUnique({
    where: { id: options.reviewId },
    include: {
      athleteProfile: { select: { userId: true, legacyAthleteId: true } },
      trainingVideo: { select: { id: true, coachId: true, athleteId: true, videoUrl: true } },
    },
  });
  if (!review) return null;

  const isCoach = review.coachUserId === options.userId;
  const isAthlete = review.athleteProfile.userId === options.userId;

  if (options.asCoach && !isCoach) return null;
  if (options.asAthlete && !isAthlete) return null;
  if (!options.asCoach && !options.asAthlete && !isCoach && !isAthlete) {
    return null;
  }

  return review;
}

export async function submitVideoForReview(options: {
  uploadedByUserId: string;
  athleteProfileId: string;
  legacyAthleteId: string | null;
  coachUserId: string;
  title: string;
  sport: string;
  category: string;
  athleteNote?: string | null;
  videoUrl: string;
  storageKey?: string | null;
  sourceType?: "UPLOAD" | "URL";
}) {
  await assertApprovedCoachForAthlete(
    options.athleteProfileId,
    options.coachUserId,
  );

  const video = await prisma.trainingVideo.create({
    data: {
      coachId: options.coachUserId,
      athleteId: options.legacyAthleteId,
      title: options.title.trim(),
      description: options.athleteNote?.trim() || null,
      sourceType: options.sourceType ?? "UPLOAD",
      videoUrl: options.videoUrl,
      storageKey: options.storageKey ?? null,
    },
  });

  const review = await prisma.videoReview.create({
    data: {
      trainingVideoId: video.id,
      athleteProfileId: options.athleteProfileId,
      coachUserId: options.coachUserId,
      uploadedByUserId: options.uploadedByUserId,
      title: options.title.trim(),
      sport: options.sport.trim(),
      category: options.category.trim(),
      athleteNote: options.athleteNote?.trim() || null,
      status: VIDEO_REVIEW_STATUS.AWAITING_REVIEW,
    },
  });

  const athlete = await prisma.athleteProfile.findUnique({
    where: { id: options.athleteProfileId },
    select: { firstName: true, lastName: true },
  });
  const coach = await prisma.user.findUnique({
    where: { id: options.coachUserId },
    select: { email: true, name: true },
  });

  const href = `/videos/reviews/${review.id}`;
  await createNotification({
    userId: options.coachUserId,
    type: NOTIFICATION_TYPE.VIDEO_SUBMITTED,
    title: `${athlete?.firstName ?? "An athlete"} sent you a video for review`,
    body: `${options.sport} · ${options.category}`,
    href,
    entityId: review.id,
    entityType: "VideoReview",
  });

  if (coach?.email) {
    const email = await sendVideoSubmittedEmail({
      to: coach.email,
      coachName: coach.name,
      athleteName: athlete
        ? `${athlete.firstName} ${athlete.lastName}`
        : "An athlete",
      title: options.title,
      sport: options.sport,
      category: options.category,
      reviewUrl: `${getAppUrl()}${href}`,
    });
    if (email.sent) {
      await prisma.appNotification.updateMany({
        where: {
          userId: options.coachUserId,
          entityId: review.id,
          type: NOTIFICATION_TYPE.VIDEO_SUBMITTED,
          emailSentAt: null,
        },
        data: { emailSentAt: new Date() },
      });
    }
  }

  return { review, video };
}

export async function markReviewInProgress(reviewId: string, coachUserId: string) {
  const review = await prisma.videoReview.findFirst({
    where: {
      id: reviewId,
      coachUserId,
      status: VIDEO_REVIEW_STATUS.AWAITING_REVIEW,
    },
  });
  if (!review) return null;
  return prisma.videoReview.update({
    where: { id: reviewId },
    data: { status: VIDEO_REVIEW_STATUS.IN_REVIEW },
  });
}

export async function completeVideoReview(options: {
  reviewId: string;
  coachUserId: string;
  coachFeedback: string;
}) {
  const review = await prisma.videoReview.findFirst({
    where: { id: options.reviewId, coachUserId: options.coachUserId },
    include: {
      athleteProfile: {
        select: {
          userId: true,
          firstName: true,
          lastName: true,
        },
      },
      coachUser: { select: { name: true } },
      trainingLinks: { take: 1 },
      voiceReview: { select: { status: true } },
    },
  });
  if (!review) throw new Error("Review not found");

  const updated = await prisma.videoReview.update({
    where: { id: review.id },
    data: {
      coachFeedback: options.coachFeedback.trim(),
      status: VIDEO_REVIEW_STATUS.REVIEWED,
      reviewedAt: new Date(),
    },
  });

  const athleteUserId = review.athleteProfile.userId;
  if (athleteUserId) {
    const hasTraining = review.trainingLinks.length > 0;
    const hasVoice = review.voiceReview?.status === "READY";
    const body = hasTraining
      ? `${review.coachUser.name} reviewed your ${review.title}${hasVoice ? " with voice commentary" : ""} and assigned new training.`
      : `${review.coachUser.name} reviewed your ${review.title}${hasVoice ? " with synchronized voice commentary" : " video"}.`;

    const href = `/athlete/videos/reviews/${review.id}`;
    await createNotification({
      userId: athleteUserId,
      type: hasTraining
        ? NOTIFICATION_TYPE.VIDEO_TRAINING_ASSIGNED
        : NOTIFICATION_TYPE.VIDEO_REVIEWED,
      title: "Coach feedback ready",
      body,
      href,
      entityId: review.id,
      entityType: "VideoReview",
    });

    const athleteUser = await prisma.user.findUnique({
      where: { id: athleteUserId },
      select: { email: true, name: true },
    });
    if (athleteUser?.email) {
      const email = await sendVideoReviewCompleteEmail({
        to: athleteUser.email,
        athleteName: review.athleteProfile.firstName,
        coachName: review.coachUser.name,
        title: review.title,
        hasTraining,
        reviewUrl: `${getAppUrl()}${href}`,
      });
      if (email.sent) {
        await prisma.appNotification.updateMany({
          where: {
            userId: athleteUserId,
            entityId: review.id,
            emailSentAt: null,
          },
          data: { emailSentAt: new Date() },
        });
      }
    }
  }

  return updated;
}

export async function assignDrillFromReview(options: {
  reviewId: string;
  coachUserId: string;
  drillId: string;
  sport: string;
  sets?: number | null;
  reps?: number | null;
  coachNote?: string | null;
  legacyAthleteId: string;
}) {
  const review = await prisma.videoReview.findFirst({
    where: { id: options.reviewId, coachUserId: options.coachUserId },
  });
  if (!review) throw new Error("Review not found");

  const catalog = await listCatalogDrillsForSport(options.sport);
  const match = catalog.find((row) => row.drill.id === options.drillId);
  if (!match) throw new Error("Drill not found");
  const drill: Drill = match.drill;

  const plan = await prisma.trainingPlan.create({
    data: {
      coachId: options.coachUserId,
      athleteId: options.legacyAthleteId,
      title: drill.title,
      description: `Assigned from video review: ${review.title}`,
      status: "ACTIVE",
      workouts: {
        create: [
          {
            title: drill.title,
            description: [drill.howTo, options.coachNote?.trim()]
              .filter(Boolean)
              .join("\n\n"),
            durationMinutes: drill.durationMin,
            sortOrder: 0,
            exercises: {
              create: [
                {
                  name: drill.title,
                  instructions: drill.howTo,
                  coachingCue: options.coachNote?.trim() || drill.coachingCue,
                  sets: options.sets ?? 3,
                  reps: options.reps ?? 10,
                  equipment: drill.equipment,
                  sortOrder: 0,
                  resultRequired: false,
                  resultKind: "NONE",
                },
              ],
            },
          },
        ],
      },
    },
  });

  await prisma.videoReviewTrainingLink.create({
    data: {
      videoReviewId: review.id,
      trainingPlanId: plan.id,
      assignmentKind: "DRILL",
      coachNote: options.coachNote?.trim() || null,
      recommendationSource: "COACH",
      assignedByUserId: options.coachUserId,
    },
  });

  if (review.status === VIDEO_REVIEW_STATUS.AWAITING_REVIEW) {
    await prisma.videoReview.update({
      where: { id: review.id },
      data: { status: VIDEO_REVIEW_STATUS.IN_REVIEW },
    });
  }

  return plan;
}

export async function assignPlanFromReview(options: {
  reviewId: string;
  coachUserId: string;
  sourcePlanId: string;
  legacyAthleteId: string;
  kind: "WORKOUT" | "PROGRAM";
  coachNote?: string | null;
}) {
  const review = await prisma.videoReview.findFirst({
    where: { id: options.reviewId, coachUserId: options.coachUserId },
  });
  if (!review) throw new Error("Review not found");

  const source = await prisma.trainingPlan.findFirst({
    where: { id: options.sourcePlanId, coachId: options.coachUserId },
    include: {
      workouts: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: { exercises: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });
  if (!source) throw new Error("Training plan not found");

  const workoutsToCopy =
    options.kind === "WORKOUT"
      ? source.workouts.slice(0, 1)
      : source.workouts;

  const plan = await prisma.trainingPlan.create({
    data: {
      coachId: options.coachUserId,
      athleteId: options.legacyAthleteId,
      title:
        options.kind === "WORKOUT"
          ? workoutsToCopy[0]?.title ?? source.title
          : source.title,
      description: [
        source.description,
        `Assigned from video review: ${review.title}`,
        options.coachNote?.trim(),
      ]
        .filter(Boolean)
        .join("\n\n"),
      status: "ACTIVE",
      workouts: {
        create: workoutsToCopy.map((workout, index) => ({
          title: workout.title,
          description: workout.description,
          durationMinutes: workout.durationMinutes,
          sortOrder: index,
          instructionVideoUrl: workout.instructionVideoUrl,
          instructionVideoStorageKey: workout.instructionVideoStorageKey,
          exercises: {
            create: workout.exercises.map((ex, exIndex) => ({
              name: ex.name,
              instructions: ex.instructions,
              coachingCue: ex.coachingCue,
              videoUrl: ex.videoUrl,
              sets: ex.sets,
              reps: ex.reps,
              durationSec: ex.durationSec,
              restSec: ex.restSec,
              equipment: ex.equipment,
              sortOrder: exIndex,
              resultRequired: ex.resultRequired,
              resultKind: ex.resultKind,
              resultUnit: ex.resultUnit,
              metricDefinitionId: ex.metricDefinitionId,
            })),
          },
        })),
      },
    },
  });

  await prisma.videoReviewTrainingLink.create({
    data: {
      videoReviewId: review.id,
      trainingPlanId: plan.id,
      assignmentKind: options.kind,
      coachNote: options.coachNote?.trim() || null,
      recommendationSource: "COACH",
      assignedByUserId: options.coachUserId,
    },
  });

  return plan;
}
