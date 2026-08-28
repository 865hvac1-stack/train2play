import Link from "next/link";

import { requireAthleteContext } from "@/lib/athlete-dashboard";
import { CONNECTION_STATUS } from "@/lib/coach-connections";
import {
  athleteReviewFeedbackTypes,
  formatAthleteVideoReviewStatus,
  hasAthleteReviewFeedback,
  VIDEO_PURPOSE,
  VIDEO_REVIEW_STATUS,
} from "@/lib/video-categories";
import { prisma } from "@/lib/db";
import { InstructionVideoPlayer } from "@/components/instruction-video-player";
import { cn } from "@/lib/utils";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export default async function AthleteVideosPage() {
  const ctx = await requireAthleteContext();

  const [reviews, approvedCoaches] = await Promise.all([
    prisma.videoReview.findMany({
      where: {
        athleteProfileId: ctx.profileId,
        status: { not: VIDEO_REVIEW_STATUS.ARCHIVED },
        purpose: { not: VIDEO_PURPOSE.LIBRARY },
      },
      include: {
        coachUser: { select: { name: true } },
        trainingVideo: {
          select: {
            videoUrl: true,
            _count: { select: { annotations: true } },
          },
        },
        trainingLinks: { select: { id: true }, take: 1 },
        voiceReview: { select: { status: true } },
      },
      orderBy: { submittedAt: "desc" },
      take: 40,
    }),
    prisma.coachAthleteConnection.findMany({
      where: {
        athleteProfileId: ctx.profileId,
        status: CONNECTION_STATUS.APPROVED,
      },
      select: { id: true },
      take: 1,
    }),
  ]);

  const coachingReviews = reviews.filter(
    (review) => review.status !== VIDEO_REVIEW_STATUS.LIBRARY,
  );
  const hasCoach = approvedCoaches.length > 0;

  const planVideos = ctx.athleteId
    ? await prisma.workout.findMany({
        where: {
          instructionVideoUrl: { not: null },
          trainingPlan: { athleteId: ctx.athleteId, status: "ACTIVE" },
        },
        select: {
          id: true,
          title: true,
          instructionVideoUrl: true,
          trainingPlan: { select: { title: true } },
        },
        take: 20,
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-brand uppercase">
            Videos
          </p>
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            Video coaching
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Send a video to your coach and review your feedback.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <Link
            href="/athlete/videos/new"
            className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-brand px-4 text-sm font-bold text-black"
          >
            Send to coach for review
          </Link>
          <Link
            href="/athlete/profile?upload=1"
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/20 px-4 text-sm font-bold text-white"
          >
            Upload / manage my videos
          </Link>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-bold">Coach reviews</h2>
        {coachingReviews.length === 0 ? (
          hasCoach ? (
            <div className="space-y-3 rounded-2xl border border-dashed border-white/15 p-5">
              <h3 className="font-heading text-lg font-bold">
                Get feedback from your coach
              </h3>
              <p className="text-sm leading-relaxed text-zinc-400">
                Send a video of your swing, shot, drill, movement, or skill and
                receive personalized coaching feedback.
              </p>
              <Link
                href="/athlete/videos/new"
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-brand px-5 text-sm font-bold text-black"
              >
                Send to coach for review
              </Link>
            </div>
          ) : (
            <div className="space-y-3 rounded-2xl border border-dashed border-white/15 p-5">
              <h3 className="font-heading text-lg font-bold">
                Connect with a coach first
              </h3>
              <p className="text-sm leading-relaxed text-zinc-400">
                Connect with your existing coach or find a Train2Play Approved
                Coach to begin video coaching.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/athlete/connect"
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-brand px-5 text-sm font-bold text-black"
                >
                  Enter coach code
                </Link>
                <Link
                  href="/athlete/coaches"
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/20 px-5 text-sm font-bold text-white"
                >
                  Find a coach
                </Link>
              </div>
            </div>
          )
        ) : (
          <ul className="space-y-2">
            {coachingReviews.map((review) => {
              const signals = {
                status: review.status,
                coachFeedback: review.coachFeedback,
                voiceReviewReady: review.voiceReview?.status === "READY",
                annotationCount: review.trainingVideo._count.annotations,
              };
              const statusLabel = formatAthleteVideoReviewStatus(signals);
              const feedbackReady = hasAthleteReviewFeedback(signals);
              const types = athleteReviewFeedbackTypes({
                coachFeedback: review.coachFeedback,
                voiceReviewReady: signals.voiceReviewReady,
                annotationCount: signals.annotationCount,
                trainingAssigned: review.trainingLinks.length > 0,
              });
              const supporting =
                review.status === VIDEO_REVIEW_STATUS.IN_REVIEW
                  ? `${review.coachUser.name} is reviewing your video. We'll notify you when feedback is ready.`
                  : review.status === VIDEO_REVIEW_STATUS.AWAITING_REVIEW
                    ? `Sent to ${review.coachUser.name} for review.`
                    : null;

              return (
                <li key={review.id}>
                  <Link
                    href={`/athlete/videos/reviews/${review.id}`}
                    className="block min-h-11 rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 active:bg-zinc-800"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-white">
                          {review.title}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-400">
                          {[review.sport, review.category, formatDate(review.submittedAt)]
                            .filter(Boolean)
                            .join(" • ")}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white">
                          {review.coachUser.name}
                        </p>
                        {types.length > 0 ? (
                          <p className="mt-0.5 text-xs text-zinc-400">
                            {types.map((type) => `${type} ✓`).join(" • ")}
                          </p>
                        ) : null}
                        {supporting ? (
                          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                            {supporting}
                          </p>
                        ) : null}
                      </div>
                      <span
                        className={cn(
                          "shrink-0 text-[10px] font-bold tracking-wide uppercase",
                          feedbackReady ? "text-brand" : "text-zinc-400",
                        )}
                      >
                        {feedbackReady ? `${statusLabel} ✓` : statusLabel}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {planVideos.length > 0 ? (
        <section className="space-y-4">
          <h2 className="font-heading text-xl font-bold">Assigned training clips</h2>
          {planVideos.map((w) =>
            w.instructionVideoUrl ? (
              <div
                key={w.id}
                className="space-y-2 rounded-2xl border border-white/10 bg-zinc-900 p-4"
              >
                <p className="font-semibold">{w.title}</p>
                <p className="text-xs text-zinc-400">{w.trainingPlan.title}</p>
                <InstructionVideoPlayer
                  src={w.instructionVideoUrl}
                  title="Play"
                />
              </div>
            ) : null,
          )}
        </section>
      ) : null}
    </div>
  );
}
