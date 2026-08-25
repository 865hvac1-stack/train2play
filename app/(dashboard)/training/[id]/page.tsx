import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Film,
  Trash2,
} from "lucide-react";

import {
  deleteTrainingPlanAction,
  removeWorkoutInstructionVideoAction,
  toggleWorkoutCompleteAction,
  updatePlanStatusAction,
} from "@/app/(dashboard)/training/actions";
import { DashboardShell } from "@/components/dashboard-shell";
import { DuplicatePlanForm } from "@/components/duplicate-plan-form";
import { InstructionVideoPlayer } from "@/components/instruction-video-player";
import { AttachWorkoutVideoForm, WorkoutForm } from "@/components/workout-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatPlanStatus, PLAN_STATUSES } from "@/lib/training";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";

function formatDate(date: Date | null) {
  if (!date) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default async function TrainingPlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const plan = await prisma.trainingPlan.findFirst({
    where: { id, coachId: user.id },
    include: {
      athlete: true,
      workouts: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
    },
  });

  if (!plan) {
    notFound();
  }

  const athletes = await prisma.athlete.findMany({
    where: { coachId: user.id },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true },
  });

  const completedCount = plan.workouts.filter((w) => w.completed).length;

  return (
    <DashboardShell
      title={plan.title}
      description={
        plan.athlete
          ? `Assigned to ${plan.athlete.firstName} ${plan.athlete.lastName}`
          : "Team template"
      }
      action={
        <Button variant="outline" render={<Link href="/training">All plans</Link>} />
      }
    >
      <div className="mx-auto grid w-full max-w-5xl min-w-0 gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{formatPlanStatus(plan.status)}</Badge>
                {plan.athlete ? (
                  <Badge variant="outline">
                    {plan.athlete.firstName} {plan.athlete.lastName}
                  </Badge>
                ) : null}
              </div>
              <CardTitle>{plan.title}</CardTitle>
              {plan.description ? (
                <CardDescription>{plan.description}</CardDescription>
              ) : null}
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4 text-sm text-slate-600">
              {plan.startDate ? (
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Start: {formatDate(plan.startDate)}
                </span>
              ) : null}
              {plan.endDate ? (
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  End: {formatDate(plan.endDate)}
                </span>
              ) : null}
              <span>
                Progress: {completedCount}/{plan.workouts.length} workouts
              </span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Workouts</CardTitle>
              <CardDescription>
                Mark complete as athletes finish. Add a video so kids can watch
                how to do the session on the family share link.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {plan.workouts.length > 0 ? (
                plan.workouts.map((workout) => (
                  <div
                    key={workout.id}
                    className="space-y-3 rounded-xl border border-slate-200 bg-white/90 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <form
                        action={toggleWorkoutCompleteAction.bind(
                          null,
                          plan.id,
                          workout.id,
                          !workout.completed,
                        )}
                      >
                        <button
                          type="submit"
                          className="mt-0.5 text-primary transition-colors hover:text-primary/80"
                          aria-label={
                            workout.completed
                              ? "Mark incomplete"
                              : "Mark complete"
                          }
                        >
                          {workout.completed ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : (
                            <Circle className="h-5 w-5 text-slate-300" />
                          )}
                        </button>
                      </form>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p
                            className={
                              workout.completed
                                ? "font-medium text-slate-500 line-through"
                                : "font-medium text-slate-900"
                            }
                          >
                            {workout.title}
                          </p>
                          {workout.instructionVideoUrl ? (
                            <Badge variant="secondary" className="gap-1">
                              <Film className="size-3" />
                              Watch video
                            </Badge>
                          ) : null}
                        </div>
                        {workout.description ? (
                          <p className="text-sm text-slate-600">
                            {workout.description}
                          </p>
                        ) : null}
                        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                          {workout.scheduledDate ? (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {formatDate(workout.scheduledDate)}
                            </span>
                          ) : null}
                          {workout.durationMinutes ? (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {workout.durationMinutes} min
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {workout.instructionVideoUrl ? (
                      <div className="space-y-2 pl-8">
                        <InstructionVideoPlayer
                          src={workout.instructionVideoUrl}
                          title="Video for kids / parents"
                        />
                        <form
                          action={removeWorkoutInstructionVideoAction.bind(
                            null,
                            plan.id,
                            workout.id,
                          )}
                        >
                          <Button type="submit" variant="ghost" size="sm">
                            Remove video
                          </Button>
                        </form>
                      </div>
                    ) : (
                      <div className="pl-8">
                        <AttachWorkoutVideoForm
                          planId={plan.id}
                          workoutId={workout.id}
                        />
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  No workouts yet. Add your first workout using the form.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add workout</CardTitle>
            </CardHeader>
            <CardContent>
              <WorkoutForm planId={plan.id} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Duplicate plan</CardTitle>
              <CardDescription>
                Copy this program to reuse with another athlete.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DuplicatePlanForm
                planId={plan.id}
                athletes={athletes}
                currentAthleteId={plan.athleteId}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Plan status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {PLAN_STATUSES.map((status) => (
                <form
                  key={status}
                  action={updatePlanStatusAction.bind(null, plan.id, status)}
                >
                  <Button
                    type="submit"
                    variant={plan.status === status ? "default" : "outline"}
                    className={
                      plan.status === status
                        ? "w-full "
                        : "w-full"
                    }
                  >
                    {formatPlanStatus(status)}
                  </Button>
                </form>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Danger zone</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={deleteTrainingPlanAction.bind(null, plan.id)}>
                <Button type="submit" variant="destructive" className="w-full">
                  <Trash2 className="h-4 w-4" />
                  Delete plan
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
