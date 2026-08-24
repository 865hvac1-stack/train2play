import Link from "next/link";
import { Calendar, ClipboardList, Plus, Users } from "lucide-react";

import { OnboardingChecklist } from "@/components/onboarding-checklist";
import { DashboardShell } from "@/components/dashboard-shell";
import { AthleteCard } from "@/components/athlete-card";
import { TrainingPlanCard } from "@/components/training-plan-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";

function formatWorkoutDate(date: Date | null) {
  if (!date) return "Unscheduled";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

export default async function DashboardPage() {
  const user = await requireUser();
  const now = new Date();
  const weekFromNow = new Date(now);
  weekFromNow.setDate(weekFromNow.getDate() + 7);

  const [
    athleteCount,
    planCount,
    recentAthletes,
    recentPlans,
    sportsBreakdown,
    upcomingWorkouts,
    metricCount,
    goalCount,
    videoCount,
  ] = await Promise.all([
    prisma.athlete.count({ where: { coachId: user.id } }),
    prisma.trainingPlan.count({
      where: { coachId: user.id, status: "ACTIVE" },
    }),
    prisma.athlete.findMany({
      where: { coachId: user.id },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.trainingPlan.findMany({
      where: { coachId: user.id },
      include: {
        athlete: { select: { firstName: true, lastName: true } },
        workouts: { select: { completed: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 3,
    }),
    prisma.athlete.groupBy({
      by: ["sport"],
      where: { coachId: user.id },
      _count: { sport: true },
      orderBy: { _count: { sport: "desc" } },
      take: 4,
    }),
    prisma.workout.findMany({
      where: {
        completed: false,
        trainingPlan: { coachId: user.id, status: "ACTIVE" },
        OR: [
          { scheduledDate: { gte: now, lte: weekFromNow } },
          { scheduledDate: { lt: now } },
        ],
      },
      include: {
        trainingPlan: {
          select: {
            id: true,
            title: true,
            athlete: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: [{ scheduledDate: "asc" }, { sortOrder: "asc" }],
      take: 5,
    }),
    prisma.progressMetric.count({
      where: { athlete: { coachId: user.id } },
    }),
    prisma.progressGoal.count({
      where: { athlete: { coachId: user.id } },
    }),
    prisma.trainingVideo.count({
      where: { coachId: user.id },
    }),
  ]);

  const onboardingSteps = [
    {
      id: "athlete",
      label: "Add your first athlete",
      href: "/athletes/new",
      done: athleteCount > 0,
    },
    {
      id: "plan",
      label: "Create a training plan",
      href: "/training/new",
      done: planCount > 0,
    },
    {
      id: "metric",
      label: "Log a progress metric",
      href: athleteCount > 0 ? `/athletes/${recentAthletes[0]?.id ?? ""}` : "/athletes/new",
      done: metricCount > 0,
    },
    {
      id: "goal",
      label: "Set a performance goal",
      href: athleteCount > 0 ? `/athletes/${recentAthletes[0]?.id ?? ""}` : "/athletes/new",
      done: goalCount > 0,
    },
    {
      id: "video",
      label: "Add a coaching video",
      href: "/videos/new",
      done: videoCount > 0,
    },
  ];

  return (
    <DashboardShell
      title={`Welcome back${user.name ? `, ${user.name.split(" ")[0]}` : ""}`}
      description="Here's an overview of your athletes and training plans."
      action={
        <Button
          className="bg-emerald-600 hover:bg-emerald-700"
          render={
            <Link href="/athletes/new">
              <Plus className="h-4 w-4" />
              Add athlete
            </Link>
          }
        />
      }
    >
      <div className="space-y-6">
        <OnboardingChecklist steps={onboardingSteps} />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total athletes</CardDescription>
              <CardTitle className="text-3xl">{athleteCount}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Users className="h-4 w-4" />
                On your roster
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active plans</CardDescription>
              <CardTitle className="text-3xl">{planCount}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <ClipboardList className="h-4 w-4" />
                Training programs in progress
              </div>
            </CardContent>
          </Card>

          <Card className="sm:col-span-2 lg:col-span-1">
            <CardHeader className="pb-2">
              <CardDescription>Sports covered</CardDescription>
              <CardTitle className="text-3xl">{sportsBreakdown.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">
                {sportsBreakdown.length > 0
                  ? sportsBreakdown.map((s) => s.sport).join(", ")
                  : "Add athletes to see sport breakdown"}
              </p>
            </CardContent>
          </Card>
        </div>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Upcoming workouts
            </h2>
            <Link
              href="/training"
              className="text-sm font-medium text-emerald-700 hover:underline"
            >
              All plans
            </Link>
          </div>

          {upcomingWorkouts.length > 0 ? (
            <div className="space-y-3">
              {upcomingWorkouts.map((workout) => (
                <Link
                  key={workout.id}
                  href={`/training/${workout.trainingPlan.id}`}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50"
                >
                  <div>
                    <p className="font-medium text-slate-900">{workout.title}</p>
                    <p className="text-sm text-slate-500">
                      {workout.trainingPlan.title}
                      {workout.trainingPlan.athlete
                        ? ` · ${workout.trainingPlan.athlete.firstName} ${workout.trainingPlan.athlete.lastName}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Calendar className="h-4 w-4" />
                    {formatWorkoutDate(workout.scheduledDate)}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-6 text-sm text-slate-500">
                No upcoming workouts this week. Add workouts to your active
                training plans to see them here.
              </CardContent>
            </Card>
          )}
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Recent training plans
            </h2>
            <Link
              href="/training"
              className="text-sm font-medium text-emerald-700 hover:underline"
            >
              View all
            </Link>
          </div>

          {recentPlans.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {recentPlans.map((plan) => (
                <TrainingPlanCard key={plan.id} plan={plan} />
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle>Create a training plan</CardTitle>
                <CardDescription>
                  Schedule workouts and track completion for your athletes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  render={
                    <Link href="/training/new">
                      <Plus className="h-4 w-4" />
                      New plan
                    </Link>
                  }
                />
              </CardContent>
            </Card>
          )}
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Recent athletes
            </h2>
            <Link
              href="/athletes"
              className="text-sm font-medium text-emerald-700 hover:underline"
            >
              View all
            </Link>
          </div>

          {recentAthletes.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {recentAthletes.map((athlete) => (
                <AthleteCard key={athlete.id} athlete={athlete} />
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle>Add your first athlete</CardTitle>
                <CardDescription>
                  Your dashboard will show roster stats once you start adding
                  athletes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  render={
                    <Link href="/athletes/new">
                      <Plus className="h-4 w-4" />
                      Add athlete
                    </Link>
                  }
                />
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
