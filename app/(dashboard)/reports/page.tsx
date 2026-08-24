import Link from "next/link";
import { Download, TrendingUp } from "lucide-react";

import { DashboardShell } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { completionRate } from "@/lib/export";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";

export default async function ReportsPage() {
  const user = await requireUser();

  const athletes = await prisma.athlete.findMany({
    where: { coachId: user.id },
    include: {
      trainingPlans: {
        where: { status: "ACTIVE" },
        include: { workouts: true },
      },
      progressMetrics: {
        orderBy: { recordedAt: "desc" },
        take: 1,
      },
      _count: { select: { progressMetrics: true } },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const totalWorkouts = athletes.reduce(
    (sum, athlete) =>
      sum +
      athlete.trainingPlans.reduce(
        (planSum, plan) => planSum + plan.workouts.length,
        0,
      ),
    0,
  );

  const completedWorkouts = athletes.reduce(
    (sum, athlete) =>
      sum +
      athlete.trainingPlans.reduce(
        (planSum, plan) =>
          planSum + plan.workouts.filter((workout) => workout.completed).length,
        0,
      ),
    0,
  );

  const totalMetrics = athletes.reduce(
    (sum, athlete) => sum + athlete._count.progressMetrics,
    0,
  );

  return (
    <DashboardShell
      title="Reports"
      description="Team-wide progress snapshot and exports."
      action={
        <Button
          variant="outline"
          render={
            <a href="/api/export/team">
              <Download className="h-4 w-4" />
              Export team CSV
            </a>
          }
        />
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Team workout completion</CardDescription>
              <CardTitle className="text-3xl">
                {completionRate(completedWorkouts, totalWorkouts)}%
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-500">
              {completedWorkouts} of {totalWorkouts} workouts complete
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Athletes tracked</CardDescription>
              <CardTitle className="text-3xl">{athletes.length}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-500">
              Across active training plans
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Metrics logged</CardDescription>
              <CardTitle className="text-3xl">{totalMetrics}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-500">
              Performance measurements on record
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Athlete breakdown
            </CardTitle>
            <CardDescription>
              Completion rates and latest activity per athlete.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {athletes.length > 0 ? (
              athletes.map((athlete) => {
                const workouts = athlete.trainingPlans.flatMap(
                  (plan) => plan.workouts,
                );
                const completed = workouts.filter(
                  (workout) => workout.completed,
                ).length;
                const rate = completionRate(completed, workouts.length);
                const latestMetric = athlete.progressMetrics[0];

                return (
                  <div
                    key={athlete.id}
                    className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <Link
                        href={`/athletes/${athlete.id}`}
                        className="font-medium text-slate-900 hover:text-emerald-700"
                      >
                        {athlete.firstName} {athlete.lastName}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{athlete.sport}</Badge>
                        <span className="text-sm text-slate-500">
                          {athlete.trainingPlans.length} active plan
                          {athlete.trainingPlans.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      {latestMetric ? (
                        <p className="mt-2 text-xs text-slate-500">
                          Latest metric: {latestMetric.label} —{" "}
                          {latestMetric.value} {latestMetric.unit}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-2xl font-semibold text-slate-900">
                          {rate}%
                        </p>
                        <p className="text-xs text-slate-500">
                          {completed}/{workouts.length} workouts
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        render={
                          <a href={`/api/export/athlete/${athlete.id}`}>
                            <Download className="h-3.5 w-3.5" />
                            CSV
                          </a>
                        }
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-slate-500">
                Add athletes to see team reports and exports.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
