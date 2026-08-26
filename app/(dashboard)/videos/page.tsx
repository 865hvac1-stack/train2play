import Link from "next/link";
import { Plus, Video } from "lucide-react";

import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireCoach } from "@/lib/session";
import { getVideosForCoach } from "@/lib/videos-server";
import {
  formatVideoReviewStatus,
  VIDEO_REVIEW_STATUS,
} from "@/lib/video-categories";
import { prisma } from "@/lib/db";

function formatRelative(date: Date) {
  const mins = Math.round((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export default async function VideosPage() {
  const coach = await requireCoach();
  const [videos, pendingReviews, reviewed] = await Promise.all([
    getVideosForCoach(coach.id),
    prisma.videoReview.findMany({
      where: {
        coachUserId: coach.id,
        status: {
          in: [
            VIDEO_REVIEW_STATUS.AWAITING_REVIEW,
            VIDEO_REVIEW_STATUS.IN_REVIEW,
          ],
        },
      },
      include: {
        athleteProfile: {
          select: { firstName: true, lastName: true },
        },
        voiceReview: { select: { status: true } },
      },
      orderBy: { submittedAt: "desc" },
    }),
    prisma.videoReview.findMany({
      where: {
        coachUserId: coach.id,
        status: VIDEO_REVIEW_STATUS.REVIEWED,
      },
      include: {
        athleteProfile: {
          select: { firstName: true, lastName: true },
        },
        trainingLinks: { select: { id: true }, take: 1 },
        voiceReview: { select: { status: true } },
      },
      orderBy: { reviewedAt: "desc" },
      take: 30,
    }),
  ]);

  return (
    <DashboardShell
      title="Video coaching"
      description="Review athlete film, annotate, leave feedback, and assign training."
      action={
        <Button
          nativeButton={false}
          render={
            <Link href="/videos/new">
              <Plus className="size-4" />
              Add video
            </Link>
          }
        />
      }
    >
      <div className="space-y-8">
        <section className="space-y-3">
          <h2 className="font-heading text-xl font-bold text-slate-900">
            Needs review
          </h2>
          {pendingReviews.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-6 text-sm text-slate-500">
                No athlete videos waiting. When connected athletes send film, it
                shows up here.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pendingReviews.map((review) => (
                <Link key={review.id} href={`/videos/reviews/${review.id}`}>
                  <Card className="h-full transition-colors hover:bg-muted/40">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="line-clamp-2 text-base">
                          {review.athleteProfile.firstName}{" "}
                          {review.athleteProfile.lastName.charAt(0)}.
                        </CardTitle>
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          {formatVideoReviewStatus(review.status)}
                        </Badge>
                      </div>
                      <CardDescription>
                        {review.sport} · {review.category}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="font-medium text-slate-900">{review.title}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        Submitted {formatRelative(review.submittedAt)}
                        {review.voiceReview?.status === "READY"
                          ? " · Voice draft saved"
                          : ""}
                      </p>
                      <p className="mt-3 text-sm font-semibold text-primary">
                        Review →
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-xl font-bold text-slate-900">
            Reviewed
          </h2>
          {reviewed.length === 0 ? (
            <p className="text-sm text-slate-500">No completed reviews yet.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {reviewed.map((review) => (
                <Link key={review.id} href={`/videos/reviews/${review.id}`}>
                  <Card className="h-full transition-colors hover:bg-muted/40">
                    <CardHeader className="pb-2">
                      <CardTitle className="line-clamp-2 text-base">
                        {review.title}
                      </CardTitle>
                      <CardDescription>
                        {review.athleteProfile.firstName}{" "}
                        {review.athleteProfile.lastName.charAt(0)}. ·{" "}
                        {review.sport}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs font-bold tracking-wide text-brand uppercase">
                        Reviewed ✓
                        {review.voiceReview?.status === "READY"
                          ? " · Voice review ✓"
                          : ""}
                        {review.trainingLinks.length > 0
                          ? " · Training assigned"
                          : ""}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl font-bold text-slate-900">
              Your library
            </h2>
            <Link
              href="/videos/new"
              className="text-sm font-medium text-primary hover:underline"
            >
              Add video
            </Link>
          </div>
          {videos.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Video className="text-muted-foreground mb-4 size-12" />
                <h3 className="text-lg font-medium">No coach-uploaded videos yet</h3>
                <p className="text-muted-foreground mt-1 max-w-md text-sm">
                  Upload game film yourself, or wait for athletes to send reviews
                  above.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {videos.map((video) => (
                <Link key={video.id} href={`/videos/${video.id}`}>
                  <Card className="h-full transition-colors hover:bg-muted/40">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="line-clamp-2 text-base">
                          {video.title}
                        </CardTitle>
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          {video.sourceType === "UPLOAD" ? "Upload" : "URL"}
                        </Badge>
                      </div>
                      <CardDescription>
                        {video.athlete
                          ? `${video.athlete.firstName} ${video.athlete.lastName}`
                          : "Team / general"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground line-clamp-2 text-sm">
                        {video.description || "No description"}
                      </p>
                      <p className="text-muted-foreground mt-3 text-xs">
                        {video._count.annotations} coaching note
                        {video._count.annotations === 1 ? "" : "s"}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
