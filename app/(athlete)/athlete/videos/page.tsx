import Link from "next/link";

import { requireAthleteContext } from "@/lib/athlete-dashboard";
import {
  formatVideoReviewStatus,
  VIDEO_REVIEW_STATUS,
} from "@/lib/video-categories";
import { prisma } from "@/lib/db";
import { InstructionVideoPlayer } from "@/components/instruction-video-player";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export default async function AthleteVideosPage() {
  const ctx = await requireAthleteContext();

  const reviews = await prisma.videoReview.findMany({
    where: { athleteProfileId: ctx.profileId },
    include: {
      coachUser: { select: { name: true } },
      trainingLinks: { select: { id: true }, take: 1 },
      voiceReview: { select: { status: true } },
    },
    orderBy: { submittedAt: "desc" },
    take: 40,
  });

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
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-brand uppercase">
            Videos
          </p>
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            My videos
          </h1>
        </div>
        <Link
          href="/athlete/videos/new"
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-2xl bg-brand px-4 text-sm font-bold text-black"
        >
          Upload video
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-bold">Submitted for review</h2>
        {reviews.length === 0 ? (
          <div className="space-y-3 rounded-2xl border border-dashed border-white/15 p-5">
            <p className="text-sm text-slate-400">
              Upload game film or a skills clip and send it to a connected coach.
            </p>
            <Link
              href="/athlete/videos/new"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-brand px-5 text-sm font-bold text-black"
            >
              Upload video
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {reviews.map((review) => (
              <li key={review.id}>
                <Link
                  href={`/athlete/videos/reviews/${review.id}`}
                  className="block rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 active:bg-zinc-800"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">
                        {review.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {review.sport} · {review.category} ·{" "}
                        {formatDate(review.submittedAt)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {review.coachUser.name}
                        {review.status === "REVIEWED" &&
                        review.voiceReview?.status === "READY"
                          ? " · Voice review ✓"
                          : ""}
                        {review.trainingLinks.length > 0
                          ? " · Training assigned"
                          : ""}
                      </p>
                    </div>
                    <span
                      className={
                        review.status === VIDEO_REVIEW_STATUS.REVIEWED
                          ? "shrink-0 text-xs font-bold tracking-wide text-brand uppercase"
                          : "shrink-0 text-xs font-bold tracking-wide text-slate-400 uppercase"
                      }
                    >
                      {review.status === VIDEO_REVIEW_STATUS.REVIEWED
                        ? "Reviewed ✓"
                        : formatVideoReviewStatus(review.status)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {planVideos.length > 0 ? (
        <section className="space-y-4">
          <h2 className="font-heading text-xl font-bold">Training clips</h2>
          {planVideos.map((w) =>
            w.instructionVideoUrl ? (
              <div
                key={w.id}
                className="space-y-2 rounded-2xl border border-white/10 bg-zinc-900 p-4"
              >
                <p className="font-semibold">{w.title}</p>
                <p className="text-xs text-slate-400">{w.trainingPlan.title}</p>
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
