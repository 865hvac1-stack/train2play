import Link from "next/link";
import { notFound } from "next/navigation";

import { VideoAnnotator } from "@/components/video-annotator";
import { SynchronizedVoiceReviewPlayer } from "@/components/synchronized-voice-review-player";
import { requireAthleteContext } from "@/lib/athlete-dashboard";
import {
  formatAthleteVideoReviewStatus,
  hasAthleteReviewFeedback,
  VIDEO_REVIEW_STATUS,
} from "@/lib/video-categories";
import { prisma } from "@/lib/db";
import { voiceTimelineSchema } from "@/lib/voice-timeline";

export default async function AthleteVideoReviewDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sent?: string }>;
}) {
  const ctx = await requireAthleteContext();
  const { id } = await params;
  const { sent } = await searchParams;

  const review = await prisma.videoReview.findFirst({
    where: { id, athleteProfileId: ctx.profileId },
    include: {
      coachUser: { select: { name: true } },
      trainingVideo: {
        include: {
          annotations: { orderBy: { timestampMs: "asc" } },
        },
      },
      voiceReview: {
        select: {
          durationMs: true,
          timelineJson: true,
          status: true,
        },
      },
      trainingLinks: {
        include: {
          trainingPlan: {
            include: {
              workouts: {
                orderBy: { sortOrder: "asc" },
                take: 1,
                include: {
                  exercises: { orderBy: { sortOrder: "asc" }, take: 1 },
                  sessions: {
                    where: {
                      athleteId: ctx.athleteId ?? undefined,
                      status: "COMPLETED",
                    },
                    orderBy: { completedAt: "desc" },
                    take: 1,
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!review) notFound();

  const assigned = review.trainingLinks[0] ?? null;
  const workout = assigned?.trainingPlan.workouts[0] ?? null;
  const exercise = workout?.exercises[0] ?? null;
  const completedSession = workout?.sessions[0] ?? null;
  const parsedVoiceTimeline = review.voiceReview
    ? voiceTimelineSchema.safeParse(review.voiceReview.timelineJson)
    : null;
  const voiceReview =
    review.status === "REVIEWED" &&
    review.voiceReview?.status === "READY" &&
    parsedVoiceTimeline?.success
      ? {
          durationMs: review.voiceReview.durationMs,
          timeline: parsedVoiceTimeline.data,
        }
      : null;

  return (
    <div className="space-y-6">
      {sent === "1" ? (
        <div className="rounded-2xl border border-brand/40 bg-brand/10 px-4 py-3 text-sm text-brand">
          VIDEO SENT ✓ {review.coachUser.name} has been notified.
        </div>
      ) : null}

      <div>
        <p className="text-xs font-bold tracking-[0.18em] text-brand uppercase">
          {formatAthleteVideoReviewStatus({
            status: review.status,
            coachFeedback: review.coachFeedback,
            voiceReviewReady: review.voiceReview?.status === "READY",
            annotationCount: review.trainingVideo.annotations.length,
          })}
          {hasAthleteReviewFeedback({
            status: review.status,
            coachFeedback: review.coachFeedback,
            voiceReviewReady: review.voiceReview?.status === "READY",
            annotationCount: review.trainingVideo.annotations.length,
          })
            ? " ✓"
            : ""}
        </p>
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          {review.title}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {review.sport} · {review.category} · {review.coachUser.name}
        </p>
        {review.status === VIDEO_REVIEW_STATUS.AWAITING_REVIEW ? (
          <p className="mt-2 text-sm text-zinc-400">
            Sent to {review.coachUser.name} for review.
          </p>
        ) : null}
        {review.status === VIDEO_REVIEW_STATUS.IN_REVIEW ? (
          <p className="mt-2 text-sm text-zinc-400">
            {review.coachUser.name} is reviewing your video. We&apos;ll notify you
            when feedback is ready.
          </p>
        ) : null}
      </div>

      {review.athleteNote ? (
        <section className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
          <p className="text-xs font-bold tracking-[0.16em] text-slate-500 uppercase">
            Your question
          </p>
          <p className="mt-2 text-sm text-slate-300">&ldquo;{review.athleteNote}&rdquo;</p>
        </section>
      ) : null}

      {voiceReview ? (
        <section className="space-y-3">
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-brand uppercase">
              Watch coach review
            </p>
            <h2 className="font-heading text-2xl font-bold">
              {review.coachUser.name}
            </h2>
          </div>
          <SynchronizedVoiceReviewPlayer
            videoUrl={review.trainingVideo.videoUrl}
            audioUrl={`/api/video-reviews/${review.id}/voice`}
            durationMs={voiceReview.durationMs}
            timeline={voiceReview.timeline}
            annotations={review.trainingVideo.annotations}
          />
        </section>
      ) : (
        <VideoAnnotator
          videoId={review.trainingVideo.id}
          videoUrl={review.trainingVideo.videoUrl}
          initialAnnotations={review.trainingVideo.annotations}
          readOnly
        />
      )}

      {review.coachFeedback ? (
        <section className="rounded-2xl border border-brand/30 bg-brand/10 p-4">
          <p className="text-xs font-bold tracking-[0.16em] text-brand uppercase">
            Coach feedback
          </p>
          <p className="mt-1 text-sm font-semibold text-white">
            {review.coachUser.name}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">
            {review.coachFeedback}
          </p>
        </section>
      ) : (
        <p className="rounded-2xl border border-dashed border-white/15 p-4 text-sm text-slate-400">
          {voiceReview
            ? `${review.coachUser.name} talked you through this one — press play above to hear it.`
            : "Waiting for coach feedback."}
        </p>
      )}

      {assigned ? (
        <section className="space-y-3 rounded-2xl border border-white/10 bg-zinc-900 p-4">
          <p className="text-xs font-bold tracking-[0.16em] text-brand uppercase">
            Coach assigned new training
          </p>
          <h2 className="font-heading text-2xl font-bold">
            {assigned.trainingPlan.title}
          </h2>
          {exercise ? (
            <p className="text-sm text-slate-400">
              {[
                exercise.sets ? `${exercise.sets} sets` : null,
                exercise.reps ? `${exercise.reps} reps` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : null}
          {assigned.coachNote || exercise?.coachingCue ? (
            <p className="text-sm text-slate-300">
              {assigned.coachNote || exercise?.coachingCue}
            </p>
          ) : null}
          {completedSession ? (
            <p className="text-sm font-bold text-brand">
              TRAINING COMPLETED ✓
              {completedSession.completedAt
                ? ` · ${new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    day: "numeric",
                  }).format(completedSession.completedAt)}`
                : ""}
            </p>
          ) : (
            <Link
              href="/athlete/train"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-brand px-5 text-sm font-bold text-black"
            >
              VIEW TRAINING
            </Link>
          )}
        </section>
      ) : null}

      <Link
        href="/athlete/videos"
        className="block text-center text-sm text-slate-400 underline-offset-2 hover:underline"
      >
        Back to video coaching
      </Link>
    </div>
  );
}
