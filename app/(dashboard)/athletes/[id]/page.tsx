import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, ClipboardList, Download, Printer, Target, Trash2, TrendingUp, Video } from "lucide-react";

import { deleteAthleteAction } from "@/app/(dashboard)/athletes/actions";
import { deleteProgressMetricAction } from "@/app/(dashboard)/athletes/progress-actions";
import { DashboardShell } from "@/components/dashboard-shell";
import { ParentSharePanel } from "@/components/parent-share-panel";
import { PlayerProfileStats } from "@/components/player-profile-stats";
import { PromotePickupButton } from "@/components/promote-pickup-button";
import { ProgressCharts } from "@/components/progress-charts";
import { ProgressGoalForm, ProgressGoalsList } from "@/components/progress-goals";
import { ProgressMetricForm } from "@/components/progress-metric-form";
import { SuggestedDrills } from "@/components/suggested-drills";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatPlanStatus } from "@/lib/training";
import {
  formatMetricDate,
  formatMetricValue,
} from "@/lib/progress";
import { isEmailConfigured } from "@/lib/settings";
import { requireUser } from "@/lib/session";
import { getAthleteProfileComparisons } from "@/lib/player-profile-server";
import { getVideosForAthlete } from "@/lib/videos-server";
import { prisma } from "@/lib/db";

function formatBirthDate(date: Date | null) {
  if (!date) return "Not provided";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default async function AthleteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const athlete = await prisma.athlete.findFirst({
    where: { id, coachId: user.id },
    include: {
      coach: { select: { name: true } },
      trainingPlans: {
        where: { status: "ACTIVE" },
        include: {
          workouts: { select: { completed: true } },
        },
        orderBy: { updatedAt: "desc" },
      },
      progressMetrics: {
        orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
      },
      progressGoals: {
        orderBy: { createdAt: "desc" },
      },
      shareLinks: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!athlete) {
    notFound();
  }

  const athleteRecord = athlete;

  const athleteVideos = await getVideosForAthlete(user.id, athleteRecord.id);
  const profileStats = await getAthleteProfileComparisons(
    athleteRecord.progressMetrics,
    athleteRecord.sport,
  );

  const chartMetrics = athleteRecord.progressMetrics.map((metric) => ({
    id: metric.id,
    label: metric.label,
    value: metric.value,
    unit: metric.unit,
    recordedAt: metric.recordedAt,
  }));

  function getLatestMetricValue(label: string) {
    const matching = athleteRecord.progressMetrics
      .filter((metric) => metric.label.toLowerCase() === label.toLowerCase())
      .sort(
        (a, b) =>
          new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
      );
    return matching[0]?.value ?? null;
  }

  const goalsWithProgress = athleteRecord.progressGoals.map((goal) => ({
    ...goal,
    currentValue: getLatestMetricValue(goal.label),
  }));

  const displayMetrics = athleteRecord.progressMetrics.slice(0, 20);

  return (
    <DashboardShell
      title={`${athleteRecord.firstName} ${athleteRecord.lastName}`}
      description={
        athlete.rosterStatus === "PICKUP"
          ? "Pickup player profile · velo vs system average"
          : "Player profile, training plans, and progress"
      }
      action={
        <div className="flex max-w-full flex-wrap items-center justify-end gap-2">
          {athlete.rosterStatus === "PICKUP" ? (
            <PromotePickupButton athleteId={athlete.id} />
          ) : null}
          <Button
            variant="outline"
            size="sm"
            render={
              <Link href={`/athletes/${athlete.id}/print`}>
                <Printer className="h-4 w-4" />
                <span className="hidden sm:inline">Print</span>
              </Link>
            }
          />
          <Button
            variant="outline"
            size="sm"
            render={
              <a href={`/api/export/athlete/${athlete.id}`}>
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </a>
            }
          />
          <Button
            variant="outline"
            size="sm"
            render={<Link href="/athletes">Back</Link>}
          />
        </div>
      }
    >
      <div className="mx-auto grid w-full max-w-5xl min-w-0 gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6 lg:col-span-2">
          <PlayerProfileStats
            stats={profileStats}
            athleteName={`${athlete.firstName} ${athlete.lastName}`}
            sport={athlete.sport}
            throws={athlete.throws}
            bats={athlete.bats}
            isPickup={athlete.rosterStatus === "PICKUP"}
          />
        </div>

        <div className="space-y-6 lg:col-span-2 lg:grid lg:grid-cols-[2fr_1fr] lg:gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{athlete.sport}</Badge>
                {athlete.position ? (
                  <Badge variant="outline">{athlete.position}</Badge>
                ) : null}
                {athlete.rosterStatus === "PICKUP" ? (
                  <Badge variant="outline">Pickup</Badge>
                ) : null}
                {athlete.throws ? (
                  <Badge variant="outline">Throws {athlete.throws}</Badge>
                ) : null}
                {athlete.bats ? (
                  <Badge variant="outline">Bats {athlete.bats}</Badge>
                ) : null}
              </div>
              <CardTitle className="text-2xl">
                {athlete.firstName} {athlete.lastName}
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Born {formatBirthDate(athlete.dateOfBirth)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Notes</h3>
              <p className="text-sm leading-relaxed text-slate-600">
                {athlete.notes || "No notes added yet."}
              </p>
            </CardContent>
          </Card>

          <SuggestedDrills
            sport={athlete.sport}
            dateOfBirth={athlete.dateOfBirth}
            athleteFirstName={athlete.firstName}
          />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Training plans
              </CardTitle>
              <CardDescription>
                Active programs assigned to this athlete.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {athlete.trainingPlans.length > 0 ? (
                athlete.trainingPlans.map((plan) => {
                  const completed = plan.workouts.filter((w) => w.completed).length;
                  const total = plan.workouts.length;

                  return (
                    <Link
                      key={plan.id}
                      href={`/training/${plan.id}`}
                      className="block rounded-lg border border-slate-200 p-4 transition-colors hover:bg-slate-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-900">{plan.title}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {total > 0
                              ? `${completed}/${total} workouts complete`
                              : "No workouts yet"}
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {formatPlanStatus(plan.status)}
                        </Badge>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                  No plans assigned yet.{" "}
                  <Link
                    href="/training/new"
                    className="font-medium text-primary hover:underline"
                  >
                    Create a plan
                  </Link>{" "}
                  and assign it to this athlete.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="h-5 w-5" />
                    Video coaching
                  </CardTitle>
                  <CardDescription>
                    Film review with on-frame drawings and written direction.
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" render={<Link href={`/videos/new?athleteId=${athlete.id}`}>Add video</Link>} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {athleteVideos.length > 0 ? (
                athleteVideos.map((video) => (
                  <Link
                    key={video.id}
                    href={`/videos/${video.id}`}
                    className="block rounded-lg border border-slate-200 p-4 transition-colors hover:bg-slate-50"
                  >
                    <p className="font-medium text-slate-900">{video.title}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {video._count.annotations} coaching note
                      {video._count.annotations === 1 ? "" : "s"}
                    </p>
                  </Link>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                  No videos yet.{" "}
                  <Link
                    href={`/videos/new?athleteId=${athlete.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    Upload film
                  </Link>{" "}
                  to draw coaching notes on key moments.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Performance goals
              </CardTitle>
              <CardDescription>
                Set targets and track progress toward measurable outcomes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ProgressGoalsList
                athleteId={athlete.id}
                goals={goalsWithProgress}
              />
              <div className="border-t border-slate-200 pt-6">
                <h3 className="mb-4 text-sm font-semibold text-slate-900">
                  Add a goal
                </h3>
                <ProgressGoalForm athleteId={athlete.id} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Progress history
              </CardTitle>
              <CardDescription>
                Performance metrics logged over time.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ProgressCharts metrics={chartMetrics} />

              {displayMetrics.length > 0 ? (
                displayMetrics.map((metric) => (
                  <div
                    key={metric.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-4"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{metric.label}</p>
                      <p className="mt-1 text-lg font-semibold text-primary">
                        {formatMetricValue(metric.value, metric.unit)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatMetricDate(metric.recordedAt)}
                        {metric.notes ? ` · ${metric.notes}` : ""}
                      </p>
                    </div>
                    <form
                      action={deleteProgressMetricAction.bind(
                        null,
                        athlete.id,
                        metric.id,
                      )}
                    >
                      <Button type="submit" variant="ghost" size="sm">
                        Remove
                      </Button>
                    </form>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  No metrics logged yet. Use the form to record a baseline measurement.
                </p>
              )}
            </CardContent>
          </Card>

          <form action={deleteAthleteAction.bind(null, athlete.id)}>
            <Button type="submit" variant="destructive">
              <Trash2 className="h-4 w-4" />
              Remove athlete
            </Button>
          </form>
        </div>

        <div className="space-y-6">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Log progress</CardTitle>
              <CardDescription>
                Record times, weights, jumps, and other measurable results.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProgressMetricForm athleteId={athlete.id} />
            </CardContent>
          </Card>

          <ParentSharePanel
            athleteId={athlete.id}
            athleteName={`${athlete.firstName} ${athlete.lastName}`}
            coachName={athlete.coach.name}
            emailEnabled={isEmailConfigured()}
            links={athlete.shareLinks}
          />
        </div>
        </div>
      </div>
    </DashboardShell>
  );
}
