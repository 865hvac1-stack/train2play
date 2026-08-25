import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import {
  CoachReviewAssignPanel,
  CoachReviewFeedbackForm,
} from "@/components/coach-video-review-panel";
import { DashboardShell } from "@/components/dashboard-shell";
import { VideoAnnotator } from "@/components/video-annotator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireCoach } from "@/lib/session";
import { formatVideoReviewStatus, VIDEO_REVIEW_STATUS } from "@/lib/video-categories";
import { markReviewInProgress } from "@/lib/video-reviews";
import { prisma } from "@/lib/db";

function formatRelative(date: Date) {
  const mins = Math.round((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export default async function CoachVideoReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const coach = await requireCoach();
  const { id } = await params;

  const review = await prisma.videoReview.findFirst({
    where: { id, coachUserId: coach.id },
    include: {
      athleteProfile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          primarySport: true,
          legacyAthleteId: true,
        },
      },
      trainingVideo: {
        include: {
          annotations: { orderBy: { timestampMs: "asc" } },
        },
      },
      trainingLinks: {
        include: {
          trainingPlan: {
            select: {
              id: true,
              title: true,
              workouts: {
                select: {
                  completed: true,
                  sessions: {
                    where: { status: "COMPLETED" },
                    select: { id: true, completedAt: true },
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

  if (review.status === VIDEO_REVIEW_STATUS.AWAITING_REVIEW) {
    await markReviewInProgress(review.id, coach.id);
  }

  const plans = await prisma.trainingPlan.findMany({
    where: { coachId: coach.id },
    orderBy: { updatedAt: "desc" },
    take: 40,
    select: {
      id: true,
      title: true,
      _count: { select: { workouts: true } },
    },
  });

  const athleteHref = review.athleteProfile.legacyAthleteId
    ? `/athletes/${review.athleteProfile.legacyAthleteId}`
    : "/athletes";

  return (
    <DashboardShell
      title={review.title}
      description={`${review.sport} · ${review.category} · Submitted ${formatRelative(review.submittedAt)}`}
      action={
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {formatVideoReviewStatus(review.status)}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={
              <Link href="/videos">
                <ArrowLeft className="size-4" />
                Videos
              </Link>
            }
          />
        </div>
      }
    >
      <div className="mb-6 space-y-2">
        <p className="text-sm text-slate-600">
          Athlete:{" "}
          <Link href={athleteHref} className="font-medium text-primary hover:underline">
            {review.athleteProfile.firstName} {review.athleteProfile.lastName}
          </Link>
        </p>
        {review.athleteNote ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4">
            <p className="text-xs font-semibold tracking-wide text-amber-900 uppercase">
              Athlete question
            </p>
            <p className="mt-1 text-sm text-amber-950">
              &ldquo;{review.athleteNote}&rdquo;
            </p>
          </div>
        ) : null}
      </div>

      <div className="space-y-6">
        <VideoAnnotator
          videoId={review.trainingVideo.id}
          videoUrl={review.trainingVideo.videoUrl}
          initialAnnotations={review.trainingVideo.annotations}
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <CoachReviewFeedbackForm
            reviewId={review.id}
            defaultFeedback={review.coachFeedback ?? ""}
            isReviewed={review.status === VIDEO_REVIEW_STATUS.REVIEWED}
          />
          <CoachReviewAssignPanel
            reviewId={review.id}
            sport={review.sport}
            plans={plans.map((p) => ({
              id: p.id,
              title: p.title,
              workoutCount: p._count.workouts,
            }))}
          />
        </div>

        {review.trainingLinks.length > 0 ? (
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="font-heading text-lg font-bold">Assigned from this review</h3>
            <ul className="mt-3 space-y-2">
              {review.trainingLinks.map((link) => {
                const completed = link.trainingPlan.workouts.some(
                  (w) => w.completed || w.sessions.length > 0,
                );
                return (
                  <li
                    key={link.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2 text-sm"
                  >
                    <div>
                      <Link
                        href={`/training/${link.trainingPlan.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {link.trainingPlan.title}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {link.assignmentKind}
                        {link.coachNote ? ` · ${link.coachNote}` : ""}
                      </p>
                    </div>
                    <span className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                      {completed ? "Completed ✓" : "Assigned"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>
    </DashboardShell>
  );
}
