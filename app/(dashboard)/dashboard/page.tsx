import Link from "next/link";
import {
  AlertTriangle,
  Calendar,
  ClipboardList,
  Plus,
  Users,
  Video,
} from "lucide-react";

import { OnboardingChecklist } from "@/components/onboarding-checklist";
import { DashboardShell } from "@/components/dashboard-shell";
import { AthleteCard } from "@/components/athlete-card";
import { CoachConnectionRequests } from "@/components/coach-connection-requests";
import { NotificationFeed } from "@/components/notification-feed";
import { SuggestedDrills } from "@/components/suggested-drills";
import { TrainingPlanCard } from "@/components/training-plan-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CONNECTION_STATUS } from "@/lib/coach-connections";
import { getRosterAthletesForCoach } from "@/lib/player-profile-server";
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
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const [
    rosterAthletes,
    planCount,
    recentPlans,
    upcomingWorkouts,
    metricCount,
    goalCount,
    videoCount,
    overdueWorkouts,
    pendingConnections,
    coachProfile,
  ] = await Promise.all([
    getRosterAthletesForCoach(user.id),
    prisma.trainingPlan.count({
      where: { coachId: user.id, status: "ACTIVE" },
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
      where: {
        OR: [
          { athlete: { coachId: user.id } },
          {
            athlete: {
              athleteProfile: {
                coachConnections: {
                  some: {
                    coachUserId: user.id,
                    status: CONNECTION_STATUS.APPROVED,
                  },
                },
              },
            },
          },
        ],
      },
    }),
    prisma.progressGoal.count({
      where: {
        OR: [
          { athlete: { coachId: user.id } },
          {
            athlete: {
              athleteProfile: {
                coachConnections: {
                  some: {
                    coachUserId: user.id,
                    status: CONNECTION_STATUS.APPROVED,
                  },
                },
              },
            },
          },
        ],
      },
    }),
    prisma.trainingVideo.count({
      where: { coachId: user.id },
    }),
    prisma.workout.count({
      where: {
        completed: false,
        scheduledDate: { lt: now },
        trainingPlan: { coachId: user.id, status: "ACTIVE" },
      },
    }),
    prisma.coachAthleteConnection.findMany({
      where: {
        coachUserId: user.id,
        status: CONNECTION_STATUS.PENDING,
      },
      include: {
        athleteProfile: {
          select: {
            firstName: true,
            lastName: true,
            primarySport: true,
            sports: { where: { isPrimary: true }, take: 1 },
          },
        },
      },
      orderBy: { requestedAt: "desc" },
      take: 20,
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { lookingForSport: true },
    }),
  ]);

  const athleteCount = rosterAthletes.length;
  const recentAthletes = rosterAthletes.slice(0, 3);
  const sportsBreakdownMap = new Map<string, number>();
  for (const a of rosterAthletes) {
    sportsBreakdownMap.set(a.sport, (sportsBreakdownMap.get(a.sport) ?? 0) + 1);
  }
  const sportsBreakdown = Array.from(sportsBreakdownMap.entries())
    .map(([sport, count]) => ({ sport, _count: { sport: count } }))
    .sort((a, b) => b._count.sport - a._count.sport)
    .slice(0, 4);
  const athletesNeedingMetrics = rosterAthletes.filter(
    (a) => !a.lastActivityAt || a.lastActivityAt < fourteenDaysAgo,
  ).length;

  const attentionItems: { label: string; href: string }[] = [];
  if (overdueWorkouts > 0) {
    attentionItems.push({
      label: `${overdueWorkouts} overdue workout${overdueWorkouts === 1 ? "" : "s"}`,
      href: "/training",
    });
  }
  if (athletesNeedingMetrics > 0) {
    attentionItems.push({
      label: `${athletesNeedingMetrics} athlete${athletesNeedingMetrics === 1 ? "" : "s"} need a recent metric`,
      href: "/athletes",
    });
  }
  if (videoCount === 0 && athleteCount > 0) {
    attentionItems.push({
      label: "Upload your first coaching video",
      href: "/videos/new",
    });
  }

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

  const coachSport =
    coachProfile?.lookingForSport || sportsBreakdown[0]?.sport || "Baseball";

  return (
    <DashboardShell
      title={`Welcome back${user.name ? `, ${user.name.split(" ")[0]}` : ""}`}
      description="Your athletes, sessions, and what needs attention today."
      action={
        <Button
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

        <NotificationFeed userId={user.id} variant="coach" />

        <CoachConnectionRequests
          requests={pendingConnections.map((c) => ({
            id: c.id,
            firstName: c.athleteProfile.firstName,
            lastName: c.athleteProfile.lastName,
            sport:
              c.athleteProfile.sports[0]?.sport ??
              c.athleteProfile.primarySport,
            requestedAt: c.requestedAt,
          }))}
        />

        {attentionItems.length > 0 ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-700" />
              <h2 className="font-heading text-lg font-bold text-amber-950">
                Needs attention
              </h2>
            </div>
            <ul className="space-y-2">
              {attentionItems.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-sm font-medium text-amber-950 underline-offset-2 hover:underline"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/athletes"
            className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            <Card className="h-full border-brand/15 bg-white/90 shadow-sm transition-all group-hover:-translate-y-0.5 group-hover:border-brand/35 group-hover:shadow-md">
              <CardHeader className="pb-2">
                <CardDescription>Athletes</CardDescription>
                <CardTitle className="font-heading text-3xl">
                  {athleteCount}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Users className="h-4 w-4 text-brand" />
                  On your roster
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link
            href="/training"
            className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            <Card className="h-full border-brand/15 bg-white/90 shadow-sm transition-all group-hover:-translate-y-0.5 group-hover:border-brand/35 group-hover:shadow-md">
              <CardHeader className="pb-2">
                <CardDescription>Active plans</CardDescription>
                <CardTitle className="font-heading text-3xl">{planCount}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <ClipboardList className="h-4 w-4 text-brand" />
                  In progress
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link
            href="/videos"
            className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            <Card className="h-full border-brand/15 bg-white/90 shadow-sm transition-all group-hover:-translate-y-0.5 group-hover:border-brand/35 group-hover:shadow-md">
              <CardHeader className="pb-2">
                <CardDescription>Videos</CardDescription>
                <CardTitle className="font-heading text-3xl">{videoCount}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Video className="h-4 w-4 text-brand" />
                  Film on file
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link
            href="/athletes"
            className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            <Card className="h-full border-brand/15 bg-white/90 shadow-sm transition-all group-hover:-translate-y-0.5 group-hover:border-brand/35 group-hover:shadow-md">
              <CardHeader className="pb-2">
                <CardDescription>Sports</CardDescription>
                <CardTitle className="font-heading text-3xl">
                  {sportsBreakdown.length}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="truncate text-sm text-slate-500">
                  {sportsBreakdown.length > 0
                    ? sportsBreakdown.map((s) => s.sport).join(", ")
                    : "Add athletes to begin"}
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-heading text-xl font-bold text-slate-900">
                Upcoming workouts
              </h2>
              <Link
                href="/training"
                className="text-sm font-medium text-primary hover:underline"
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
                    className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white/90 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-md"
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
                      <Calendar className="h-4 w-4 text-brand" />
                      {formatWorkoutDate(workout.scheduledDate)}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <Card className="border-dashed bg-white/70">
                <CardContent className="py-6 text-sm text-slate-500">
                  No upcoming workouts this week. Add workouts to your active
                  training plans to see them here.
                </CardContent>
              </Card>
            )}
          </section>

          <SuggestedDrills sport={coachSport} compact />
        </div>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-xl font-bold text-slate-900">
              Recent training plans
            </h2>
            <Link
              href="/training"
              className="text-sm font-medium text-primary hover:underline"
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
            <Card className="border-dashed bg-white/70">
              <CardHeader>
                <CardTitle className="font-heading">Create a training plan</CardTitle>
                <CardDescription>
                  Schedule workouts and track completion for your athletes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
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
            <h2 className="font-heading text-xl font-bold text-slate-900">
              Recent athletes
            </h2>
            <Link
              href="/athletes"
              className="text-sm font-medium text-primary hover:underline"
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
            <Card className="border-dashed bg-white/70">
              <CardHeader>
                <CardTitle className="font-heading">Add your first athlete</CardTitle>
                <CardDescription>
                  Your dashboard will show roster stats once you start adding
                  athletes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
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
