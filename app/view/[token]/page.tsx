import { Calendar, ClipboardList, PlayCircle, TrendingUp } from "lucide-react";
import { notFound } from "next/navigation";

import { ProgressCharts } from "@/components/progress-charts";
import { BrandLogoLarge } from "@/components/brand-logo";
import { InstructionVideoPlayer } from "@/components/instruction-video-player";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { brand } from "@/lib/brand";
import { getAthleteByShareToken } from "@/lib/parent-view";
import {
  formatMetricDate,
  formatMetricValue,
} from "@/lib/progress";
import { formatPlanStatus } from "@/lib/training";

function formatBirthDate(date: Date | null) {
  if (!date) return "Not provided";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatWorkoutDate(date: Date | null) {
  if (!date) return "Unscheduled";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function familyVideoUrl(src: string, token: string) {
  if (!src.startsWith("/api/media/videos/")) return src;
  return `${src}?shareToken=${encodeURIComponent(token)}`;
}

export default async function ParentViewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const athlete = await getAthleteByShareToken(token);

  if (!athlete) {
    notFound();
  }

  const serializedMetrics = athlete.progressMetrics.map((m) => ({
    id: m.id,
    label: m.label,
    value: m.value,
    unit: m.unit,
    recordedAt: m.recordedAt,
  }));

  const watchableWorkouts = athlete.trainingPlans.flatMap((plan) =>
    plan.workouts
      .filter((workout) => Boolean(workout.instructionVideoUrl))
      .map((workout) => ({
        planTitle: plan.title,
        workout,
      })),
  );

  return (
    <div className="min-h-full t2p-page-gradient">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-4xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <BrandLogoLarge />
          <Badge variant="secondary">Family view · Read only</Badge>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {athlete.firstName} {athlete.lastName}
          </h1>
          <p className="mt-1 text-slate-600">
            Training progress shared by Coach {athlete.coach.name}
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{athlete.sport}</Badge>
              {athlete.position ? (
                <Badge variant="outline">{athlete.position}</Badge>
              ) : null}
            </div>
            <CardDescription className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Born {formatBirthDate(athlete.dateOfBirth)}
            </CardDescription>
          </CardHeader>
        </Card>

        {watchableWorkouts.length > 0 ? (
          <Card className="border-brand/25 bg-gradient-to-br from-white to-brand-light/50">
            <CardHeader>
              <CardTitle className="font-heading flex items-center gap-2 text-xl">
                <PlayCircle className="h-5 w-5 text-brand" />
                Videos to watch
              </CardTitle>
              <CardDescription>
                Your coach added these so {athlete.firstName} can see how to do
                each workout.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {watchableWorkouts.map(({ planTitle, workout }) => (
                <div key={workout.id} className="space-y-2">
                  <div>
                    <p className="font-semibold text-slate-900">{workout.title}</p>
                    <p className="text-sm text-slate-500">{planTitle}</p>
                    {workout.description ? (
                      <p className="mt-1 text-sm text-slate-600">
                        {workout.description}
                      </p>
                    ) : null}
                  </div>
                  {workout.instructionVideoUrl ? (
                    <InstructionVideoPlayer
                      src={familyVideoUrl(workout.instructionVideoUrl, token)}
                      title="Tap play"
                    />
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2 text-xl">
              <ClipboardList className="h-5 w-5" />
              Training plans
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {athlete.trainingPlans.length > 0 ? (
              athlete.trainingPlans.map((plan) => {
                const completed = plan.workouts.filter((w) => w.completed).length;

                return (
                  <div
                    key={plan.id}
                    className="rounded-lg border border-slate-200 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-slate-900">{plan.title}</p>
                      <Badge variant="secondary">
                        {formatPlanStatus(plan.status)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {completed}/{plan.workouts.length} workouts complete
                    </p>
                    {plan.workouts.length > 0 ? (
                      <ul className="mt-3 space-y-3">
                        {plan.workouts.map((workout) => (
                          <li key={workout.id} className="space-y-2 text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={
                                  workout.completed
                                    ? "text-slate-400 line-through"
                                    : "text-slate-700"
                                }
                              >
                                {workout.title}
                                {workout.instructionVideoUrl ? (
                                  <span className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-brand">
                                    <PlayCircle className="size-3.5" />
                                    Has video
                                  </span>
                                ) : null}
                              </span>
                              <span className="shrink-0 text-slate-500">
                                {formatWorkoutDate(workout.scheduledDate)}
                              </span>
                            </div>
                            {workout.instructionVideoUrl ? (
                              <InstructionVideoPlayer
                                src={familyVideoUrl(workout.instructionVideoUrl, token)}
                                title="Watch"
                              />
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-slate-500">
                No active training plans yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2 text-xl">
              <TrendingUp className="h-5 w-5" />
              Progress
            </CardTitle>
            <CardDescription>
              Performance measurements recorded by your coach.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ProgressCharts metrics={serializedMetrics} />

            {athlete.progressMetrics.length > 0 ? (
              <ul className="space-y-2 border-t border-slate-200 pt-4">
                {[...athlete.progressMetrics]
                  .sort(
                    (a, b) =>
                      new Date(b.recordedAt).getTime() -
                      new Date(a.recordedAt).getTime(),
                  )
                  .map((metric) => (
                    <li
                      key={metric.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-slate-700">{metric.label}</span>
                      <span className="font-medium text-primary">
                        {formatMetricValue(metric.value, metric.unit)} ·{" "}
                        {formatMetricDate(metric.recordedAt)}
                      </span>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No metrics recorded yet.</p>
            )}
          </CardContent>
        </Card>

        <p className="pb-8 text-center text-xs text-slate-500">
          Powered by {brand.name}
        </p>
      </main>
    </div>
  );
}
